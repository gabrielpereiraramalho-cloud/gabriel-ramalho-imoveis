import type { Metadata } from "next";
import Link from "next/link";

import {
  getPropertyFilterOptions,
  listPublicProperties,
} from "@/lib/properties/queries";
import { listPublicCatalog, pickDailyItems } from "@/lib/catalog/queries";
import {
  absoluteUrl,
  defaultOgImage,
  jsonLdScript,
  siteConfig,
  siteUrl,
} from "@/lib/site";
import { FeaturedProperties } from "@/components/home/featured-properties";
import { PropertyCard } from "@/components/property-card";
import { BuildingCard } from "@/components/orulo/building-card";
import { Hero } from "@/components/home/hero";
import { NeighborhoodsSection } from "@/components/home/neighborhoods-section";
import { SellCta } from "@/components/home/sell-cta";
import { AboutSection } from "@/components/home/about-section";

const HOME_DESCRIPTION =
  "Encontre apartamentos, casas e oportunidades imobiliárias em João Pessoa e região com atendimento personalizado de Gabriel Ramalho.";

export const metadata: Metadata = {
  title: { absolute: "Imóveis em João Pessoa | Gabriel Ramalho" },
  description: HOME_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: "Imóveis em João Pessoa | Gabriel Ramalho",
    description: HOME_DESCRIPTION,
    url: siteUrl,
    images: [{ url: defaultOgImage }],
  },
};

function realEstateAgentJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: siteConfig.brand,
    url: siteUrl,
    image: defaultOgImage,
    description: siteConfig.creci
      ? `${siteConfig.role} — ${siteConfig.creci}`
      : siteConfig.role,
    areaServed: { "@type": "City", name: siteConfig.addressLocality },
    address: {
      "@type": "PostalAddress",
      addressLocality: siteConfig.addressLocality,
      addressRegion: siteConfig.addressRegion,
      addressCountry: "BR",
    },
    ...(siteConfig.instagramUrl ? { sameAs: [siteConfig.instagramUrl] } : {}),
    ...(siteConfig.whatsappNumber
      ? { telephone: `+${siteConfig.whatsappNumber}` }
      : {}),
    logo: absoluteUrl("/logo-gabriel-ramalho.png"),
  };
}

export default async function Home() {
  const [options, manual, catalog] = await Promise.all([
    getPropertyFilterOptions(),
    // Ordenado featured-first e depois mais recentes.
    listPublicProperties({}),
    // Catálogo unificado (imóveis manuais + empreendimentos publicados).
    listPublicCatalog({}),
  ]);

  // Faixa 1 — até 3 destaques FIXOS (marcados no admin); se houver menos de 3,
  // completa com os imóveis manuais publicados mais recentes.
  const destaques = manual.slice(0, 3);
  const destaqueIds = new Set(destaques.map((d) => d.id));

  // Faixa 2 — "Oportunidades para você": 3 itens variáveis do catálogo
  // unificado, sem repetir os destaques, só com imagem + preço válidos.
  const pool = catalog.filter((it) => {
    if (it.kind === "property") {
      if (destaqueIds.has(it.property.id)) return false;
      return (
        Boolean(it.property.coverUrl) &&
        (it.property.salePrice !== null || it.property.rentPrice !== null)
      );
    }
    return Boolean(it.building.coverUrl) && it.building.minPrice !== null;
  });
  // Seed diário em America/Sao_Paulo (YYYY-MM-DD) → seleção estável no dia.
  const daySeed = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const oportunidades = pickDailyItems(pool, 3, daySeed);

  return (
    <main className="flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(realEstateAgentJsonLd()),
        }}
      />
      <Hero
        cities={options.cities}
        neighborhoods={options.neighborhoods}
        types={options.types}
        featured={destaques}
      />

      {/* Faixa 1 — Imóveis em destaque (fixos, marcados no admin) */}
      {destaques.length > 0 ? (
        <section className="mx-auto w-full max-w-7xl px-4 pb-8 pt-20 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-brand-gold">
                Seleção
              </span>
              <h2 className="font-serif text-2xl font-semibold text-brand-navy sm:text-3xl">
                Imóveis em destaque
              </h2>
            </div>
          </div>

          <FeaturedProperties items={destaques} />
        </section>
      ) : null}

      {/* Faixa 2 — Oportunidades para você (variáveis, estáveis por dia) */}
      {oportunidades.length > 0 ? (
        <section className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-brand-gold">
                Seleção do dia
              </span>
              <h2 className="font-serif text-2xl font-semibold text-brand-navy sm:text-3xl">
                Oportunidades para você
              </h2>
            </div>
            <Link
              href="/imoveis"
              className="text-sm font-medium text-brand-navy hover:text-brand-gold"
            >
              Ver todos os imóveis →
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {oportunidades.map((item) =>
              item.kind === "building" ? (
                <BuildingCard key={item.key} card={item.building} />
              ) : (
                <PropertyCard key={item.key} card={item.property} />
              ),
            )}
          </div>
        </section>
      ) : null}

      <NeighborhoodsSection />
      <SellCta />
      <AboutSection />
    </main>
  );
}
