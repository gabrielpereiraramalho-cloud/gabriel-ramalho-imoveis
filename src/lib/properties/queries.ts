import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type {
  Database,
  PropertyPurpose,
  PropertyStatus,
  SolarPosition,
} from "@/types/database";
import { toNum } from "./format";

type Supabase = SupabaseClient<Database>;

const IMAGE_BUCKET = "property-images";

// ---------------------------------------------------------------------------
// Tipos públicos (somente campos seguros — nada de partner/leads/profiles)
// ---------------------------------------------------------------------------
export type PropertyCard = {
  id: string;
  slug: string;
  title: string;
  tag: string | null;
  purpose: PropertyPurpose;
  status: PropertyStatus;
  salePrice: number | null;
  rentPrice: number | null;
  privateArea: number | null;
  bedrooms: number;
  suites: number;
  parkingSpaces: number;
  cityName: string | null;
  state: string | null;
  neighborhoodId: string | null;
  neighborhoodName: string | null;
  coverUrl: string | null;
};

export type PropertyImage = { url: string; alt: string };
export type PropertyFeature = { name: string; category: string | null };

export type PropertyDetail = {
  id: string;
  code: string;
  slug: string;
  title: string;
  tag: string | null;
  description: string | null;
  propertyType: string;
  purpose: PropertyPurpose;
  status: PropertyStatus;
  salePrice: number | null;
  rentPrice: number | null;
  condominiumFee: number | null;
  iptu: number | null;
  acceptsFinancing: boolean;
  privateArea: number | null;
  totalArea: number | null;
  externalArea: number | null;
  bedrooms: number;
  suites: number;
  bathrooms: number;
  parkingSpaces: number;
  floor: number | null;
  solarPosition: SolarPosition | null;
  cityName: string | null;
  state: string | null;
  neighborhoodId: string | null;
  neighborhoodName: string | null;
  address: string | null;
  addressNumber: string | null;
  complement: string | null;
  postalCode: string | null;
  showExactAddress: boolean;
  youtubeUrl: string | null;
  instagramUrl: string | null;
  virtualTourUrl: string | null;
  coverImageUrl: string | null;
  images: PropertyImage[];
  features: PropertyFeature[];
};

// ---------------------------------------------------------------------------
// Linhas cruas (embeds) — tipadas explicitamente para evitar `any`
// ---------------------------------------------------------------------------
type RawCity = { name: string; state: string } | null;
type RawNeighborhood = { name: string } | null;
type RawEmbedImage = {
  storage_path: string;
  alt_text: string | null;
  sort_order: number;
  is_cover: boolean;
};

type RawCardRow = {
  id: string;
  slug: string;
  title: string;
  tag: string | null;
  purpose: PropertyPurpose;
  status: PropertyStatus;
  sale_price: number | string | null;
  rent_price: number | string | null;
  private_area: number | string | null;
  bedrooms: number;
  suites: number;
  parking_spaces: number;
  neighborhood_id: string | null;
  cities: RawCity;
  neighborhoods: RawNeighborhood;
  property_images: RawEmbedImage[];
};

type RawDetailRow = RawCardRow & {
  code: string;
  description: string | null;
  property_type: string;
  condominium_fee: number | string | null;
  iptu: number | string | null;
  accepts_financing: boolean;
  total_area: number | string | null;
  external_area: number | string | null;
  bathrooms: number;
  floor: number | null;
  solar_position: SolarPosition | null;
  address: string | null;
  address_number: string | null;
  complement: string | null;
  postal_code: string | null;
  show_exact_address: boolean;
  youtube_url: string | null;
  instagram_url: string | null;
  virtual_tour_url: string | null;
  property_features: { features: { name: string; category: string | null } | null }[];
};

const CARD_COLUMNS =
  "id, slug, title, tag, purpose, status, sale_price, rent_price, private_area, bedrooms, suites, parking_spaces, neighborhood_id, cities(name, state), neighborhoods(name), property_images(storage_path, alt_text, sort_order, is_cover)";

const DETAIL_COLUMNS = `${CARD_COLUMNS}, code, description, property_type, condominium_fee, iptu, accepts_financing, total_area, external_area, bathrooms, floor, solar_position, address, address_number, complement, postal_code, show_exact_address, youtube_url, instagram_url, virtual_tour_url, property_features(features(name, category))`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function publicUrl(supabase: Supabase, storagePath: string): string {
  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(storagePath).data
    .publicUrl;
}

