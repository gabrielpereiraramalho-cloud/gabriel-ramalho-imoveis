import type { Metadata } from "next";
import Link from "next/link";

import {
  getPropertyFilterOptions,
  listPublicProperties,
  type PropertySearchFilters,
  type PropertySort,
} from "@/lib/properties/queries";
import { PropertyCard } from "@/components/property-card";
import {
  PropertyFilters,
  type PropertyFiltersValues,
} from "@/components/property-filters";
import { defaultOgImage } from "@/lib/site";

const IMOVEIS_DESCRIPTION =
  "Consulte imóveis em João Pessoa e região com filtros por bairro, tipo, preço e características.";

// Canonical único em /imoveis: combinações de filtros (query string) não são
// indexadas como páginas SEO individuais.
export const metadata: Metadata = {
  title: "Imóveis à venda e para alugar em João Pessoa",
  description: IMOVEIS_DESCRIPTION,
  alternates: { canonical: "/imoveis" },
  openGraph: {
    title: "Imóveis à venda e para alugar em João Pessoa",
    description: IMOVEIS_DESCRIPTION,
    url: "/imoveis",
    images: [{ url: defaultOgImage }],
  },
};

type SearchParams = Record<string, string | string[] | undefined>;

const SORT_VALUES: PropertySort[] = [
  "recentes",
  "preco-asc",
  "preco-desc",
  "area-desc",
];

function first(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

function toArray(v: string | string[] | undefined): string[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

function toNumber(v: string): number | undefined {
  if (v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export default async function ImoveisPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const values: PropertyFiltersValues = {
    q: first(sp.q),
    finalidade: first(sp.finalidade),
    tipo: first(sp.tipo),
    cidade: first(sp.cidade),
    bairro: first(sp.bairro),
    min: first(sp.min),
    max: first(sp.max),
    quartos: first(sp.quartos),
    vagas: first(sp.vagas),
    areaMin: first(sp.areaMin),
    areaMax: first(sp.areaMax),
    ordem: first(sp.ordem) || "recentes",
    features: toArray(sp.features),
  };

  const purpose =
    values.finalidade === "sale" || values.finalidade === "rent"
      ? values.finalidade
      : undefined;
  const sort = SORT_VALUES.includes(values.ordem as PropertySort)
    ? (values.ordem as PropertySort)
    : undefined;

  const filters: PropertySearchFilters = {
    q: values.q || undefined,
    purpose,
    type: values.tipo || undefined,
    citySlug: values.cidade || undefined,
    neighborhoodSlug: values.bairro || undefined,
    minPrice: toNumber(values.min),
    maxPrice: toNumber(values.max),
    minBedrooms: toNumber(values.quartos),
    minParking: toNumber(values.vagas),
    minArea: toNumber(values.areaMin),
    maxArea: toNumber(values.areaMax),
    featureSlugs: values.features.length > 0 ? values.features : undefined,
    sort,
  };

  const [options, properties] = await Promise.all([
    getPropertyFilterOptions(),
    listPublicProperties(filters),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl font-semibold text-brand-navy">
          Imóveis em João Pessoa e região
        </h1>
        <p className="text-zinc-600">
          Encontre oportunidades selecionadas para morar ou investir.
        </p>
      </header>

      <PropertyFilters
        cities={options.cities}
        neighborhoods={options.neighborhoods}
        types={options.types}
        features={options.features}
        values={values}
      />

      <p className="text-sm text-zinc-500">
        {properties.length}{" "}
        {properties.length === 1 ? "imóvel encontrado" : "imóveis encontrados"}
      </p>

      {properties.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-zinc-200 bg-white p-6">
          <p className="text-zinc-600">
            Nenhum imóvel encontrado com esses filtros.
          </p>
          <Link
            href="/imoveis"
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-brand-navy"
          >
            Limpar filtros
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((card) => (
            <PropertyCard key={card.id} card={card} />
          ))}
        </div>
      )}
    </main>
  );
}
