import {
  listPublicProperties,
  type PropertyCard,
  type PropertySearchFilters,
} from "@/lib/properties/queries";
import {
  listPublishedBuildings,
  type OruloBuildingCard,
} from "@/lib/orulo/public-queries";
import { slugify } from "@/lib/slug";
import {
  cityMatchesAny,
  neighborhoodMatchesAny,
  normalizeLocation,
} from "./location";

/**
 * Catálogo público UNIFICADO: imóveis manuais (`properties`) + empreendimentos
 * publicados da Órulo (`orulo_buildings`) na MESMA listagem, sem separar por
 * origem. As fontes permanecem separadas no banco; a mescla acontece só aqui
 * (o PostgREST não faz UNION entre tabelas).
 *
 * Cada item carrega chaves de ordenação normalizadas para que preço, área e
 * "recentes" ordenem os dois tipos juntos. Os links continuam distintos:
 * imóvel → /imovel/[slug]; empreendimento → /empreendimento/[slug].
 *
 * Equivalência de filtros (aplica "mesmos filtros sempre que houver dados
 * equivalentes"): empreendimentos são lançamentos (venda), então:
 *   • finalidade=alugar → exclui empreendimentos;
 *   • tipo, vagas e características → sem dado equivalente no card do
 *     empreendimento → quando ativos, excluem empreendimentos;
 *   • q, cidade, bairro, preço, quartos e área → aplicados aos dois.
 */
export type CatalogItem =
  | { key: string; kind: "property"; property: PropertyCard; sortPrice: number | null; sortArea: number | null; sortRank: number }
  | { key: string; kind: "building"; building: OruloBuildingCard; sortPrice: number | null; sortArea: number | null; sortRank: number };

function ts(iso: string | null): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

/** Um empreendimento passa pelos filtros que têm equivalente no seu card. */
function buildingMatches(
  b: OruloBuildingCard,
  f: PropertySearchFilters,
): boolean {
  // Lançamentos são de venda: aluguel não se aplica.
  if (f.purpose === "rent") return false;
  // Filtros sem dado equivalente no card do empreendimento.
  if (f.type) return false;
  if (f.minParking !== undefined) return false;
  if (f.featureSlugs && f.featureSlugs.length > 0) return false;

  if (f.q) {
    const hay = [b.name, b.developer, b.city, b.neighborhood]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!hay.includes(f.q.toLowerCase())) return false;
  }
  if (f.citySlugs && f.citySlugs.length > 0) {
    if (!cityMatchesAny(b.city, f.citySlugs)) return false;
  }
  if (f.neighborhoodSlugs && f.neighborhoodSlugs.length > 0) {
    if (!neighborhoodMatchesAny(b.neighborhood, f.neighborhoodSlugs)) return false;
  }
  if (f.minPrice !== undefined && (b.minPrice === null || b.minPrice < f.minPrice))
    return false;
  if (f.maxPrice !== undefined && (b.minPrice === null || b.minPrice > f.maxPrice))
    return false;
  if (f.minBedrooms !== undefined) {
    const maxBeds = b.maxBedrooms ?? b.minBedrooms;
    if (maxBeds === null || maxBeds < f.minBedrooms) return false;
  }
  if (f.minArea !== undefined) {
    const maxA = b.maxArea ?? b.minArea;
    if (maxA === null || maxA < f.minArea) return false;
  }
  if (f.maxArea !== undefined) {
    const minA = b.minArea ?? b.maxArea;
    if (minA === null || minA > f.maxArea) return false;
  }
  return true;
}

/** Ordena o catálogo combinado conforme a ordenação escolhida. */
function sortCatalog(items: CatalogItem[], sort: PropertySearchFilters["sort"]): void {
  const byNum = (
    a: number | null,
    b: number | null,
    dir: 1 | -1,
  ): number => {
    // nulos sempre por último, independentemente da direção.
    if (a === null && b === null) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    return (a - b) * dir;
  };

  switch (sort) {
    case "preco-asc":
      items.sort((x, y) => byNum(x.sortPrice, y.sortPrice, 1));
      break;
    case "preco-desc":
      items.sort((x, y) => byNum(x.sortPrice, y.sortPrice, -1));
      break;
    case "area-desc":
      items.sort((x, y) => byNum(x.sortArea, y.sortArea, -1));
      break;
    default: // recentes
      items.sort((x, y) => y.sortRank - x.sortRank);
  }
}

