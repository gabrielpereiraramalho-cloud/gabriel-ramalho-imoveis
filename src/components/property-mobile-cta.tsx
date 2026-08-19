"use client";

import { siteConfig, whatsappUrl } from "@/lib/site";
import { formatBRL } from "@/lib/properties/format";
import {
  trackPropertyInterest,
  type TrackedProperty,
} from "@/lib/analytics/events";

/**
 * Barra fixa no rodapé da viewport (somente mobile) com preço + CTA de
 * interesse. Dispara `property_interest` (GA) + `Contact` (Meta) ao clicar.
 * Renderiza apenas se NEXT_PUBLIC_WHATSAPP_NUMBER estiver configurado.
 */
export function PropertyMobileCta({
  property,
}: {
  property: TrackedProperty;
}) {
  const href = whatsappUrl(
    `Olá, ${siteConfig.brand}! Vi o imóvel ${property.title} - código ${property.code} no seu site e gostaria de mais informações.`,
  );
  if (!href) return null;

  const priceLabel =
    property.price === null
      ? "Consulte"
      : property.purpose === "rent"
        ? `${formatBRL(property.price)}/mês`
        : formatBRL(property.price);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-navy/10 bg-white/95 backdrop-blur lg:hidden"
      style={{
        paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom))",
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 pt-2.5">
        <span className="text-lg font-semibold text-brand-navy">
          {priceLabel}
        </span>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackPropertyInterest(property)}
          className="shrink-0 rounded-md bg-brand-gold px-5 py-2.5 text-sm font-semibold text-brand-navy-dark transition-colors hover:bg-brand-gold-light"
        >
          Tenho interesse
        </a>
      </div>
    </div>
  );
}
