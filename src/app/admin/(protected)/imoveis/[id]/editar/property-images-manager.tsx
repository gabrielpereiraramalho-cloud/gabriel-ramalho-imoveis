"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";

import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGES_PER_PROPERTY,
  NORMALIZE_MAX_EDGE,
  NORMALIZE_QUALITY,
  isAllowedType,
  isHeic,
  isNormalizeUploadsEnabled,
  type ImageActionResult,
  type ManagedImage,
} from "./image-config";
import {
  deleteImage,
  reorderImages,
  setCoverImage,
  uploadImage,
} from "./image-actions";
import { normalizeImageFile } from "@/lib/images/normalize-image";

const MAX_MB = MAX_IMAGE_SIZE_BYTES / (1024 * 1024);

export function PropertyImagesManager({
  propertyId,
  initialImages,
}: {
  propertyId: string;
  initialImages: ManagedImage[];
}) {
  const [images, setImages] = useState<ManagedImage[]>(initialImages);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [sendOriginal, setSendOriginal] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const busy = uploading || pending;
  // Flag global (NEXT_PUBLIC_NORMALIZE_UPLOADS) + escolha do usuário por envio.
  const normalizeEnabled = isNormalizeUploadsEnabled();

  function apply(res: ImageActionResult) {
    setImages(res.images);
    if (res.error) setError(res.error);
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError("");
    setSuccess("");

    const files = Array.from(fileList);

    // Limite de quantidade antes de processar qualquer arquivo.
    if (images.length + files.length > MAX_IMAGES_PER_PROPERTY) {
      setError(
        `Limite de ${MAX_IMAGES_PER_PROPERTY} imagens por imóvel. ` +
          `Atualmente há ${images.length}.`,
      );
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    // Normaliza quando a flag global está ligada e o usuário não pediu original.
    const normalize = normalizeEnabled && !sendOriginal;

    setUploading(true);
    let ok = 0;
    const failed: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let toUpload: File = file;

      if (normalize) {
        setProgress(`Otimizando ${i + 1} de ${files.length}...`);
        try {
          const r = await normalizeImageFile(file, {
            maxEdge: NORMALIZE_MAX_EDGE,
            quality: NORMALIZE_QUALITY,
          });
          toUpload = r.file;
        } catch {
          // Normalização falhou.
          if (isAllowedType(file.type)) {
            // Formato já aceito pelo sistema → usa o original como fallback.
            toUpload = file;
          } else {
            // HEIC/HEIF (ou outro não aceito) que o navegador não converteu:
            // marca SOMENTE esta foto e segue com as demais — nunca envia cru.
            const kind = isHeic(file) ? "HEIC/HEIF" : file.type || "desconhecido";
            failed.push(
              `${file.name}: formato ${kind} não pôde ser convertido pelo navegador. ` +
                `Converta para JPEG/PNG/WEBP/AVIF e tente novamente.`,
            );
            continue;
          }
        }
      } else {
        // Sem normalização (flag off ou checkbox): mantém a validação atual.
        if (!isAllowedType(file.type)) {
          failed.push(`${file.name}: tipo não permitido.`);
          continue;
        }
      }

      // Validação de tamanho no arquivo FINAL (após eventual otimização).
      if (toUpload.size > MAX_IMAGE_SIZE_BYTES) {
        failed.push(
          `${file.name}: acima de ${MAX_MB} MB` +
            (normalize && toUpload !== file ? " mesmo após otimização." : "."),
        );
        continue;
      }

      setProgress(`Enviando ${i + 1} de ${files.length}...`);
      const fd = new FormData();
      fd.append("file", toUpload);
      const res = await uploadImage(propertyId, fd);
      setImages(res.images);
      if (res.error) {
        failed.push(`${file.name}: ${res.error}`);
      } else {
        ok += 1;
      }
    }

    setUploading(false);
    setProgress("");
    if (inputRef.current) inputRef.current.value = "";

    if (ok > 0) setSuccess(`${ok} imagem(ns) enviada(s) com sucesso.`);
    if (failed.length > 0) {
      setError(`Não enviadas (${failed.length}): ${failed.join(" | ")}`);
    }
  }

  function runAction(fn: () => Promise<ImageActionResult>) {
    setError("");
    setSuccess("");
    startTransition(async () => {
      const res = await fn();
      apply(res);
    });
  }

  function handleSetCover(imageId: string) {
    runAction(() => setCoverImage(propertyId, imageId));
  }

  function handleDelete(image: ManagedImage) {
    if (!confirm("Excluir esta foto? Esta ação é irreversível.")) return;
    runAction(() => deleteImage(propertyId, image.id));
  }

  function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    setImages(next); // otimista
    runAction(() =>
      reorderImages(
        propertyId,
        next.map((img) => img.id),
      ),
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="text-lg font-semibold tracking-tight">Fotos do imóvel</h2>

      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ALLOWED_IMAGE_TYPES.join(",")}
          disabled={busy}
          onChange={(e) => handleFiles(e.target.files)}
          className="text-sm"
        />
        <p className="text-xs text-zinc-500">
          JPEG, PNG, WEBP ou AVIF. Até {MAX_MB} MB por imagem, máximo de{" "}
          {MAX_IMAGES_PER_PROPERTY} imagens.
        </p>
        {normalizeEnabled ? (
          <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
            <input
              type="checkbox"
              checked={sendOriginal}
              onChange={(e) => setSendOriginal(e.target.checked)}
              disabled={busy}
            />
            Enviar original sem otimizar
          </label>
        ) : null}
        <p className="text-xs text-zinc-400">
          {normalizeEnabled && !sendOriginal
            ? `Otimização ligada: as fotos são ajustadas no navegador (máx. ${NORMALIZE_MAX_EDGE}px, WebP) antes do envio, preservando a aparência real.`
            : "Otimização desligada: as fotos serão enviadas no formato original."}
        </p>
      </div>

      {busy ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400" role="status">
          {progress || "Processando..."}
        </p>
      ) : null}
      {success ? <p className="text-sm text-green-600">{success}</p> : null}
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {images.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhuma foto cadastrada.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img, index) => (
            <div
              key={img.id}
              className="flex flex-col gap-2 rounded border border-zinc-200 p-2 dark:border-zinc-800"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded bg-zinc-100 dark:bg-zinc-900">
                <Image
                  src={img.url}
                  alt={img.alt_text ?? "Foto do imóvel"}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover"
                />
                {img.is_cover ? (
                  <span className="absolute left-1 top-1 rounded bg-zinc-900/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    Capa
                  </span>
                ) : null}
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Posição {index + 1}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleMove(index, -1)}
                    disabled={busy || index === 0}
                    aria-label="Mover para trás"
                    className="rounded border border-zinc-300 px-1.5 disabled:opacity-40 dark:border-zinc-700"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(index, 1)}
                    disabled={busy || index === images.length - 1}
                    aria-label="Mover para frente"
                    className="rounded border border-zinc-300 px-1.5 disabled:opacity-40 dark:border-zinc-700"
                  >
                    →
                  </button>
                </div>
              </div>

              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => handleSetCover(img.id)}
                  disabled={busy || img.is_cover}
                  className="flex-1 rounded border border-zinc-300 px-2 py-1 text-xs disabled:opacity-40 dark:border-zinc-700"
                >
                  {img.is_cover ? "É a capa" : "Definir como capa"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(img)}
                  disabled={busy}
                  className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 disabled:opacity-40 dark:border-red-800 dark:text-red-300"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
