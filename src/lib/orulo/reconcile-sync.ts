import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { OruloError, isOruloConfigured } from "./config";
import { oruloGet } from "./client";
import { clearPublicationLinks } from "./publication";
import { parseOruloDate, upsertBuildingById } from "./sync";

/**
 * Reconciliação INCREMENTAL e SEGURA (motor do botão "Sincronizar agora").
 *
 * `/api/v2/buildings/ids/active` é a fonte autoritativa da DISTRIBUIÇÃO. A cada
 * lote:
 *   1) busca todas as páginas de IDs ativos (barato: 1 GET, com backoff/429);
 *   2) reconcilia a distribuição SEM chamar detalhe (só UPDATE no banco):
 *        • ativos → in_distribution=true (e limpa removed_at se reaparecerem);
 *        • em distribuição no banco mas ausentes de /ids/active → despublica +
 *          in_distribution=false (semântica de "excluded", NUNCA removed_at);
 *   3) busca DETALHE (/buildings/{id} + imagens + plantas) SOMENTE de IDs novos,
 *      efetivamente alterados (updated_at da Órulo > external_updated_at salvo)
 *      ou incompletos (sem slug/nome), em pequenos lotes sequenciais com
 *      backoff/Retry-After. Não refaz detalhe de quem não mudou.
 *
 * Idempotente e RETOMÁVEL sem estado persistente: ao sincronizar um item, seu
 * external_updated_at passa a bater com o da Órulo, então ele deixa de contar
 * como "alterado" na próxima chamada. Uma falha individual é registrada e NÃO
 * aborta o lote. NUNCA marca removed_at por ausência em /ids/active, e NUNCA
 * tenta "restaurar" empreendimentos que a Órulo excluiu.
 */
type Db = SupabaseClient<Database>;

const BASE_DELAY_MS = 350; // espaçamento entre empreendimentos (~3 req/s)
// Cada empreendimento faz ~3 GETs (detalhe + imagens + plantas) e a latência à
// Órulo pode chegar a ~5s por empreendimento. Com o teto de ~10s por invocação
// (Vercel Hobby), mantemos o lote em 2 para caber com folga; o excedente rola
// para o próximo lote (idempotente/retomável). Não refaz detalhe de quem não mudou.
const DEFAULT_DETAIL_BATCH = 2; // detalhes por chamada
const MAX_DETAIL_BATCH = 10;
const RETRY = { retryOn429: true as const };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type SyncBatchResult = {
  found: number; // total de IDs ativos em /ids/active
  created: number; // novos sincronizados neste lote
  updated: number; // alterados/incompletos sincronizados neste lote
  unchanged: number; // ativos que não precisaram de detalhe (sem mudança)
  failed: number; // falhas de detalhe neste lote
  remaining: number; // ainda pendentes de detalhe após este lote
  distributionSet: number; // marcados in_distribution=true (reativados)
  distributionCleared: number; // marcados in_distribution=false (saíram)
  failures: { id: string; error: string }[];
  error?: string; // erro de nível de lote (ex.: não configurado/não autorizado)
};

type ActiveEntry = { id: string; updatedAt: string | null };

/** Parser tolerante do updated_at de /ids/active (ISO ou dd/MM/yyyy[ HH:mm:ss]). */
function parseActiveDate(v: unknown): string | null {
  if (typeof v !== "string" || v.trim() === "") return null;
  const iso = parseOruloDate(v); // "dd/MM/yyyy HH:mm:ss"
  if (iso) return iso;
  const md = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); // "dd/MM/yyyy"
  if (md) {
    const [, d, mo, y] = md;
    const dt = new Date(`${y}-${mo}-${d}T00:00:00`);
    return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
  }
  const t = Date.parse(v); // ISO / RFC
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

/** Lista TODAS as páginas de /ids/active com {id, updated_at}. */
async function fetchActiveEntries(): Promise<ActiveEntry[]> {
  const out: ActiveEntry[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const data = await oruloGet<{
      buildings?: { id: string | number; updated_at?: string }[];
      total_pages?: number;
    }>(
      `/api/v2/buildings/ids/active?page=${page}&results_per_page=500`,
      RETRY,
    );
    for (const b of data.buildings ?? []) {
      out.push({ id: String(b.id), updatedAt: parseActiveDate(b.updated_at) });
    }
    totalPages =
      typeof data.total_pages === "number" && data.total_pages > 0
        ? data.total_pages
        : page;
    page += 1;
    if (page <= totalPages) await sleep(BASE_DELAY_MS);
  } while (page <= totalPages);
  return out;
}

type DbRow = {
  external_id: string;
  external_updated_at: string | null;
  in_distribution: boolean;
  removed_at: string | null;
  published: boolean;
  slug: string | null;
  name: string | null;
};

