import Link from "next/link";

import { siteConfig, whatsappUrl } from "@/lib/site";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { PartnerPhoto } from "@/components/home/partner-photo";

type Partner = {
  name: string;
  initials: string;
  photo: string;
  roles: string[];
};

/**
 * Seção institucional dos sócios da Ramalho Nexo (substitui a antiga "Sobre
 * Gabriel"). Gabriel é o corretor responsável (CRECI pessoal); Philipe atua em
 * gestão/negócios e NÃO é apresentado como corretor.
 */
export function AboutSection() {
  const partners: Partner[] = [
    {
      name: "Gabriel Ramalho",
      initials: "GR",
      photo: "/gabriel-corretor.jpeg",
      roles: [`${siteConfig.brokerRole} — ${siteConfig.creci}`, "Engenheiro Civil"],
    },
    {
      name: "Philipe Ramalho",
      initials: "PR",
      photo: "/philipe-ramalho-socio.jpeg",
      roles: [
        "Gestão e Desenvolvimento de Negócios",
        "Formação em Transações Imobiliárias em andamento",
      ],
    },
  ];

  const wa = whatsappUrl(
    `Olá! Gostaria de mais informações sobre os imóveis da ${siteConfig.brand}.`,
  );

  return (
    <section id="sobre" className="scroll-mt-24 bg-white">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        {/* Cabeçalho institucional */}
        <div className="flex max-w-3xl flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold">
            A {siteConfig.brand}
          </span>
          <h2 className="font-serif text-3xl font-semibold text-brand-navy sm:text-4xl">
            Quem está à frente da {siteConfig.brand}
          </h2>
          <p className="text-zinc-700">
            A {siteConfig.brand} une experiência técnica, visão de negócio e
            relacionamento para conectar pessoas às melhores oportunidades
            imobiliárias em {siteConfig.addressLocality} e região.
          </p>
        </div>

        {/* Sócios */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8">
          {partners.map((p) => (
            <article
              key={p.name}
              className="flex flex-col gap-5 rounded-xl border border-brand-navy/10 bg-offwhite/40 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6"
            >
              <div className="relative aspect-[4/5] w-full max-w-[220px] shrink-0 self-center overflow-hidden rounded-lg ring-1 ring-brand-navy/10 sm:w-40">
                <PartnerPhoto src={p.photo} alt={`${p.name} — ${siteConfig.brand}`} initials={p.initials} />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="font-serif text-xl font-semibold text-brand-navy">
                  {p.name}
                </span>
                <span className="text-xs font-semibold uppercase tracking-widest text-brand-gold">
                  Sócio-fundador
                </span>
                <div className="mt-1 flex flex-col gap-0.5 text-sm text-zinc-600">
                  {p.roles.map((r) => (
                    <span key={r}>{r}</span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* CTA institucional */}
        <div className="flex flex-wrap gap-3">
          {wa ? (
            <WhatsAppLink
              href={wa}
              source="about"
              className="rounded-md bg-brand-navy px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-navy-dark"
            >
              Fale com a {siteConfig.brand}
            </WhatsAppLink>
          ) : null}
          <Link
            href="/imoveis"
            className="rounded-md border border-brand-navy/25 px-6 py-3 text-sm font-semibold text-brand-navy transition-colors hover:bg-brand-navy hover:text-white"
          >
            Ver imóveis
          </Link>
        </div>
      </div>
    </section>
  );
}
