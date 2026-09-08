"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { syncOrulo } from "@/lib/orulo/sync";
import {
  publishBuildingCore,
  unpublishBuildingCore,
  type PublishResult,
} from "@/lib/orulo/publish";

export type { PublishResult };

/** Dispara a sincronização manual da Órulo (resultado gravado em sync_runs). */
export async function runOruloSync(): Promise<void> {
  await syncOrulo();
  revalidatePath("/admin/orulo");
}

function revalidatePublication(slug?: string | null): void {
  revalidatePath("/admin/orulo");
  revalidatePath("/empreendimentos");
  if (slug) revalidatePath(`/empreendimento/${slug}`);
}

/**
 * Publica UM empreendimento (nunca em massa). Usa o núcleo compartilhado, que
 * valida o gate (elegível + em distribuição + não removido) → envia
 * publication_links à Órulo (obrigatório; se falhar, NÃO publica) → marca
 * published=true.
 */
export async function publishBuilding(
  externalId: string,
): Promise<PublishResult> {
  const supabase = await createClient();
  const res = await publishBuildingCore(supabase, externalId);
  if (res.ok) revalidatePublication(res.slug);
  return res;
}

/**
 * Despublica UM empreendimento. Limpa publication_links na Órulo primeiro; se
 * falhar, mantém o estado (não despublica) para não ficar inconsistente.
 */
export async function unpublishBuilding(
  externalId: string,
): Promise<PublishResult> {
  const supabase = await createClient();
  const res = await unpublishBuildingCore(supabase, externalId);
  if (res.ok) revalidatePublication(res.slug);
  return res;
}
