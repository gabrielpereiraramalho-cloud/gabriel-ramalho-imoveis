import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Json, TablesInsert } from "@/types/database";
import { OruloError, isOruloConfigured } from "./config";
import { oruloGet } from "./client";

const RESULTS_PER_PAGE = 500; // máximo permitido pela Órulo

export type OruloSyncSummary = {
  ok: boolean;
  configActive: boolean;
  pagesTraversed: number;
  buildingsFound: number;
  created: number;
  updated: number;
  imagesFetched: number;
  floorPlansFetched: number;
  error?: string;
};

// --- Tipagem tolerante das respostas (contrato documentado; chaves de campo
// --- do building são extraídas defensivamente e o `raw` é sempre preservado).
type ActiveIdsPage = {
  total_pages?: number;
  page?: number;
  building_ids?: number[];
  ids?: number[];
  results?: number[];
};

type UnknownRecord = Record<string, unknown>;

function asRecord(v: unknown): UnknownRecord {
  return v && typeof v === "object" ? (v as UnknownRecord) : {};
}
function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}
function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
    return Number(v);
  }
  return null;
}
function firstStr(obj: UnknownRecord, keys: string[]): string | null {
  for (const k of keys) {
    const s = str(obj[k]);
    if (s !== null) return s;
  }
  return null;
}
function firstNum(obj: UnknownRecord, keys: string[]): number | null {
  for (const k of keys) {
    const n = num(obj[k]);
    if (n !== null) return n;
  }
  return null;
}

/**
 * Extrai campos úteis do JSON do empreendimento. As chaves reais devem ser
 * confirmadas contra a resposta da praça de teste; o `raw` guarda tudo.
 */
function extractBuildingFields(
  externalId: string,
  raw: UnknownRecord,
  images: Json | null,
  floorPlans: Json | null,
): TablesInsert<"orulo_buildings"> {
  const address = asRecord(raw.address);
  return {
    external_id: externalId,
    name: firstStr(raw, ["name", "title"]),
    developer:
      firstStr(raw, ["developer", "developer_name", "builder"]) ??
      firstStr(asRecord(raw.developer), ["name"]),
    city: firstStr(raw, ["city"]) ?? firstStr(address, ["city"]),
    neighborhood:
      firstStr(raw, ["neighborhood", "neighbourhood"]) ??
      firstStr(address, ["neighborhood", "neighbourhood"]),
    address:
      firstStr(raw, ["address_text", "street"]) ??
      firstStr(address, ["street", "address", "formatted"]),
    description: firstStr(raw, ["description"]),
    min_price: firstNum(raw, ["min_price", "minimum_price", "price_from"]),
    bedrooms: firstNum(raw, ["bedrooms", "min_bedrooms"]),
    bathrooms: firstNum(raw, ["bathrooms", "min_bathrooms"]),
    suites: firstNum(raw, ["suites", "min_suites"]),
    parking: firstNum(raw, ["parking", "parking_spots", "min_parking"]),
    private_area: firstNum(raw, ["private_area", "min_private_area", "area"]),
    status: firstStr(raw, ["status", "construction_status"]),
    external_updated_at: firstStr(raw, ["updated_at", "updated"]),
    raw: raw as Json,
    images,
    floor_plans: floorPlans,
  };
}

/** Verifica se a integração está ativa (GET /api/v2/config). Tolerante. */
async function checkConfigActive(): Promise<boolean> {
  const cfg = asRecord(await oruloGet<unknown>("/api/v2/config"));
  const active = cfg.active ?? cfg.enabled ?? cfg.integration_active;
  // Se a chave não existir, não bloqueia (assume ativo); só bloqueia se false.
  return active === false ? false : true;
}

/** Lista TODOS os building IDs ativos, percorrendo todas as páginas. */
async function listActiveBuildingIds(): Promise<{
  ids: string[];
  pagesTraversed: number;
}> {
  const ids: string[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const data = await oruloGet<ActiveIdsPage>(
      `/api/v2/buildings/ids/active?page=${page}&results_per_page=${RESULTS_PER_PAGE}`,
    );
    const pageIds = data.building_ids ?? data.ids ?? data.results ?? [];
    for (const id of pageIds) ids.push(String(id));
    totalPages =
      typeof data.total_pages === "number" && data.total_pages > 0
        ? data.total_pages
        : page;
    page += 1;
  } while (page <= totalPages);

  return { ids, pagesTraversed: totalPages };
}

/**
 * Sincronização manual idempotente (upsert por external_id). Não exclui nada.
 * Registra a execução em orulo_sync_runs (sem secrets/tokens no erro).
 */
export async function syncOrulo(): Promise<OruloSyncSummary> {
  const supabase = await createClient();
  const startedAt = new Date().toISOString();

  const summary: OruloSyncSummary = {
    ok: false,
    configActive: false,
    pagesTraversed: 0,
    buildingsFound: 0,
    created: 0,
    updated: 0,
    imagesFetched: 0,
    floorPlansFetched: 0,
  };

  try {
    if (!isOruloConfigured()) {
      throw new OruloError(
        "Órulo não configurado: defina ORULO_CLIENT_ID e ORULO_CLIENT_SECRET.",
      );
    }

    summary.configActive = await checkConfigActive();
    if (!summary.configActive) {
      throw new OruloError("Integração Órulo inativa em /api/v2/config.");
    }

    const { ids, pagesTraversed } = await listActiveBuildingIds();
    summary.pagesTraversed = pagesTraversed;
    summary.buildingsFound = ids.length;

    // Existentes → distinguir criados de atualizados.
    const { data: existing } = await supabase
      .from("orulo_buildings")
      .select("external_id");
    const existingIds = new Set((existing ?? []).map((r) => r.external_id));

    for (const id of ids) {
      const raw = asRecord(await oruloGet<unknown>(`/api/v2/buildings/${id}`));
      const images = (await oruloGet<unknown>(
        `/api/v2/buildings/${id}/images`,
      )) as Json;
      const floorPlans = (await oruloGet<unknown>(
        `/api/v2/buildings/${id}/floor_plans`,
      )) as Json;

      if (Array.isArray(images) && images.length > 0) summary.imagesFetched += 1;
      if (Array.isArray(floorPlans) && floorPlans.length > 0) {
        summary.floorPlansFetched += 1;
      }

      const row = extractBuildingFields(id, raw, images, floorPlans);
      const { error } = await supabase
        .from("orulo_buildings")
        .upsert({ ...row, synced_at: new Date().toISOString() }, {
          onConflict: "external_id",
        });
      if (error) throw new OruloError(`Erro ao salvar building ${id}.`);

      if (existingIds.has(id)) summary.updated += 1;
      else summary.created += 1;
    }

    summary.ok = true;
  } catch (err) {
    summary.error =
      err instanceof Error ? err.message : "Erro desconhecido na sincronização.";
  }

  await supabase.from("orulo_sync_runs").insert({
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    status: summary.ok ? "success" : "error",
    pages_traversed: summary.pagesTraversed,
    buildings_found: summary.buildingsFound,
    created_count: summary.created,
    updated_count: summary.updated,
    images_fetched: summary.imagesFetched,
    floor_plans_fetched: summary.floorPlansFetched,
    error_summary: summary.error ?? null,
  });

  return summary;
}