/**
 * Lista o catálogo público unificado (imóveis + empreendimentos), filtrado e
 * ordenado em conjunto. Imóveis são filtrados no banco por listPublicProperties;
 * empreendimentos publicados são buscados e filtrados em memória (volume baixo).
 */
export async function listPublicCatalog(
  filters: PropertySearchFilters = {},
): Promise<CatalogItem[]> {
  const [properties, buildings] = await Promise.all([
    listPublicProperties(filters),
    listPublishedBuildings(),
  ]);

  const items: CatalogItem[] = [];

  for (const p of properties) {
    items.push({
      key: `imovel_${p.id}`,
      kind: "property",
      property: p,
      sortPrice: p.salePrice ?? p.rentPrice,
      sortArea: p.privateArea,
      sortRank: ts(p.createdAt),
    });
  }

  for (const b of buildings) {
    if (!buildingMatches(b, filters)) continue;
    items.push({
      key: `empreendimento_${b.slug}`,
      kind: "building",
      building: b,
      sortPrice: b.minPrice,
      sortArea: b.maxArea ?? b.minArea,
      sortRank: ts(b.publishedAt),
    });
  }

  sortCatalog(items, filters.sort);
  return items;
}

export type NeighborhoodOffer = { name: string; slug: string; count: number };

/**
 * Agrega as ofertas do catálogo unificado POR BAIRRO. Cada oferta (imóvel
 * manual ou empreendimento) conta uma única vez, no grupo do seu bairro
 * literal, deduplicado pela MESMA normalização do filtro (acento/caixa/espaços/
 * pontuação). Retorna os `limit` bairros com mais ofertas (empate → alfabético).
 *
 * Bairros compostos (ex.: "Altiplano Cabo Branco"): o empreendimento pertence
 * ao grupo do seu bairro literal — não é contado também em "Altiplano" nem em
 * "Cabo Branco" — evitando cartões duplicados e contagem em dobro. O link usa o
 * slug desse bairro e o filtro (matching por tokens) mostra um conjunto coerente.
 */
export function aggregateNeighborhoodOffers(
  items: CatalogItem[],
  limit = 10,
): NeighborhoodOffer[] {
  const map = new Map<string, { name: string; count: number }>();
  for (const it of items) {
    const raw =
      it.kind === "property"
        ? it.property.neighborhoodName
        : it.building.neighborhood;
    const name = (raw ?? "").trim();
    const key = normalizeLocation(name);
    if (!key) continue; // sem bairro → não agrupa
    const cur = map.get(key);
    if (cur) cur.count += 1;
    else map.set(key, { name, count: 1 });
  }
  return [...map.values()]
    .map((v) => ({ name: v.name, slug: slugify(v.name), count: v.count }))
    .sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"),
    )
    .slice(0, limit);
}

// FNV-1a (32 bits) — hash estável e determinístico para seleção diária.
function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Seleção pseudoaleatória ESTÁVEL POR SEED (ex.: a data em America/Sao_Paulo):
 * ordena por hash(seed|key) e pega os primeiros `count`. Determinística — no
 * mesmo dia retorna sempre os mesmos itens; muda quando o seed muda. Não usa
 * random nem estado do navegador.
 */
export function pickDailyItems<T extends { key: string }>(
  items: T[],
  count: number,
  seed: string,
): T[] {
  return [...items]
    .map((it) => ({ it, h: hashStr(`${seed}|${it.key}`) }))
    .sort((a, b) => a.h - b.h || (a.it.key < b.it.key ? -1 : 1))
    .slice(0, count)
    .map((x) => x.it);
}