function pickCoverPath(images: RawEmbedImage[]): string | null {
  if (images.length === 0) return null;
  const cover = images.find((img) => img.is_cover);
  if (cover) return cover.storage_path;
  return [...images].sort((a, b) => a.sort_order - b.sort_order)[0].storage_path;
}

function mapCard(supabase: Supabase, row: RawCardRow): PropertyCard {
  const coverPath = pickCoverPath(row.property_images ?? []);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    tag: row.tag,
    purpose: row.purpose,
    status: row.status,
    salePrice: toNum(row.sale_price),
    rentPrice: toNum(row.rent_price),
    privateArea: toNum(row.private_area),
    bedrooms: row.bedrooms,
    suites: row.suites,
    parkingSpaces: row.parking_spaces,
    cityName: row.cities?.name ?? null,
    state: row.cities?.state ?? null,
    neighborhoodId: row.neighborhood_id,
    neighborhoodName: row.neighborhoods?.name ?? null,
    coverUrl: coverPath ? publicUrl(supabase, coverPath) : null,
  };
}

// ---------------------------------------------------------------------------
// Consultas públicas
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Filtros de busca
// ---------------------------------------------------------------------------
export type PropertySort = "recentes" | "preco-asc" | "preco-desc" | "area-desc";

export type PropertySearchFilters = {
  q?: string;
  purpose?: PropertyPurpose;
  type?: string;
  citySlug?: string;
  neighborhoodSlug?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  minParking?: number;
  minArea?: number;
  maxArea?: number;
  featureSlugs?: string[];
  sort?: PropertySort;
};

export type CityOption = {
  id: string;
  name: string;
  slug: string;
  state: string;
};
export type NeighborhoodOption = {
  id: string;
  name: string;
  slug: string;
  city_id: string | null;
};
export type FeatureOption = { id: string; name: string; slug: string };

export type PropertyFilterOptions = {
  cities: CityOption[];
  neighborhoods: NeighborhoodOption[];
  types: string[];
  features: FeatureOption[];
};

/**
 * Lista imóveis públicos aplicando os filtros no banco (não em JS).
 * Só carrega os campos necessários aos cards.
 */
