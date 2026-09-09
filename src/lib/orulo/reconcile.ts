import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, TablesUpdate } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOruloAutoPublishEnabled, OruloError } from "./config";
import { oruloGet } from "./client";
import { clearPublicationLinks } from "./publication";
import { publishBuildingCore } from "./publish";
import { upsertBuildingById } from "./sync";

/**
 * Reconciliação periódica (fallback de segurança; o webhook é o canal
 * principal). Compara `/ids/active` e `/ids/removed` da Órulo com
 * `orulo_buildings` e corrige divergências:
 *  - ativo ainda não conhecido/na distribuição → upsert + in_distribution=true;
 *    se ORULO_AUTO_PUBLISH e elegível, publica pelo fluxo seguro;
 *  - em distribuição no banco mas fora de `/ids/active` → despublica +
 *    in_distribution=false (saiu da distribuição);
 *  - em `/ids/removed` → despublica + in_distribution=false + removed_at.
 *
 * Sequencial, com espaçamento e backoff em 429; nunca usa Promise.all em massa;
 * limita operações por execução (o restante rola para a próxima). Preserva
 * in_distribution/removed_at/published/publication_links. Idempotente e
 * protegido por lock em `orulo_sync_runs` (sem migration/nova tabela).
 */
type Db = SupabaseClient<Database>;

const BASE_DELAY_MS = 300; // espaçamento entre chamadas à Órulo
const MAX_429_RETRIES = 3; // 2s, 4s, 8s
const MAX_UPSERTS = 30; // teto de novos/reativados por execução
const MAX_REMOVALS = 30; // teto de saídas/removidos por execução
const RUNNING_WINDOW_MS = 20 * 60 * 1000; // lock: run "presa" por até 20min
const DAILY_DEDUPE_MS = 20 * 60 * 60 * 1000; // não repete se sucesso < 20h

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type ReconcileSummary = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  activeCount?: number;
  removedCount?: number;
  newUpserts?: number;
  reactivated?: number;
  leftDistribution?: number;
  removedApplied?: number;
  published?: number;
  unpublished?: number;
  failures?: string[];
  error?: string;
};

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/\b429\b/.test(msg) || attempt >= MAX_429_RETRIES) throw err;
      attempt += 1;
      await sleep(1000 * 2 ** attempt);
    }
  }
}

type IdEntry = { id: string; updated_at?: string };

/** Extrai ids de envelopes tolerantes (buildings | building_ids | ids). */
function extractIds(data: unknown): IdEntry[] {
  const rec = (data ?? {}) as Record<string, unknown>;
  const arr =
    (Array.isArray(rec.buildings) && rec.buildings) ||
    (Array.isArray(rec.building_ids) && rec.building_ids) ||
    (Array.isArray(rec.ids) && rec.ids) ||
    [];
  return (arr as unknown[])
    .map((x) => {
      if (x && typeof x === "object") {
        const o = x as Record<string, unknown>;
        return { id: String(o.id ?? ""), updated_at: o.updated_at as string };
      }
      return { id: String(x) };
    })
    .filter((e) => e.id);
}

/** Lista TODAS as páginas de /ids/active. */
async function fetchActiveIds(): Promise<{ ids: string[]; pages: number }> {
  const ids: string[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const data = await withRetry(() =>
      oruloGet<unknown>(
        `/api/v2/buildings/ids/active?page=${page}&results_per_page=500`,
      ),
    );
    for (const e of extractIds(data)) ids.push(e.id);
    const tp = (data as { total_pages?: number })?.total_pages;
    totalPages = typeof tp === "number" && tp > 0 ? tp : page;
    page += 1;
    if (page <= totalPages) await sleep(BASE_DELAY_MS);
  } while (page <= totalPages);
  return { ids, pages: totalPages };
}

