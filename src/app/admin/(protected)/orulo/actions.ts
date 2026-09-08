"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { isRequestAdmin } from "@/lib/auth/admin";
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

// ---------------------------------------------------------------------------
// Publicação controlada dos empreendimentos JÁ em distribuição (backfill).
// Sequencial, com espaçamento e backoff em 429 — nunca centenas de PUTs juntos.
// Idempotente (só pega published=false; publishBuildingCore pula já publicados)
// e interrompível/reexecutável sem duplicar publication_links.
// ---------------------------------------------------------------------------
export type PublishBatchResult = {
  requested: number;
  published: number;
  skipped: number; // gate falhou (inelegível/fora distr/removido) — não é erro
  failed: number; // erro real (publication_links / banco / 429 esgotado)
  remaining: number; // pendentes ainda após este lote
  failures: { id: string; error: string }[];
  error?: string; // erro de nível de lote (ex.: não autorizado)
};

const BATCH_DELAY_MS = 300; // espaçamento entre publicações (~3 req/s)
const MAX_429_RETRIES = 3; // 2s, 4s, 8s

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function publishOneWithRetry(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
): Promise<PublishResult> {
  let attempt = 0;
  for (;;) {
    const res = await publishBuildingCore(supabase, id);
    if (res.ok) return res;
    const is429 = /\b429\b/.test(res.error ?? "");
    if (!is429 || attempt >= MAX_429_RETRIES) return res;
    attempt += 1;
    await sleep(1000 * 2 ** attempt);
  }
}

/**
 * Publica UM lote de elegíveis em distribuição ainda não publicados. Retorna o
 * progresso; o chamador (UI) repete até `remaining` = 0. `limit` é limitado a
 * um teto seguro para não estourar o timeout da função.
 */
export async function publishEligibleBatch(
  limit = 15,
): Promise<PublishBatchResult> {
  const supabase = await createClient();

  // Server Actions são públicas: exige admin antes de qualquer efeito.
  if (!(await isRequestAdmin(supabase))) {
    return {
      requested: 0,
      published: 0,
      skipped: 0,
      failed: 0,
      remaining: 0,
      failures: [],
      error: "Não autorizado.",
    };
  }

  const safeLimit = Math.min(Math.max(1, Math.trunc(limit)), 25);

  const { data: pending } = await supabase
    .from("orulo_buildings")
    .select("external_id")
    .eq("in_distribution", true)
    .is("removed_at", null)
    .eq("published", false)
    .order("external_id", { ascending: true })
    .limit(safeLimit);

  const ids = (pending ?? []).map((r) => r.external_id);

  let published = 0;
  let skipped = 0;
  let failed = 0;
  const failures: { id: string; error: string }[] = [];

  for (const id of ids) {
    const res = await publishOneWithRetry(supabase, id);
    if (res.ok) {
      published += 1;
    } else if ((res.error ?? "").startsWith("Não publicável")) {
      skipped += 1; // fora da distribuição / removido / inelegível
    } else {
      failed += 1;
      failures.push({ id, error: res.error ?? "erro" });
    }
    await sleep(BATCH_DELAY_MS);
  }

  const { count } = await supabase
    .from("orulo_buildings")
    .select("external_id", { count: "exact", head: true })
    .eq("in_distribution", true)
    .is("removed_at", null)
    .eq("published", false);

  if (published > 0) {
    revalidatePath("/admin/orulo");
    revalidatePath("/empreendimentos");
    revalidatePath("/imoveis");
  }

  return {
    requested: ids.length,
    published,
    skipped,
    failed,
    remaining: count ?? 0,
    failures,
  };
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