export async function listPublicProperties(
  filters: PropertySearchFilters = {},
): Promise<PropertyCard[]> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  // Características: exige TODAS as selecionadas. Pré-consulta (1 query extra,
  // sem N+1) os property_id que possuem todas as features e restringe a lista.
  let featurePropertyIds: string[] | null = null;
  if (filters.featureSlugs && filters.featureSlugs.length > 0) {
    const { data: feats } = await supabase
      .from("features")
      .select("id")
      .in("slug", filters.featureSlugs);
    const featureIds = (feats ?? []).map((f) => f.id);
    if (featureIds.length === 0) return [];

    const { data: links } = await supabase
      .from("property_features")
      .select("property_id, feature_id")
      .in("feature_id", featureIds);

    const counts = new Map<string, number>();
    for (const link of links ?? []) {
      counts.set(link.property_id, (counts.get(link.property_id) ?? 0) + 1);
    }
    featurePropertyIds = [...counts.entries()]
      .filter(([, n]) => n === featureIds.length)
      .map(([id]) => id);
    if (featurePropertyIds.length === 0) return [];
  }

  // Resolve slugs de cidade/bairro para ids.
  let cityId: string | null = null;
  if (filters.citySlug) {
    const { data: city } = await supabase
      .from("cities")
      .select("id")
      .eq("slug", filters.citySlug)
      .maybeSingle();
    if (!city) return [];
    cityId = city.id;
  }
  let neighborhoodIds: string[] | null = null;
  if (filters.neighborhoodSlug) {
    let nQuery = supabase
      .from("neighborhoods")
      .select("id")
      .eq("slug", filters.neighborhoodSlug);
    if (cityId) nQuery = nQuery.eq("city_id", cityId);
    const { data: nbs } = await nQuery;
    neighborhoodIds = (nbs ?? []).map((n) => n.id);
    if (neighborhoodIds.length === 0) return [];
  }

  let query = supabase
    .from("properties")
    .select(CARD_COLUMNS)
    .eq("active", true)
    .neq("status", "hidden")
    .not("published_at", "is", null)
    .lte("published_at", nowIso);

  if (featurePropertyIds) query = query.in("id", featurePropertyIds);
  if (cityId) query = query.eq("city_id", cityId);
  if (neighborhoodIds) query = query.in("neighborhood_id", neighborhoodIds);
  if (filters.type) query = query.eq("property_type", filters.type);
  if (filters.purpose) query = query.eq("purpose", filters.purpose);
  if (filters.minBedrooms) query = query.gte("bedrooms", filters.minBedrooms);
  if (filters.minParking) {
    query = query.gte("parking_spaces", filters.minParking);
  }
  if (filters.minArea !== undefined) {
    query = query.gte("private_area", filters.minArea);
  }
  if (filters.maxArea !== undefined) {
    query = query.lte("private_area", filters.maxArea);
  }
  if (filters.q) {
    const term = filters.q.replace(/[,%()*]/g, " ").trim();
    if (term) query = query.or(`title.ilike.%${term}%,code.ilike.%${term}%`);
  }

  // Preço: com finalidade, filtra a coluna correspondente. Sem finalidade,
  // aplica no preço principal de cada imóvel (OR por finalidade).
  const { minPrice, maxPrice, purpose } = filters;
  if (minPrice !== undefined || maxPrice !== undefined) {
    if (purpose === "rent") {
      if (minPrice !== undefined) query = query.gte("rent_price", minPrice);
      if (maxPrice !== undefined) query = query.lte("rent_price", maxPrice);
    } else if (purpose === "sale") {
      if (minPrice !== undefined) query = query.gte("sale_price", minPrice);
      if (maxPrice !== undefined) query = query.lte("sale_price", maxPrice);
    } else {
      const sale = ["purpose.eq.sale"];
      const rent = ["purpose.eq.rent"];
      if (minPrice !== undefined) {
        sale.push(`sale_price.gte.${minPrice}`);
        rent.push(`rent_price.gte.${minPrice}`);
      }
      if (maxPrice !== undefined) {
        sale.push(`sale_price.lte.${maxPrice}`);
        rent.push(`rent_price.lte.${maxPrice}`);
      }
      query = query.or(`and(${sale.join(",")}),and(${rent.join(",")})`);
    }
  }

  // Ordenação (preço respeita a finalidade quando selecionada).
  const priceColumn = purpose === "rent" ? "rent_price" : "sale_price";
  switch (filters.sort) {
    case "preco-asc":
      query = query.order(priceColumn, { ascending: true, nullsFirst: false });
      break;
    case "preco-desc":
      query = query.order(priceColumn, { ascending: false, nullsFirst: false });
      break;
    case "area-desc":
      query = query.order("private_area", {
        ascending: false,
        nullsFirst: false,
      });
      break;
    default:
      query = query
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false });
  }

  const { data } = await query;
  const rows = (data ?? []) as unknown as RawCardRow[];
  return rows.map((row) => mapCard(supabase, row));
}

/** Imóveis públicos em destaque (featured = true), mais recentes primeiro. */
export async function getFeaturedProperties(limit = 6): Promise<PropertyCard[]> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { data } = await supabase
    .from("properties")
    .select(CARD_COLUMNS)
    .eq("active", true)
    .neq("status", "hidden")
    .not("published_at", "is", null)
    .lte("published_at", nowIso)
    .eq("featured", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows = (data ?? []) as unknown as RawCardRow[];
  return rows.map((row) => mapCard(supabase, row));
}

/** Carrega as opções dos filtros (cidades, bairros, tipos e características). */
export async function getPropertyFilterOptions(): Promise<PropertyFilterOptions> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const [citiesRes, neighborhoodsRes, typesRes, featuresRes] =
    await Promise.all([
      supabase.from("cities").select("id, name, slug, state").order("name"),
      supabase
        .from("neighborhoods")
        .select("id, name, slug, city_id")
        .eq("active", true)
        .order("name"),
      supabase
        .from("properties")
        .select("property_type")
        .eq("active", true)
        .neq("status", "hidden")
        .not("published_at", "is", null)
        .lte("published_at", nowIso),
      supabase.from("features").select("id, name, slug").eq("active", true).order("name"),
    ]);

  const typeRows = (typesRes.data ?? []) as { property_type: string }[];
  const types = [...new Set(typeRows.map((r) => r.property_type))].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );

  return {
    cities: (citiesRes.data ?? []) as CityOption[],
    neighborhoods: (neighborhoodsRes.data ?? []) as NeighborhoodOption[],
    types,
    features: (featuresRes.data ?? []) as FeatureOption[],
  };
}

