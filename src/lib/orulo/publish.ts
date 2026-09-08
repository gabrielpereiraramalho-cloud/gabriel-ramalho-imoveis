import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { siteUrl } from "@/lib/site";
import { canAutoPublish } from "./eligibility";
import { clearPublicationLinks, setPublicationLinks } from "./publication";

/**
 * Núcleo COMPARTILHADO de publicação/despublicação de empreendimentos Órulo,
 * reutilizado pela ação manual do admin e (futuramente) pelos fluxos
 * automáticos. Regra invariável e segura:
 *
 *   publicar → valida gate (elegível + em distribuição + não removido)
 *            → envia publication_links à Órulo (OBRIGATÓRIO)
 *            → só então marca published=true.
 *   Se os publication_links falharem, NÃO publica localmente.
 *
 * Recebe o cliente Supabase (SSR do admin ou service role do webhook), não
 * revalida caches (isso fica no chamador Next).
 */
type Db = SupabaseClient<Database>;

export type PublishResult = { ok: boolean; error?: string; slug?: string | null };

const PUBLISH_COLS =
  "external_id, slug, name, city, neighborhood, min_price, status, cover_image_id, images, published, removed_at, in_distribution";

export async function publishBuildingCore(
  supabase: Db,
  externalId: string,
): Promise<PublishResult> {
  const { data: b } = await supabase
    .from("orulo_buildings")
    .select(PUBLISH_COLS)
    .eq("external_id", externalId)
    .maybeSingle();

  if (!b) return { ok: false, error: "Empreendimento não encontrado." };
  if (!b.slug) return { ok: false, error: "Sem slug — re-sincronize antes." };

  const gate = canAutoPublish(b);
  if (!gate.eligible) {
    return { ok: false, error: `Não publicável: ${gate.reasons.join(", ")}.`, slug: b.slug };
  }

  const publicUrl = `${siteUrl}/empreendimento/${b.slug}`;
  try {
    await setPublicationLinks(externalId, [publicUrl]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "erro";
    return {
      ok: false,
      error: `Falha ao enviar publication_links à Órulo (${msg}). Publicação NÃO concluída.`,
      slug: b.slug,
    };
  }

  const { error } = await supabase
    .from("orulo_buildings")
    .update({ published: true, published_at: new Date().toISOString() })
    .eq("external_id", externalId);
  if (error) return { ok: false, error: `Erro ao publicar: ${error.message}.`, slug: b.slug };

  return { ok: true, slug: b.slug };
}

export async function unpublishBuildingCore(
  supabase: Db,
  externalId: string,
): Promise<PublishResult> {
  const { data: b } = await supabase
    .from("orulo_buildings")
    .select("external_id, slug")
    .eq("external_id", externalId)
    .maybeSingle();
  if (!b) return { ok: false, error: "Empreendimento não encontrado." };

  try {
    await clearPublicationLinks(externalId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "erro";
    return {
      ok: false,
      error: `Falha ao atualizar publication_links na Órulo (${msg}). Estado mantido.`,
      slug: b.slug,
    };
  }

  const { error } = await supabase
    .from("orulo_buildings")
    .update({ published: false, published_at: null })
    .eq("external_id", externalId);
  if (error) return { ok: false, error: `Erro ao despublicar: ${error.message}.`, slug: b.slug };

  return { ok: true, slug: b.slug };
}
