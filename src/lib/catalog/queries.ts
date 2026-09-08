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
    if (!b.city || !f.citySlugs.includes(slugify(b.city))) return false;
  }
  if (f.neighborhoodSlugs && f.neighborhoodSlugs.length > 0) {
    if (!b.neighborhood || !f.neighborhoodSlugs.includes(slugify(b.neighborhood)))
      return false;
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