async function loadDbRows(supabase: Db): Promise<DbRow[]> {
  const rows: DbRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("orulo_buildings")
      .select(
        "external_id, external_updated_at, in_distribution, removed_at, published, slug, name",
      )
      .range(from, from + 999);
    if (error) throw new OruloError(`Erro ao ler orulo_buildings: ${error.message}`);
    rows.push(...((data ?? []) as DbRow[]));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

/** Precisa (re)buscar o detalhe? novo, alterado ou incompleto. */
function needsDetail(entry: ActiveEntry, row: DbRow | undefined): boolean {
  if (!row) return true; // novo
  if (!row.slug || !row.name) return true; // incompleto
  if (entry.updatedAt) {
    const stored = row.external_updated_at
      ? Date.parse(row.external_updated_at)
      : NaN;
    const remote = Date.parse(entry.updatedAt);
    if (Number.isNaN(stored) || remote > stored) return true; // alterado
  }
  return false;
}

export async function syncActiveBatch(
  supabase: Db,
  detailBatch = DEFAULT_DETAIL_BATCH,
): Promise<SyncBatchResult> {
  const result: SyncBatchResult = {
    found: 0,
    created: 0,
    updated: 0,
    unchanged: 0,
    failed: 0,
    remaining: 0,
    distributionSet: 0,
    distributionCleared: 0,
    failures: [],
  };

  if (!isOruloConfigured()) {
    return { ...result, error: "Órulo não configurado." };
  }

  const batch = Math.min(Math.max(1, Math.trunc(detailBatch)), MAX_DETAIL_BATCH);

  // 1) Conjunto ativo (verdade da distribuição).
  const entries = await fetchActiveEntries();
  const activeIds = entries.map((e) => e.id);
  const activeSet = new Set(activeIds);
  result.found = activeIds.length;

  // 2) Estado atual.
  const rows = await loadDbRows(supabase);
  const dbById = new Map(rows.map((r) => [r.external_id, r]));
  const nowIso = new Date().toISOString();

  // 2a) Reativar: ativos que estão fora da distribuição ou marcados removidos.
  const toReactivate = rows.filter(
    (r) => activeSet.has(r.external_id) && (!r.in_distribution || r.removed_at),
  );
  if (toReactivate.length > 0) {
    const ids = toReactivate.map((r) => r.external_id);
    const { error } = await supabase
      .from("orulo_buildings")
      .update({
        in_distribution: true,
        removed_at: null,
        last_event_at: nowIso,
        last_event_status: "reconcile-active",
      })
      .in("external_id", ids);
    if (error) {
      result.failures.push({ id: "distribuição", error: `reativar: ${error.message}` });
    } else {
      result.distributionSet = ids.length;
    }
  }

  // 2b) Saíram: em distribuição e não removidos, mas ausentes de /ids/active →
  //     in_distribution=false (excluded). Se publicado, despublica e limpa
  //     publication_links (best-effort, com backoff). NUNCA marca removed_at.
  //     Normalmente vazio (o webhook mantém isto em tempo real).
  const gone = rows.filter(
    (r) => r.in_distribution && !r.removed_at && !activeSet.has(r.external_id),
  );
  for (const r of gone) {
    if (r.published) {
      try {
        await clearPublicationLinks(r.external_id);
      } catch {
        // best-effort: não impede a saída local da distribuição
      }
    }
    const { error } = await supabase
      .from("orulo_buildings")
      .update({
        in_distribution: false,
        published: false,
        published_at: null,
        last_event_at: new Date().toISOString(),
        last_event_status: "reconcile-excluded",
      })
      .eq("external_id", r.external_id);
    if (error) {
      result.failures.push({
        id: r.external_id,
        error: `saiu-distribuição: ${error.message}`,
      });
    } else {
      result.distributionCleared += 1;
    }
    await sleep(BASE_DELAY_MS);
  }

  // 3) Detalhe apenas de novos/alterados/incompletos, ordenado (determinístico).
  const toFetch = entries
    .filter((e) => needsDetail(e, dbById.get(e.id)))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  result.unchanged = activeIds.length - toFetch.length;

  const existingIds = new Set(rows.map((r) => r.external_id));
  const slice = toFetch.slice(0, batch);
  for (const e of slice) {
    const existedBefore = existingIds.has(e.id);
    try {
      await upsertBuildingById(supabase, e.id, existingIds, RETRY);
      // Ativo ⇒ garante distribuição e limpa qualquer marcação de removido.
      await supabase
        .from("orulo_buildings")
        .update({
          in_distribution: true,
          removed_at: null,
          last_event_at: new Date().toISOString(),
          last_event_status: "reconcile-active",
        })
        .eq("external_id", e.id);
      if (existedBefore) result.updated += 1;
      else result.created += 1;
    } catch (err) {
      result.failed += 1;
      result.failures.push({
        id: e.id,
        error: err instanceof Error ? err.message : "erro",
      });
    }
    await sleep(BASE_DELAY_MS);
  }

  // Pendentes após este lote = toFetch menos os que foram efetivamente
  // sincronizados (falhas continuam pendentes; o cliente evita loop parando
  // quando não há progresso).
  const succeeded = result.created + result.updated;
  result.remaining = Math.max(0, toFetch.length - succeeded);
  return result;
}
