import Link from "next/link";

import { siteConfig, whatsappUrl } from "@/lib/site";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { PartnerPhoto } from "@/components/home/partner-photo";

type Partner = {
  name: string;
  initials: string;
  photo: string;
  roles: string[];
  /** Enquadramento do rosto p/ alinhar as duas fotos (object-position). */
  objectPosition: string;
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
      objectPosition: "50% 16%",
    },
    {
      name: "Philipe Ramalho",
      initials: "PR",
      photo: "/philipe-ramalho-socio.jpeg",
      roles: [
        "Gestão e Desenvolvimento de Negócios",
        "Formação em Transações Imobiliárias em andamento",
      ],
      objectPosition: "50% 28%",
    },
  ];

  const wa = whatsappUrl(
    "Olá! Gostaria de mais informações sobre os imóveis.",
  );

  return (
    <section id="sobre" className="scroll-mt-24 bg-white">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        {/* Cabeçalho institucional */}
        <div className="flex max-w-3xl flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold">
            Atendimento
          </span>
          <h2 className="font-serif text-3xl font-semibold text-brand-navy sm:text-4xl">
            Quem atende você
          </h2>
          <p className="text-zinc-700">
            Experiência técnica, visão de negócio e relacionamento para conectar
            você às melhores oportunidades imobiliárias em{" "}
            {siteConfig.addressLocality} e região.
          </p>
        </div>

        {/* Sócios — cards padronizados (mesma altura, mesma foto, mesmo ritmo).
            2 colunas só a partir de lg; no tablet fica 1 coluna larga (sem aperto). */}
        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2 lg:gap-8">
          {partners.map((p) => (
            <article
              key={p.name}
              className="flex h-full flex-col items-center gap-5 rounded-xl border border-brand-navy/10 bg-offwhite/40 p-5 text-center sm:flex-row sm:items-center sm:gap-6 sm:p-6 sm:text-left"
            >
              <div className="relative aspect-[4/5] w-36 shrink-0 overflow-hidden rounded-lg ring-1 ring-brand-navy/10 sm:w-40">
                <PartnerPhoto
                  src={p.photo}
                  alt={p.name}
                  initials={p.initials}
                  objectPosition={p.objectPosition}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="font-serif text-xl font-semibold text-brand-navy">
                  {p.name}
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

        {/* CTA institucional — full-width no mobile, inline no desktop */}
        <div className="flex flex-col gap-3 sm:flex-row">
          {wa ? (
            <WhatsAppLink
              href={wa}
              source="about"
              className="w-full rounded-md bg-brand-navy px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-navy-dark sm:w-auto"
            >
              Falar com Gabriel
            </WhatsAppLink>
          ) : null}
          <Link
            href="/imoveis"
            className="w-full rounded-md border border-brand-navy/25 px-6 py-3 text-center text-sm font-semibold text-brand-navy transition-colors hover:bg-brand-navy hover:text-white sm:w-auto"
          >
            Ver imóveis
          </Link>
        </div>
      </div>
    </section>
  );
}
