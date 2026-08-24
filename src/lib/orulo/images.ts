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

/**
 * Chave de dimensão da API Órulo correspondente a cada tamanho lógico.
 * O endpoint /buildings/{id}/images?dimensions[]=... devolve as URLs reais
 * (nome de arquivo em hash) sob estas chaves.
 */
const DIMENSION_KEY: Record<OruloImageSize, string> = {
  thumb: "200x140",
  card: "520x280",
  large: "1024x1024",
  xlarge: "2280x1800",
};

/** Todas as dimensões que solicitamos ao endpoint de mídia da Órulo. */
export const ORULO_MEDIA_DIMENSIONS = ["200x140", "520x280", "1024x1024", "2280x1800"];

/** Query string (Rails array) para pedir todas as dimensões de mídia. */
export const ORULO_MEDIA_DIMENSIONS_QS = ORULO_MEDIA_DIMENSIONS.map(
  (d) => `dimensions[]=${d}`,
).join("&");

/**
 * URL de uma mídia (imagem/planta) da Órulo.
 * Fonte primária: a URL real (hash) entregue pela API sob a chave de dimensão
 * (ex.: media["1024x1024"]). Só cai no método antigo — montar por `id` — quando
 * a URL não veio da API (mídia antiga, cujo nome de arquivo é o próprio id).
 */
export function oruloMediaUrl(
  media: Record<string, unknown> | null | undefined,
  size: OruloImageSize = "large",
): string {
  const direct = media?.[DIMENSION_KEY[size]];
  if (typeof direct === "string" && direct.startsWith("http")) return direct;
  const id = media?.id;
  return oruloImageUrl(
    typeof id === "string" || typeof id === "number" ? id : "",
    size,
  );
}
