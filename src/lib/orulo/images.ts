/**
 * Construção de URLs de imagens/plantas da Órulo (padrão confirmado na API).
 * Base: https://static.orulo.com.br/images/properties/{segmento}/{id}.jpg
 * Segmentos reais: thumb (200x140), featured_modern_without_watermark (520x280),
 * large (1024x1024), xlarge (2280x1800). Plantas usam o mesmo padrão.
 */
export type OruloImageSize = "thumb" | "card" | "large" | "xlarge";

const SEGMENT: Record<OruloImageSize, string> = {
  thumb: "thumb",
  card: "featured_modern_without_watermark",
  large: "large",
  xlarge: "xlarge",
};

const STATIC_BASE = "https://static.orulo.com.br/images/properties";

export function oruloImageUrl(
  id: string | number,
  size: OruloImageSize = "large",
): string {
  return `${STATIC_BASE}/${SEGMENT[size]}/${id}.jpg`;
}
