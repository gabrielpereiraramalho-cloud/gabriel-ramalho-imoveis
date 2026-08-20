import Image from "next/image";
import Link from "next/link";

import type {
  CityOption,
  NeighborhoodOption,
  PropertyCard,
} from "@/lib/properties/queries";
import { siteConfig, whatsappUrl } from "@/lib/site";
import { HeroSearch } from "@/components/hero-search";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { HeroShowcase } from "@/components/home/hero-showcase";

export function Hero({
  cities,
  neighborhoods,
  types,
  featured = [],
}: {
  cities: CityOption[];
  neighborhoods: NeighborhoodOption[];
  types: string[];
  featured?: PropertyCard[];
}) {
  const wa = whatsappUrl(
    `Olá, ${siteConfig.brand}! Gostaria de falar sobre imóveis.`,
  );

  return (
    <section className="bg-offwhite">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 py-12 lg:min-h-[560px] lg:grid-cols-2 lg:py-16">
          {/* Texto */}
          <div className="flex flex-col gap-6">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold">
              Imóveis em João Pessoa e região
            </span>
            <h1 className="font-serif text-4xl font-semibold leading-tight text-brand-navy sm:text-5xl">
              Encontre seu próximo imóvel em João Pessoa.
            </h1>
            <p className="max-w-xl text-base text-zinc-600 sm:text-lg">
              Uma seleção de imóveis para morar, investir e viver bem nas
              melhores regiões da cidade.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/imoveis"
                className="rounded-md bg-brand-gold px-6 py-3 text-sm font-semibold text-brand-navy-dark transition-colors hover:bg-brand-gold-light"
              >
                Ver imóveis
              </Link>
              {wa ? (
                <WhatsAppLink
                  href={wa}
                  source="hero"
                  className="rounded-md border border-brand-navy/25 px-6 py-3 text-sm font-semibold text-brand-navy transition-colors hover:bg-brand-navy hover:text-white"
                >
                  Falar com Gabriel
                </WhatsAppLink>
              ) : null}
            </div>
          </div>

          {/* Vitrine de imóveis em destaque (fallback: painel de imagem) */}
          {featured.length > 0 ? (
            <HeroShowcase items={featured} />
          ) : (
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg ring-1 ring-brand-navy/10 lg:aspect-[5/4]">
              <HeroImage />
            </div>
          )}
        </div>

        {/* Busca — barra horizontal elegante na base do Hero */}
        <div className="relative z-10 -mb-8 pb-2 lg:-mb-10">
          <HeroSearch cities={cities} neighborhoods={neighborhoods} types={types} />
        </div>
      </div>
    </section>
  );
}

/**
 * Painel de imagem do Hero. Enquanto /public/hero-imoveis.jpg não existir,
 * exibe apenas um painel navy neutro (sem marca/texto). Quando a foto existir,
 * ela cobre o painel com object-cover e um overlay navy muito discreto.
 */
function HeroImage() {
  return (
    <>
      <div className="absolute inset-0 bg-brand-navy" />
      <Image
        src="/hero-imoveis.jpg"
        alt="Imóveis em João Pessoa"
        fill
        priority
        sizes="(max-width: 1024px) 100vw, 640px"
        className="object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-brand-navy/5" />
    </>
  );
}
