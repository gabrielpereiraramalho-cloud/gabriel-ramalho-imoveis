/**
 * Configurações públicas do site, lidas de variáveis NEXT_PUBLIC_*
 * (disponíveis em Server e Client Components). Valores ausentes ficam vazios
 * e devem ser tratados como "não exibir".
 */

const onlyDigits = (v: string | undefined): string => (v ?? "").replace(/\D/g, "");

/** URL base do site (sem barra final). Em produção use NEXT_PUBLIC_SITE_URL;
 *  o fallback é o domínio canônico oficial (usado no metadataBase/Open Graph). */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ramalhonexo.com.br"
).replace(/\/+$/, "");

export const siteConfig = {
  /** Marca/empresa pública. */
  brand: "Ramalho Nexo",
  /** Assinatura institucional (segmento), exibida junto da marca. */
  signature: "Negócios Imobiliários",
  slogan: "Imóveis que conectam você ao amanhã",
  city: "João Pessoa – PB",
  addressLocality: "João Pessoa",
  addressRegion: "PB",
  /**
   * Corretor responsável (PESSOA FÍSICA). O CRECI é pessoal do Gabriel — nunca
   * da empresa (não há CRECI-J da Ramalho Nexo nesta fase).
   */
  responsibleBroker: "Gabriel Ramalho",
  brokerRole: "Corretor de Imóveis",
  creci: process.env.NEXT_PUBLIC_CRECI || "CRECI-PB 19875",
  whatsappNumber: onlyDigits(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER),
  instagramUrl: process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
  gaMeasurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "",
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "",
};

/** Converte um caminho relativo em URL absoluta com base em siteUrl. */
export function absoluteUrl(path: string): string {
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Assets de marca Ramalho Nexo (em /public). */
export const brandLogoHeader =
  "/logo-ramalho-nexo-horizontal-transparente-escura.png"; // fundo claro
export const brandLogoLight =
  "/logo-ramalho-nexo-horizontal-transparente-clara.png"; // fundo escuro
export const brandSymbol = "/simbolo-rn-transparente.png";
export const brandSeal = "/selo-ramalho-nexo-transparente.png";

/** Imagem Open Graph padrão do site (1200x630, caminho absoluto). */
export const defaultOgImage = absoluteUrl("/og-default-ramalho-nexo-1200x630.png");

/** Imagem Open Graph premium da HOME (1200x630, URL absoluta). */
export const homeOgImage = absoluteUrl("/og-home-ramalho-nexo-1200x630.png");

/** Logo absoluta da marca (para JSON-LD / dados estruturados). */
export const brandLogoAbsolute = absoluteUrl(brandLogoHeader);

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
  // Assinatura discreta ao final (não altera URL, tracking nem o evento).
  return [parts.intro, heading, parts.price, parts.url, `via ${siteConfig.brand}`]
    .filter(Boolean)
    .join("\n");
}
