import type { PropertyPurpose } from "@/types/database";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export type WhatsAppSource =
  | "header"
  | "hero"
  | "about"
  | "sell_cta"
  | "footer";

/** Dados públicos do imóvel usados nos eventos (nenhum dado pessoal). */
export type TrackedProperty = {
  id: string;
  code: string;
  slug: string;
  title: string;
  propertyType: string;
  purpose: PropertyPurpose;
  cityName: string | null;
  neighborhoodName: string | null;
  price: number | null;
};

type GAParams = Record<string, string | number | boolean | null | undefined>;
type MetaParams = Record<string, unknown>;

/** Envia um evento ao GA4 (no-op se o gtag não estiver disponível). */
export function trackGAEvent(name: string, params: GAParams = {}): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", name, params);
}

/** Envia um evento ao Meta Pixel (no-op se o fbq não estiver disponível). */
export function trackMetaEvent(name: string, params: MetaParams = {}): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  window.fbq("track", name, params);
}

/** Visualização de imóvel: GA `view_property` + Meta `ViewContent`. */
export function trackPropertyView(p: TrackedProperty): void {
  trackGAEvent("view_property", {
    property_id: p.id,
    property_code: p.code,
    property_slug: p.slug,
    property_title: p.title,
    property_type: p.propertyType,
    property_purpose: p.purpose,
    property_city: p.cityName ?? undefined,
    property_neighborhood: p.neighborhoodName ?? undefined,
    property_price: p.price ?? undefined,
  });
  trackMetaEvent("ViewContent", {
    content_ids: [p.id],
    content_name: p.title,
    content_type: "property",
    ...(p.price !== null ? { value: p.price, currency: "BRL" } : {}),
  });
}

/** Interesse no imóvel (botão): GA `property_interest` + Meta `Contact`. */
export function trackPropertyInterest(p: TrackedProperty): void {
  trackGAEvent("property_interest", {
    property_id: p.id,
    property_code: p.code,
    property_slug: p.slug,
    property_title: p.title,
    property_price: p.price ?? undefined,
    destination: "whatsapp",
  });
  trackMetaEvent("Contact", {
    content_ids: [p.id],
    content_name: p.title,
    content_type: "property",
    ...(p.price !== null ? { value: p.price, currency: "BRL" } : {}),
  });
}

/** CTA geral de WhatsApp: GA `whatsapp_click` + Meta `Contact`. */
export function trackWhatsAppClick(source: WhatsAppSource): void {
  trackGAEvent("whatsapp_click", { source });
  trackMetaEvent("Contact", {});
}