/** /ids/removed (best-effort; formato/param não é crítico para o fallback). */
async function fetchRemovedIds(updatedAfterIso: string): Promise<string[]> {
  try {
    const after = updatedAfterIso.slice(0, 10); // YYYY-MM-DD
    const data = await withRetry(() =>
      oruloGet<unknown>(
        `/api/v2/buildings/ids/removed?updated_after=${encodeURIComponent(after)}`,
      ),
    );
    return extractIds(data).map((e) => e.id);
  } catch {
    return []; // não derruba a reconciliação se o endpoint variar
  }
}

/** Despublica + sai da distribuição (e marca removed_at quando `removed`). */
async function applyRemoval(
  supabase: Db,
  externalId: string,
  markRemoved: boolean,
  wasPublished: boolean,
): Promise<void> {
  if (wasPublished) {
    try {
      await withRetry(() => clearPublicationLinks(externalId));
    } catch {
      // best-effort: não impede a despublicação local
    }
  }
  const nowIso = new Date().toISOString();
  const patch: TablesUpdate<"orulo_buildings"> = {
    published: false,
    published_at: null,
    in_distribution: false,
    last_event_at: nowIso,
    last_event_status: markRemoved ? "reconcile-removed" : "reconcile-excluded",
    ...(markRemoved ? { removed_at: nowIso } : {}),
  };
  const { error } = await supabase
    .from("orulo_buildings")
    .update(patch)
    .eq("external_id", externalId);
  if (error) throw new OruloError(`Erro ao despublicar ${externalId}.`);
}

