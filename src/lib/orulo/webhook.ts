import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { OruloError } from "./config";
import { clearPublicationLinks } from "./publication";
import { upsertBuildingById } from "./sync";
import { isForOurIntegration, type OruloWebhookEvent } from "./webhook-parse";

/**
 * Webhook da Órulo — processamento idempotente dos eventos BUILDING_UPDATE.
 * (Validação/parsing puros ficam em ./webhook-parse; aqui está apenas o IO.)
 *
 * A Órulo NÃO documenta assinatura/HMAC do webhook. A autenticidade é feita por
 * um segredo compartilhado embutido na URL pública (ORULO_WEBHOOK_SECRET), que
 * informamos ao time de integrações da Órulo. Defesa extra: eventos de
 * distribuição são roteados por client_id (== ORULO_CLIENT_ID) em
 * isForOurIntegration.
 */

type Db = SupabaseClient<Database>;

export type WebhookOutcome = {
  outcome: "processed" | "ignored" | "noop" | "error";
  detail: string;
};

/**
 * active / added_to_distribution → (re)sincroniza o empreendimento (criar ou
 * atualizar por external_id, sem duplicar). NUNCA publica automaticamente: o
 * estado de publicação é preservado (mantém a estratégia atual e os 40 de SP
 * despublicados). Ao reaparecer, limpa a marcação de removido.
 */
async function handleUpsert(
  supabase: Db,
  event: OruloWebhookEvent,
): Promise<WebhookOutcome> {
  const { existedBefore } = await upsertBuildingById(supabase, event.buildingId);
  const { error } = await supabase
    .from("orulo_buildings")
    .update({
      removed_at: null,
      last_event_at: new Date().toISOString(),
      last_event_status: event.status,
    })
    .eq("external_id", event.buildingId);
  if (error) {
    throw new OruloError(
      `Erro ao atualizar marcações do building ${event.buildingId}.`,
    );
  }
  return {
    outcome: "processed",
    detail: existedBefore ? "atualizado" : "criado",
  };
}

/**
 * removed / excluded_from_distribution → SOFT DELETE: despublica no nosso site,
 * limpa publication_links na Órulo (quando havia publicação) e marca removed_at.
 * NUNCA apaga o registro (preserva histórico). Idempotente: repetir mantém o
 * mesmo estado e preserva o primeiro carimbo de removed_at.
 */
async function handleRemoval(
  supabase: Db,
  event: OruloWebhookEvent,
): Promise<WebhookOutcome> {
  const { data: b } = await supabase
    .from("orulo_buildings")
    .select("external_id, published, removed_at")
    .eq("external_id", event.buildingId)
    .maybeSingle();

  if (!b) {
    // Nada local para remover → no-op idempotente (ainda registrado no log).
    return { outcome: "noop", detail: "inexistente localmente" };
  }

  // Só limpamos publication_links quando houve publicação (foi quando os
  // enviamos). Best-effort: falha aqui não impede a despublicação local.
  let linksNote = "";
  if (b.published) {
    try {
      await clearPublicationLinks(event.buildingId);
    } catch (err) {
      linksNote = ` (falha publication_links: ${
        err instanceof Error ? err.message : "erro"
      })`;
    }
  }

  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from("orulo_buildings")
    .update({
      published: false,
      published_at: null,
      removed_at: b.removed_at ?? nowIso,
      last_event_at: nowIso,
      last_event_status: event.status,
    })
    .eq("external_id", event.buildingId);
  if (error) {
    throw new OruloError(`Erro ao despublicar building ${event.buildingId}.`);
  }

  return {
    outcome: "processed",
    detail: `soft-removido/despublicado${linksNote}`,
  };
}

/** Roteia o evento já validado para o tratamento idempotente correspondente. */
export async function processWebhookEvent(
  supabase: Db,
  event: OruloWebhookEvent,
): Promise<WebhookOutcome> {
  if (!isForOurIntegration(event)) {
    return { outcome: "ignored", detail: "client_id de outra integração" };
  }
  switch (event.status) {
    case "active":
    case "added_to_distribution":
      return handleUpsert(supabase, event);
    case "removed":
    case "excluded_from_distribution":
      return handleRemoval(supabase, event);
  }
}

/** Registra o evento no log durável (best-effort; nunca derruba o webhook). */
export async function logWebhookEvent(
  supabase: Db,
  entry: {
    eventName: string | null;
    buildingId: string | null;
    status: string | null;
    clientId: string | null;
    outcome: string;
    detail: string | null;
  },
): Promise<void> {
  try {
    await supabase.from("orulo_webhook_events").insert({
      event_name: entry.eventName,
      building_id: entry.buildingId,
      status: entry.status,
      client_id: entry.clientId,
      outcome: entry.outcome,
      detail: entry.detail,
    });
  } catch {
    // Log é secundário; ignore falhas para não afetar a resposta ao webhook.
  }
}
