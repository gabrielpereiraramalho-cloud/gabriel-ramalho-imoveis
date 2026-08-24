"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site";
import { syncOrulo } from "@/lib/orulo/sync";
import { checkEligibility } from "@/lib/orulo/eligibility";
import {
  clearPublicationLinks,
  setPublicationLinks,
} from "@/lib/orulo/publication";

export type PublishResult = { ok: boolean; error?: string };

/** Dispara a sincronização manual da Órulo (resultado gravado em sync_runs). */
export async function runOruloSync(): Promise<void> {
  await syncOrulo();
  revalidatePath("/admin/orulo");
}

/**
 * Publica UM empreendimento (nunca em massa). Fluxo: valida elegibilidade →
 * envia publication_links à Órulo (obrigatório; se falhar, NÃO publica) →
 * marca published=true. Mantém estado consistente.
 */
export async function publishBuilding(
  externalId: string,
): Promise<PublishResult> {
  const supabase = await createClient();
  const { data: b } = await supabase
    .from("orulo_buildings")
    .select(
      "external_id, slug, name, city, neighborhood, min_price, status, cover_image_id, images",
    )
    .eq("external_id", externalId)
    .maybeSingle();

  if (!b) return { ok: false, error: "Empreendimento não encontrado." };
  if (!b.slug) return { ok: false, error: "Sem slug — re-sincronize antes." };

  const elig = checkEligibility(b);
  if (!elig.eligible) {
    return { ok: false, error: `Inelegível: ${elig.reasons.join(", ")}.` };
  }

  const publicUrl = `${siteUrl}/empreendimento/${b.slug}`;

  try {
    await setPublicationLinks(externalId, [publicUrl]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "erro";
    return {
      ok: false,
      error: `Falha ao enviar publication_links à Órulo (${msg}). Publicação NÃO concluída.`,
    };
  }

  const { error } = await supabase
    .from("orulo_buildings")
    .update({ published: true, published_at: new Date().toISOString() })
    .eq("external_id", externalId);
  if (error) {
    return { ok: false, error: `Erro ao publicar: ${error.message}.` };
  }

  revalidatePath("/admin/orulo");
  revalidatePath("/empreendimentos");
  revalidatePath(`/empreendimento/${b.slug}`);
  return { ok: true };
}

/**
 * Despublica UM empreendimento. Limpa publication_links na Órulo primeiro; se
 * falhar, mantém o estado (não despublica) para não ficar inconsistente.
 */
export async function unpublishBuilding(
  externalId: string,
): Promise<PublishResult> {
  const supabase = await createClient();
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
    };
  }

  const { error } = await supabase
    .from("orulo_buildings")
    .update({ published: false, published_at: null })
    .eq("external_id", externalId);
  if (error) {
    return { ok: false, error: `Erro ao despublicar: ${error.message}.` };
  }

  revalidatePath("/admin/orulo");
  revalidatePath("/empreendimentos");
  if (b.slug) revalidatePath(`/empreendimento/${b.slug}`);
  return { ok: true };
}