export async function reconcileOrulo(): Promise<ReconcileSummary> {
  const supabase = createAdminClient();

  // ---- Lock / dedupe diário via orulo_sync_runs ----
  const { data: last } = await supabase
    .from("orulo_sync_runs")
    .select("started_at, finished_at, status")
    .like("status", "reconcile%")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const now = Date.now();
  if (last) {
    const startedMs = last.started_at ? Date.parse(last.started_at) : 0;
    if (!last.finished_at && now - startedMs < RUNNING_WINDOW_MS) {
      return { ok: true, skipped: true, reason: "reconciliação já em execução" };
    }
    if (
      last.finished_at &&
      last.status === "reconcile-success" &&
      now - startedMs < DAILY_DEDUPE_MS
    ) {
      return { ok: true, skipped: true, reason: "já reconciliado nas últimas 20h" };
    }
  }

  const startedAtIso = new Date().toISOString();
  const { data: runRow } = await supabase
    .from("orulo_sync_runs")
    .insert({ started_at: startedAtIso, status: "reconcile-running" })
    .select("id")
    .single();
  const runId = runRow?.id ?? null;

  const summary: ReconcileSummary = {
    ok: false,
    newUpserts: 0,
    reactivated: 0,
    leftDistribution: 0,
    removedApplied: 0,
    published: 0,
    unpublished: 0,
    failures: [],
  };
  const autoPublish = isOruloAutoPublishEnabled();

  try {
    // 1) Conjunto ativo (todas as páginas) + removidos (best-effort).
    const { ids: activeIds } = await fetchActiveIds();
    const activeSet = new Set(activeIds);
    summary.activeCount = activeIds.length;

    const updatedAfter = last?.started_at ?? new Date(now - 7 * 864e5).toISOString();
    const removedIds = await fetchRemovedIds(updatedAfter);
    summary.removedCount = removedIds.length;

    // 2) Estado atual no banco.
    let dbRows: {
      external_id: string;
      in_distribution: boolean;
      removed_at: string | null;
      published: boolean;
    }[] = [];
    for (let from = 0; ; from += 1000) {
      const { data } = await supabase
        .from("orulo_buildings")
        .select("external_id, in_distribution, removed_at, published")
        .range(from, from + 999);
      dbRows = dbRows.concat(data ?? []);
      if (!data || data.length < 1000) break;
    }
    const dbById = new Map(dbRows.map((r) => [r.external_id, r]));

    const publishIfEnabled = async (externalId: string) => {
      if (!autoPublish) return;
      const res = await withRetry(() => publishBuildingCore(supabase, externalId));
      if (res.ok) summary.published! += 1;
      else if (!(res.error ?? "").startsWith("Não publicável")) {
        summary.failures!.push(`publish ${externalId}: ${res.error}`);
      }
    };

    // 3) Ativos NOVOS (não estão no banco) → upsert + entra na distribuição.
    const newIds = activeIds.filter((id) => !dbById.has(id)).slice(0, MAX_UPSERTS);
    for (const id of newIds) {
      try {
        await withRetry(() => upsertBuildingById(supabase, id));
        await supabase
          .from("orulo_buildings")
          .update({
            in_distribution: true,
            removed_at: null,
            last_event_at: new Date().toISOString(),
            last_event_status: "reconcile-active",
          })
          .eq("external_id", id);
        summary.newUpserts! += 1;
        await publishIfEnabled(id);
      } catch (err) {
        summary.failures!.push(
          `upsert ${id}: ${err instanceof Error ? err.message : "erro"}`,
        );
      }
      await sleep(BASE_DELAY_MS);
    }

    // 4) Reativados: no banco, presentes em /ids/active, mas fora da distribuição
    //    ou marcados como removidos → voltam à distribuição.
    const reactivate = dbRows
      .filter(
        (r) => activeSet.has(r.external_id) && (!r.in_distribution || r.removed_at),
      )
      .slice(0, MAX_UPSERTS);
    for (const r of reactivate) {
      const { error } = await supabase
        .from("orulo_buildings")
        .update({
          in_distribution: true,
          removed_at: null,
          last_event_at: new Date().toISOString(),
          last_event_status: "reconcile-active",
        })
        .eq("external_id", r.external_id);
      if (error) {
        summary.failures!.push(`reativar ${r.external_id}: ${error.message}`);
        continue;
      }
      summary.reactivated! += 1;
      try {
        await publishIfEnabled(r.external_id);
      } catch (err) {
        summary.failures!.push(
          `publish ${r.external_id}: ${err instanceof Error ? err.message : "erro"}`,
        );
      }
      await sleep(BASE_DELAY_MS);
    }

    // 5) Saíram da distribuição: no banco em distribuição e não removidos, mas
    //    ausentes de /ids/active → despublica + in_distribution=false.
    const gone = dbRows
      .filter(
        (r) => r.in_distribution && !r.removed_at && !activeSet.has(r.external_id),
      )
      .slice(0, MAX_REMOVALS);
    for (const r of gone) {
      try {
        await applyRemoval(supabase, r.external_id, false, r.published);
        summary.leftDistribution! += 1;
        if (r.published) summary.unpublished! += 1;
      } catch (err) {
        summary.failures!.push(
          `saiu-distribuição ${r.external_id}: ${err instanceof Error ? err.message : "erro"}`,
        );
      }
      await sleep(BASE_DELAY_MS);
    }

    // 6) Removidos (/ids/removed) presentes no banco → soft delete.
    const removedToApply = removedIds
      .filter((id) => dbById.has(id))
      .slice(0, MAX_REMOVALS);
    for (const id of removedToApply) {
      const row = dbById.get(id)!;
      try {
        await applyRemoval(supabase, id, true, row.published);
        summary.removedApplied! += 1;
        if (row.published) summary.unpublished! += 1;
      } catch (err) {
        summary.failures!.push(
          `removido ${id}: ${err instanceof Error ? err.message : "erro"}`,
        );
      }
      await sleep(BASE_DELAY_MS);
    }

    summary.ok = summary.failures!.length === 0;
  } catch (err) {
    summary.error = err instanceof Error ? err.message : "erro desconhecido";
    summary.ok = false;
  }

  // ---- Fecha o run (libera o lock) ----
  if (runId) {
    await supabase
      .from("orulo_sync_runs")
      .update({
        finished_at: new Date().toISOString(),
        status: summary.ok ? "reconcile-success" : "reconcile-error",
        buildings_found: summary.activeCount ?? null,
        created_count: summary.newUpserts ?? null,
        updated_count: summary.reactivated ?? null,
        error_summary:
          summary.error ??
          (summary.failures && summary.failures.length > 0
            ? summary.failures.slice(0, 5).join(" | ").slice(0, 500)
            : null),
      })
      .eq("id", runId);
  }

  return summary;
}
