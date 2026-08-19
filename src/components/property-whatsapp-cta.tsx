"use client";

import { siteConfig, whatsappUrl } from "@/lib/site";
import {
  trackPropertyInterest,
  type TrackedProperty,
} from "@/lib/analytics/events";

/**
 * CTA de interesse no imóvel (sidebar). Dispara `property_interest` (GA) +
 * `Contact` (Meta) antes de abrir o WhatsApp. Oculto se não houver número.
 */
export function PropertyWhatsappCta({
  property,
}: {
  property: TrackedProperty;
}) {
  const href = whatsappUrl(
    `Olá, ${siteConfig.brand}! Vi o imóvel ${property.title} - código ${property.code} no seu site e gostaria de mais informações.`,
  );
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackPropertyInterest(property)}
      className="inline-flex items-center justify-center rounded-lg bg-brand-navy px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-navy-dark"
    >
      Tenho interesse neste imóvel
    </a>
  );
}
