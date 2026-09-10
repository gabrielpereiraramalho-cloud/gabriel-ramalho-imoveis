/**
 * Configurações públicas do site, lidas de variáveis NEXT_PUBLIC_*
 * (disponíveis em Server e Client Components). Valores ausentes ficam vazios
 * e devem ser tratados como "não exibir".
 */

const onlyDigits = (v: string | undefined): string => (v ?? "").replace(/\D/g, "");

/** URL base do site (sem barra final). Em produção use NEXT_PUBLIC_SITE_URL;
 *  o fallback é o domínio oficial (usado no metadataBase/Open Graph). */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://gabrielramalhoimoveis.com.br"
).replace(/\/+$/, "");

export const siteConfig = {
  brand: "Gabriel Ramalho",
  role: "Corretor de Imóveis",
  city: "João Pessoa – PB",
  addressLocality: "João Pessoa",
  addressRegion: "PB",
  whatsappNumber: onlyDigits(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER),
  instagramUrl: process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
  creci: process.env.NEXT_PUBLIC_CRECI ?? "",
  gaMeasurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "",
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "",
};

/** Converte um caminho relativo em URL absoluta com base em siteUrl. */
export function absoluteUrl(path: string): string {
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Imagem Open Graph padrão do site (caminho absoluto). */
export const defaultOgImage = absoluteUrl("/og-default.png");

/** Imagem Open Graph premium da HOME (1200x630), URL absoluta. */
export const homeOgImage = absoluteUrl("/og-home.png");

/**
 * Serializa dados para JSON-LD de forma segura (escapa `<` para evitar
 * fechamento indevido de `</script>`). Os dados são construídos no servidor.
 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** Monta a URL do WhatsApp com a mensagem; retorna null se não houver número. */
export function whatsappUrl(message: string): string | null {
  if (!siteConfig.whatsappNumber) return null;
  return `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

/**
 * URL de COMPARTILHAMENTO do WhatsApp (sem número): abre o WhatsApp com a
 * mensagem pronta para o usuário escolher com qual contato compartilhar. Não
 * depende do número da imobiliária — serve para enviar o imóvel a um cliente.
 */
export function whatsappShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/**
 * Monta a mensagem de compartilhamento de um imóvel/empreendimento:
 * intro, "título — localização", preço e URL pública, uma por linha. Campos
 * vazios (localização/preço) são omitidos.
 */
export function buildShareMessage(parts: {
  intro: string;
  title: string;
  location?: string | null;
  price?: string | null;
  url: string;
}): string {
  const heading = parts.location
    ? `${parts.title} — ${parts.location}`
    : parts.title;
  return [parts.intro, heading, parts.price, parts.url]
    .filter(Boolean)
    .join("\n");
}
