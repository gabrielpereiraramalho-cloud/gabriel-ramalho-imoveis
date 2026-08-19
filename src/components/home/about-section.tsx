import Image from "next/image";
import Link from "next/link";

import { siteConfig, whatsappUrl } from "@/lib/site";

export function AboutSection() {
  const wa = whatsappUrl(
    "Olá, Gabriel! Vim pelo seu site e gostaria de conversar sobre imóveis em João Pessoa.",
  );
  const professionalLine = siteConfig.creci
    ? `${siteConfig.role} • ${siteConfig.creci}`
    : siteConfig.role;

  return (
    <section id="sobre" className="scroll-mt-24 bg-white">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-14 lg:px-8">
        {/* Imagem (aparece primeiro no mobile) */}
        <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-lg bg-offwhite ring-1 ring-brand-navy/10 lg:mx-0">
          <AboutPhoto />
        </div>

        {/* Texto */}
        <div className="flex flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold">
            Sobre
          </span>
          <h2 className="font-serif text-2xl font-semibold text-brand-navy sm:text-3xl">
            Atendimento próximo, estratégia e conhecimento de mercado.
          </h2>
          <div className="flex flex-col">
            <span className="text-lg font-semibold text-brand-navy">
              {siteConfig.brand}
            </span>
            <span className="text-sm text-zinc-500">{professionalLine}</span>
          </div>
          <p className="text-zinc-700">
            Atendimento personalizado para quem busca comprar, vender ou
            investir em imóveis em João Pessoa e região. Meu objetivo é conduzir
            cada negociação com clareza, estratégia e segurança, desde a escolha
            do imóvel até a conclusão da compra ou venda.
          </p>
          <p className="text-zinc-700">
            Mais do que apresentar imóveis, busco entender o momento, o objetivo
            e o perfil de cada cliente para indicar oportunidades que realmente
            façam sentido.
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            {wa ? (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md bg-brand-navy px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-navy-dark"
              >
                Falar com Gabriel
              </a>
            ) : null}
            <Link
              href="/imoveis"
              className="rounded-md border border-brand-navy/25 px-6 py-3 text-sm font-semibold text-brand-navy transition-colors hover:bg-brand-navy hover:text-white"
            >
              Ver imóveis
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Foto do corretor com fallback elegante caso o arquivo não exista. */
function AboutPhoto() {
  return (
    <>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-serif text-2xl text-brand-navy/30">
          {siteConfig.brand}
        </span>
      </div>
      <Image
        src="/gabriel-corretor.jpeg"
        alt={`${siteConfig.brand} — ${siteConfig.role}`}
        fill
        sizes="(max-width: 1024px) 100vw, 384px"
        className="object-cover object-top"
      />
    </>
  );
}
