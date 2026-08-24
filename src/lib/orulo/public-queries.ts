import { createClient } from "@/lib/supabase/server";
import { oruloImageUrl } from "./images";

// ---------------------------------------------------------------------------
// DTOs públicos (nunca incluem `raw`, contatos comerciais ou comissão)
// ---------------------------------------------------------------------------
export type OruloTypology = {
  id: string;
  type: string | null;
  privateArea: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  suites: number | null;
  parking: number | null;
  price: number | null;
};

export type OruloMedia = { url: string; thumb: string; alt: string };

export type OruloBuildingCard = {
  slug: string;
  name: string;
  developer: string | null;
  city: string | null;
  neighborhood: string | null;
  status: string | null;
  minPrice: number | null;
  minBedrooms: number | null;
  maxBedrooms: number | null;
  minArea: number | null;
  maxArea: number | null;
  coverUrl: string | null;
};

export type OruloBuildingDetail = OruloBuildingCard & {
  externalId: string;
  published: boolean;
  description: string | null;
  address: string | null;
  images: OruloMedia[];
  floorPlans: OruloMedia[];
  typologies: OruloTypology[];
};

// Colunas seguras (jamais `raw`).
const SELECT_COLS =
  "external_id, slug, name, developer, city, neighborhood, address, description, status, min_price, bedrooms, max_bedrooms, private_area, max_area, cover_image_id, images, floor_plans, typologies, published, published_at";

// ---------------------------------------------------------------------------
// Helpers de parsing tolerante do jsonb
// ---------------------------------------------------------------------------
type Rec = Record<string, unknown>;
const asArr = (v: unknown): Rec[] =>
  Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as Rec[]) : [];
const s = (v: unknown): string | null =>
  typeof v === "string" && v.trim() !== "" ? v : null;
const n = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v)
    ? v
    : typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))
      ? Number(v)
      : null;

function toMedia(items: unknown, fallbackAlt: string): OruloMedia[] {
  return asArr(items).map((it) => {
    const id = s(it.id) ?? String(it.id ?? "");
    return {
      url: oruloImageUrl(id, "large"),
      thumb: oruloImageUrl(id, "card"),
      alt: s(it.description) ?? fallbackAlt,
    };
  });
}

function toTypologies(items: unknown): OruloTypology[] {
  return asArr(items).map((t) => ({
    id: s(t.id) ?? String(t.id ?? ""),
    type: s(t.type),
    privateArea: n(t.private_area),
    bedrooms: n(t.bedrooms),
    bathrooms: n(t.bathrooms),
    suites: n(t.suites),
    parking: n(t.parking),
    price: n(t.original_price) ?? n(t.discount_price),
  }));
}

type RowShape = {
  external_id: string;
  slug: string | null;
  name: string | null;
  developer: string | null;
  city: string | null;
  neighborhood: string | null;
  address: string | null;
  description: string | null;
  status: string | null;
  min_price: number | string | null;
  bedrooms: number | null;
  max_bedrooms: number | null;
  private_area: number | string | null;
  max_area: number | string | null;
  cover_image_id: string | null;
  images: unknown;
  floor_plans: unknown;
  typologies: unknown;
  published: boolean;
};

function mapCard(row: RowShape): OruloBuildingCard {
  const cover = row.cover_image_id
    ? oruloImageUrl(row.cover_image_id, "card")
    : (toMedia(row.images, row.name ?? "")[0]?.url ?? null);
  return {
    slug: row.slug ?? "",
    name: row.name ?? "Empreendimento",
    developer: row.developer,
    city: row.city,
    neighborhood: row.neighborhood,
    status: row.status,
    minPrice: n(row.min_price),
    minBedrooms: row.bedrooms,
    maxBedrooms: row.max_bedrooms,
    minArea: n(row.private_area),
    maxArea: n(row.max_area),
    coverUrl: cover,
  };
}

function mapDetail(row: RowShape): OruloBuildingDetail {
  return {
    ...mapCard(row),
    externalId: row.external_id,
    published: row.published,
    description: row.description,
    address: row.address,
    images: toMedia(row.images, row.name ?? ""),
    floorPlans: toMedia(row.floor_plans, `Planta - ${row.name ?? ""}`),
    typologies: toTypologies(row.typologies),
  };
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

/** Lista empreendimentos PUBLICADOS (catálogo público). */
export async function listPublishedBuildings(): Promise<OruloBuildingCard[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orulo_buildings")
    .select(SELECT_COLS)
    .eq("published", true)
    .order("published_at", { ascending: false });
  return ((data ?? []) as unknown as RowShape[]).map(mapCard);
}

/** Empreendimento público por slug (null se não existir/não publicado). */
export async function getPublishedBuildingBySlug(
  slug: string,
): Promise<OruloBuildingDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orulo_buildings")
    .select(SELECT_COLS)
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  return data ? mapDetail(data as unknown as RowShape) : null;
}

/**
 * Detalhe para PRÉVIA no admin (por external_id, sem filtro de publicado).
 * Depende de sessão de admin (RLS admin_all).
 */
export async function getBuildingForPreview(
  externalId: string,
): Promise<OruloBuildingDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orulo_buildings")
    .select(SELECT_COLS)
    .eq("external_id", externalId)
    .maybeSingle();
  return data ? mapDetail(data as unknown as RowShape) : null;
}
