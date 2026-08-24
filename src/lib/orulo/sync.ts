import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Json, TablesInsert } from "@/types/database";
import { slugify } from "@/lib/slug";
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
  total?: number;
  buildings?: { id: string | number; updated_at?: string }[];
};

type UnknownRecord = Record<string, unknown>;

/** Converte data da Órulo ("dd/MM/yyyy HH:mm:ss") em ISO; null se inválida. */
function parseOruloDate(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, d, mo, y, h, mi, s] = m;
  const dt = new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}`);
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
}

/** Compõe o endereço a partir do objeto address da Órulo. */
function composeAddress(address: UnknownRecord): string | null {
  const streetType = str(address.street_type);
  const street = str(address.street);
  const number = str(address.number) ?? (num(address.number)?.toString() ?? null);
  const line = [streetType, street].filter(Boolean).join(" ").trim();
  if (!line) return null;
  return number ? `${line}, ${number}` : line;
}

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
  const name = firstStr(raw, ["name", "title"]);
  const defaultImage = asRecord(raw.default_image);
  return {
    external_id: externalId,
    // Slug estável incluindo o external_id imutável.
    slug: `${slugify(name ?? "empreendimento")}-${externalId}`,
    max_bedrooms: firstNum(raw, ["max_bedrooms"]),
    max_area: firstNum(raw, ["max_area"]),
    cover_image_id: firstStr(defaultImage, ["id"]),
    typologies: Array.isArray(raw.typologies) ? (raw.typologies as Json) : null,
    name,
    developer:
      firstStr(raw, ["developer", "developer_name", "builder"]) ??
      firstStr(asRecord(raw.developer), ["name"]),
    city: firstStr(address, ["city"]) ?? firstStr(raw, ["city"]),
    // Bairro da Órulo vem em address.area.
    neighborhood:
      firstStr(address, ["area", "neighborhood", "neighbourhood"]) ??
      firstStr(raw, ["neighborhood"]),
    address: composeAddress(address) ?? firstStr(raw, ["address_text"]),
    description: firstStr(raw, ["description"]),
    min_price: firstNum(raw, ["min_price", "minimum_price", "price_from"]),
    bedrooms: firstNum(raw, ["min_bedrooms", "bedrooms"]),
    bathrooms: firstNum(raw, ["min_bathrooms", "bathrooms"]),
    suites: firstNum(raw, ["min_suites", "suites"]),
    parking: firstNum(raw, ["min_parking", "parking"]),
    private_area: firstNum(raw, ["min_area", "private_area", "area"]),
    status: firstStr(raw, ["status", "stage", "construction_status"]),
    external_updated_at: parseOruloDate(raw.updated_at),
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
    // O envelope real é { buildings: [{ id, updated_at }], total, total_pages }.
    for (const b of data.buildings ?? []) ids.push(String(b.id));
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
      // Os endpoints dedicados /images e /floor_plans retornam 400 nesta praça;
      // o detalhe do building já inclui os arrays completos.
      const images = (Array.isArray(raw.images) ? raw.images : null) as Json;
      const floorPlans = (
        Array.isArray(raw.floor_plans) ? raw.floor_plans : null
      ) as Json;

      if (Array.isArray(raw.images) && raw.images.length > 0) {
        summary.imagesFetched += 1;
      }
      if (Array.isArray(raw.floor_plans) && raw.floor_plans.length > 0) {
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
