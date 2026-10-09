import Image from "next/image";
import Link from "next/link";

import { brandLogoLight, siteConfig, whatsappUrl } from "@/lib/site";
import { WhatsAppLink } from "@/components/whatsapp-link";

const NAV_LINKS: { label: string; href: string }[] = [
  { label: "Início", href: "/" },
  { label: "Imóveis", href: "/imoveis" },
  { label: "Comprar", href: "/imoveis?finalidade=sale" },
  { label: "Alugar", href: "/imoveis?finalidade=rent" },
  { label: "Sobre", href: "/#sobre" },
  { label: "Política de Privacidade", href: "/politica-de-privacidade" },
];

export function SiteFooter() {
  const wa = whatsappUrl(
    `Olá! Gostaria de mais informações sobre os imóveis da ${siteConfig.brand}.`,
  );
  const year = new Date().getFullYear();

  const contacts: { label: string; href: string }[] = [];
  if (wa) contacts.push({ label: "WhatsApp", href: wa });
  if (siteConfig.instagramUrl)
    contacts.push({ label: "Instagram", href: siteConfig.instagramUrl });
  if (siteConfig.contactEmail)
    contacts.push({
      label: siteConfig.contactEmail,
      href: `mailto:${siteConfig.contactEmail}`,
    });

  return (
    <footer className="bg-brand-navy-dark text-offwhite">
      <div className="mx-auto grid w-full max-w-[1440px] gap-6 px-4 py-8 sm:grid-cols-2 sm:gap-8 sm:py-12 lg:grid-cols-3">
        <div className="flex flex-col gap-2.5">
          {/* Largura fixa + altura automática: preserva o aspect-ratio da logo
              e evita o esticamento que ocorria com w-auto dentro de flex-col
              (align-items: stretch deformava a largura). */}
          <Image
            src={brandLogoLight}
            alt={siteConfig.brand}
            width={2172}
            height={724}
            className="h-auto w-[160px] max-w-full"
          />
          <span className="text-xs tracking-wide text-brand-gold-light">
            {siteConfig.slogan}
          </span>
          {/* Responsabilidade profissional — o CRECI é pessoal do corretor,
              nunca apresentado como registro da empresa. */}
          <div className="mt-2.5 flex flex-col text-sm">
            <span className="text-xs font-semibold uppercase tracking-widest text-offwhite/60">
              Corretor responsável
            </span>
            <span className="text-offwhite/85">
              {siteConfig.responsibleBroker}
            </span>
            {siteConfig.creci ? (
              <span className="text-offwhite/70">{siteConfig.creci}</span>
            ) : null}
            <span className="text-offwhite/70">{siteConfig.city}</span>
          </div>
        </div>

        <nav className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-offwhite/60">
            Navegação
          </span>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-offwhite/85 transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {contacts.length > 0 ? (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-offwhite/60">
              Contato
            </span>
            {contacts.map((c) => {
              const cls =
                "text-sm text-offwhite/85 transition-colors hover:text-white";
              return c.label === "WhatsApp" ? (
                <WhatsAppLink
                  key={c.label}
                  href={c.href}
                  source="footer"
                  className={cls}
                >
                  {c.label}
                </WhatsAppLink>
              ) : (
                <a
                  key={c.label}
                  href={c.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cls}
                >
                  {c.label}
                </a>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="border-t border-white/10">
        <p className="mx-auto w-full max-w-[1440px] px-4 py-4 text-xs text-offwhite/60">
          © {year} {siteConfig.brand} · {siteConfig.slogan}
        </p>
      </div>
    </footer>
  );
}
