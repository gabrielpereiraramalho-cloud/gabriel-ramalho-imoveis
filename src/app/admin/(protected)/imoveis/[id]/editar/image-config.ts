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
