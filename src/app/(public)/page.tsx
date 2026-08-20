import type { Metadata } from "next";
import Link from "next/link";

import {
  getFeaturedProperties,
  getPropertyFilterOptions,
  listPublicProperties,
} from "@/lib/properties/queries";
import {
  absoluteUrl,
  defaultOgImage,
  jsonLdScript,
  siteConfig,
  siteUrl,
} from "@/lib/site";
import { FeaturedProperties } from "@/components/home/featured-properties";
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
  const [options, featured] = await Promise.all([
    getPropertyFilterOptions(),
    getFeaturedProperties(6),
  ]);

  // Fallback elegante: sem destaques, mostra os imóveis públicos mais recentes.
  const highlights =
    featured.length > 0
      ? featured
      : (await listPublicProperties({})).slice(0, 6);
  const highlightsTitle =
    featured.length > 0 ? "Imóveis em destaque" : "Imóveis disponíveis";

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
        featured={featured.slice(0, 3)}
      />

      {highlights.length > 0 ? (
        <section className="mx-auto w-full max-w-7xl px-4 pb-16 pt-20 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-brand-gold">
                Seleção
              </span>
              <h2 className="font-serif text-2xl font-semibold text-brand-navy sm:text-3xl">
                {highlightsTitle}
              </h2>
            </div>
            <Link
              href="/imoveis"
              className="text-sm font-medium text-brand-navy hover:text-brand-gold"
            >
              Ver todos os imóveis →
            </Link>
          </div>

          <FeaturedProperties items={highlights} />
        </section>
      ) : null}

      <NeighborhoodsSection />
      <SellCta />
      <AboutSection />
    </main>
  );
}