/** Busca um imóvel público pelo slug; retorna null se não existir/não público. */
export async function getPublicPropertyBySlug(
  slug: string,
): Promise<PropertyDetail | null> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { data } = await supabase
    .from("properties")
    .select(DETAIL_COLUMNS)
    .eq("slug", slug)
    .eq("active", true)
    .neq("status", "hidden")
    .not("published_at", "is", null)
    .lte("published_at", nowIso)
    .order("sort_order", {
      referencedTable: "property_images",
      ascending: true,
    })
    .maybeSingle();

  if (!data) return null;
  const row = data as unknown as RawDetailRow;

  const images: PropertyImage[] = (row.property_images ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((img, index) => ({
      url: publicUrl(supabase, img.storage_path),
      alt: img.alt_text ?? `${row.title} - foto ${index + 1}`,
    }));

  const features: PropertyFeature[] = (row.property_features ?? [])
    .map((pf) => pf.features)
    .filter((f): f is { name: string; category: string | null } => f !== null)
    .map((f) => ({ name: f.name, category: f.category }));

  return {
    id: row.id,
    code: row.code,
    slug: row.slug,
    title: row.title,
    tag: row.tag,
    description: row.description,
    propertyType: row.property_type,
    purpose: row.purpose,
    status: row.status,
    salePrice: toNum(row.sale_price),
    rentPrice: toNum(row.rent_price),
    condominiumFee: toNum(row.condominium_fee),
    iptu: toNum(row.iptu),
    acceptsFinancing: row.accepts_financing,
    privateArea: toNum(row.private_area),
    totalArea: toNum(row.total_area),
    externalArea: toNum(row.external_area),
    bedrooms: row.bedrooms,
    suites: row.suites,
    bathrooms: row.bathrooms,
    parkingSpaces: row.parking_spaces,
    floor: row.floor,
    solarPosition: row.solar_position,
    cityName: row.cities?.name ?? null,
    state: row.cities?.state ?? null,
    neighborhoodId: row.neighborhood_id,
    neighborhoodName: row.neighborhoods?.name ?? null,
    address: row.address,
    addressNumber: row.address_number,
    complement: row.complement,
    postalCode: row.postal_code,
    showExactAddress: row.show_exact_address,
    youtubeUrl: row.youtube_url,
    instagramUrl: row.instagram_url,
    virtualTourUrl: row.virtual_tour_url,
    coverImageUrl: (() => {
      const coverPath = pickCoverPath(row.property_images ?? []);
      return coverPath ? publicUrl(supabase, coverPath) : null;
    })(),
    images,
    features,
  };
}

/** Slugs e datas de atualização dos imóveis públicos (para o sitemap). */
export async function listPublicPropertySlugs(): Promise<
  { slug: string; updatedAt: string | null }[]
> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { data } = await supabase
    .from("properties")
    .select("slug, updated_at")
    .eq("active", true)
    .neq("status", "hidden")
    .not("published_at", "is", null)
    .lte("published_at", nowIso);

  const rows = (data ?? []) as { slug: string; updated_at: string | null }[];
  return rows.map((r) => ({ slug: r.slug, updatedAt: r.updated_at }));
}

/**
 * Imóveis semelhantes: prioriza mesmo bairro e mesma finalidade, completando
 * com outros públicos. Nunca inclui o próprio imóvel. Retorna até 3.
 */
export async function getSimilarProperties(current: {
  id: string;
  neighborhoodId: string | null;
  purpose: PropertyPurpose;
}): Promise<PropertyCard[]> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { data } = await supabase
    .from("properties")
    .select(CARD_COLUMNS)
    .eq("active", true)
    .neq("status", "hidden")
    .not("published_at", "is", null)
    .lte("published_at", nowIso)
    .neq("id", current.id)
    .limit(12);

  const cards = ((data ?? []) as unknown as RawCardRow[]).map((row) =>
    mapCard(supabase, row),
  );

  const score = (c: PropertyCard): number => {
    let s = 0;
    if (current.neighborhoodId && c.neighborhoodId === current.neighborhoodId) {
      s += 2;
    }
    if (c.purpose === current.purpose) s += 1;
    return s;
  };

  return [...cards].sort((a, b) => score(b) - score(a)).slice(0, 3);
}
