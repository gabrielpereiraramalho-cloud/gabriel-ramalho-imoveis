"use client";

/**
 * Normalização de imagem no NAVEGADOR (Canvas) — camada de auxílio ao cadastro
 * manual de imóveis. Client-side, sem dependências externas e sem custo de API.
 *
 * O que faz (apenas transformações mecânicas — nunca edita a cena):
 *   - corrige a orientação (EXIF) ao decodificar;
 *   - reduz a imagem para que o MAIOR lado seja no máximo `maxEdge` (nunca amplia);
 *   - preserva a proporção (sem corte/distorção);
 *   - exporta em WebP (fallback JPEG), com qualidade configurável.
 *
 * O que NÃO faz: não adiciona/remove/altera elementos, não aplica filtros,
 * nitidez, saturação ou recorte. A aparência real do imóvel é preservada.
 *
 * Em caso de falha de decodificação/codificação (ex.: HEIC/HEIF que o navegador
 * não consegue converter), lança `ImageProcessingError`. Quem chama decide a
 * política (ver property-images-manager): formatos já aceitos pelo sistema podem
 * cair no original; HEIC não aceito é marcado como "não processado".
 */

export const DEFAULT_MAX_EDGE = 2560;
export const DEFAULT_QUALITY = 0.82;

export type ImageOrientation = "landscape" | "portrait" | "square";

export type NormalizeResult = {
  /** Arquivo final (WebP/JPEG) ou o próprio original quando não há ganho. */
  file: File;
  width: number;
  height: number;
  orientation: ImageOrientation;
  originalBytes: number;
  outputBytes: number;
  /** false = devolveu o original (sem necessidade de reescalar/reencodar). */
  normalized: boolean;
  outputType: string;
};

export class ImageProcessingError extends Error {
  stage: "decode" | "encode";
  constructor(stage: "decode" | "encode", message: string) {
    super(message);
    this.name = "ImageProcessingError";
    this.stage = stage;
  }
}

export type NormalizeOptions = { maxEdge?: number; quality?: number };

type Decoded = {
  width: number;
  height: number;
  source: CanvasImageSource;
  cleanup: () => void;
};

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("falha ao carregar a imagem"));
    el.src = url;
  });
}

/**
 * Decodifica o arquivo já com a orientação do EXIF aplicada.
 * 1) createImageBitmap({ imageOrientation: "from-image" }) — rotaciona pelo EXIF.
 * 2) fallback para HTMLImageElement (navegadores modernos honram EXIF por padrão).
 * Lança ImageProcessingError("decode") se nenhum caminho conseguir decodificar.
 */
async function decode(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
      return {
        width: bmp.width,
        height: bmp.height,
        source: bmp,
        cleanup: () => bmp.close?.(),
      };
    } catch {
      // Cai para o fallback de <img> abaixo.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImageElement(url);
    if (!img.naturalWidth || !img.naturalHeight) {
      throw new Error("dimensões inválidas");
    }
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      source: img,
      cleanup: () => URL.revokeObjectURL(url),
    };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw new ImageProcessingError(
      "decode",
      err instanceof Error ? err.message : "falha ao decodificar",
    );
  }
}

function get2dContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new ImageProcessingError("encode", "contexto 2D indisponível");
  }
  return ctx;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}

/**
 * Desenha a fonte já no tamanho de destino (uma etapa, leve em memória — melhor
 * para o celular) com reamostragem de alta qualidade e exporta WebP (fallback
 * JPEG). Retorna o Blob final.
 */
async function drawAndEncode(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
  quality: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = dstW;
  canvas.height = dstH;
  const ctx = get2dContext(canvas);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, srcW, srcH, 0, 0, dstW, dstH);

  const webp = await canvasToBlob(canvas, "image/webp", quality);
  if (webp && webp.type === "image/webp") return webp;

  const jpeg = await canvasToBlob(canvas, "image/jpeg", quality);
  if (jpeg) return jpeg;

  throw new ImageProcessingError("encode", "não foi possível gerar o blob");
}

/**
 * Normaliza um arquivo de imagem no navegador. Ver o cabeçalho do módulo.
 * Lança ImageProcessingError quando não consegue decodificar/codificar.
 */
export async function normalizeImageFile(
  file: File,
  opts: NormalizeOptions = {},
): Promise<NormalizeResult> {
  const maxEdge = opts.maxEdge ?? DEFAULT_MAX_EDGE;
  const quality = opts.quality ?? DEFAULT_QUALITY;
  const originalBytes = file.size;

  const dec = await decode(file);
  try {
    const { width: srcW, height: srcH } = dec;
    const longest = Math.max(srcW, srcH);
    // Nunca amplia: escala só quando o maior lado passa de maxEdge.
    const scale = longest > maxEdge ? maxEdge / longest : 1;
    const dstW = Math.max(1, Math.round(srcW * scale));
    const dstH = Math.max(1, Math.round(srcH * scale));

    const blob = await drawAndEncode(dec.source, srcW, srcH, dstW, dstH, quality);

    const orientation: ImageOrientation =
      dstW > dstH ? "landscape" : dstW < dstH ? "portrait" : "square";

    // Não piorar: se não houve redução e o resultado ficou >= original, e o
    // original já é um formato web leve (JPEG/WEBP), mantém o original.
    if (
      scale === 1 &&
      blob.size >= originalBytes &&
      (file.type === "image/jpeg" || file.type === "image/webp")
    ) {
      return {
        file,
        width: srcW,
        height: srcH,
        orientation,
        originalBytes,
        outputBytes: originalBytes,
        normalized: false,
        outputType: file.type,
      };
    }

    const ext = blob.type === "image/webp" ? "webp" : "jpg";
    const base = file.name.replace(/\.[^.]+$/, "") || "foto";
    const out = new File([blob], `${base}.${ext}`, { type: blob.type });

    return {
      file: out,
      width: dstW,
      height: dstH,
      orientation,
      originalBytes,
      outputBytes: out.size,
      normalized: true,
      outputType: blob.type,
    };
  } finally {
    dec.cleanup();
  }
}
