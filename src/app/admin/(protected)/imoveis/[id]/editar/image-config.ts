/** Configurações e tipos compartilhados do gerenciamento de fotos. */

export const IMAGE_BUCKET = "property-images";

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_IMAGES_PER_PROPERTY = 40;

// --- Normalização client-side (Fase 1) --------------------------------------
/** Maior lado alvo (nunca amplia imagens menores). */
export const NORMALIZE_MAX_EDGE = 2560;
/** Qualidade WebP/JPEG (0..1). */
export const NORMALIZE_QUALITY = 0.82;

/**
 * Flag de otimização de upload. Ligada por padrão; defina
 * NEXT_PUBLIC_NORMALIZE_UPLOADS = 0 | false | off para desligar rapidamente
 * (volta ao comportamento atual: envia o arquivo original aceito).
 */
export function isNormalizeUploadsEnabled(): boolean {
  const v = (process.env.NEXT_PUBLIC_NORMALIZE_UPLOADS ?? "").trim().toLowerCase();
  return v !== "0" && v !== "false" && v !== "off" && v !== "no";
}

/** HEIC/HEIF (por MIME ou extensão) — formato não aceito pelo upload atual. */
export function isHeic(file: File): boolean {
  const t = (file.type || "").toLowerCase();
  if (t === "image/heic" || t === "image/heif") return true;
  return /\.(heic|heif)$/i.test(file.name);
}

export const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

/** Imagem já persistida, pronta para exibição no painel. */
export type ManagedImage = {
  id: string;
  storage_path: string;
  alt_text: string | null;
  sort_order: number;
  is_cover: boolean;
  url: string;
};

/** Resultado padrão das ações de imagem: lista atualizada + erro opcional. */
export type ImageActionResult = {
  images: ManagedImage[];
  error?: string;
};

export function isAllowedType(type: string): boolean {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(type);
}
