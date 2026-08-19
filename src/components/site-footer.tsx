import Link from "next/link";

import { siteConfig, whatsappUrl } from "@/lib/site";
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
    `Olá, ${siteConfig.brand}! Gostaria de mais informações.`,
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
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:grid-cols-2 sm:gap-8 sm:py-12 lg:grid-cols-3">
        <div className="flex flex-col gap-1">
          <span className="font-serif text-xl font-semibold">
            {siteConfig.brand}
          </span>
          <span className="text-sm text-brand-gold-light">
            {siteConfig.role}
          </span>
          {siteConfig.creci ? (
            <span className="mt-2 text-sm text-offwhite/70">
              {siteConfig.creci}
            </span>
          ) : null}
          <span className="text-sm text-offwhite/70">{siteConfig.city}</span>
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
        <p className="mx-auto w-full max-w-7xl px-4 py-4 text-xs text-offwhite/60">
          © {year} {siteConfig.brand} · {siteConfig.role}
        </p>
      </div>
    </footer>
  );
}
