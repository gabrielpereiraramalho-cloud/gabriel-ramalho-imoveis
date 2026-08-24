"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import type { PropertyImage } from "@/lib/properties/queries";

const SWIPE_THRESHOLD = 40;

export function PropertyGallery({
  images,
  unoptimized = false,
}: {
  images: PropertyImage[];
  // Imagens de CDN externa já pré-dimensionada (ex.: Órulo) passam direto,
  // sem o Next Image Optimizer (evita dependência do allowlist de host).
  unoptimized?: boolean;
}) {
  const [active, setActive] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  const last = images.length - 1;
  const hasMultiple = images.length > 1;

  // ESC fecha e trava o scroll da página enquanto o fullscreen está aberto.
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
      else if (e.key === "ArrowRight")
        setActive((i) => Math.min(i + 1, images.length - 1));
      else if (e.key === "ArrowLeft")
        setActive((i) => Math.max(i - 1, 0));
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [fullscreen, images.length]);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[16/9] w-full items-center justify-center rounded-xl bg-offwhite text-sm text-zinc-400">
        Sem fotos disponíveis
      </div>
    );
  }

  const currentIndex = Math.min(active, last);
  const current = images[currentIndex];

  const go = (dir: -1 | 1) => {
    setActive((i) => Math.min(Math.max(Math.min(i, last) + dir, 0), last));
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      swiped.current = true;
      go(dx < 0 ? 1 : -1);
    }
  };

  const openFullscreen = () => {
    // Não abrir quando o toque foi um swipe (troca de foto), só no tap.
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    setFullscreen(true);
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative aspect-[4/3] w-full touch-pan-y overflow-hidden rounded-xl bg-offwhite sm:aspect-[16/10]"
        onTouchStart={hasMultiple ? onTouchStart : undefined}
        onTouchEnd={hasMultiple ? onTouchEnd : undefined}
      >
        <Image
          src={current.url}
          alt={current.alt}
          fill
          priority
          unoptimized={unoptimized}
          sizes="(max-width: 1024px) 100vw, 66vw"
          className="object-contain"
        />

        {/* Toque/clique amplia em tela cheia. */}
        <button
          type="button"
          onClick={openFullscreen}
          aria-label="Ampliar foto"
          className="absolute inset-0 z-10 cursor-zoom-in"
        />

        {hasMultiple ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              disabled={currentIndex === 0}
              aria-label="Foto anterior"
              className="absolute left-2 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-white/80 p-2 text-brand-navy shadow-sm transition hover:bg-white disabled:opacity-30 sm:flex"
            >
              <Arrow dir="left" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              disabled={currentIndex === last}
              aria-label="Próxima foto"
              className="absolute right-2 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-white/80 p-2 text-brand-navy shadow-sm transition hover:bg-white disabled:opacity-30 sm:flex"
            >
              <Arrow dir="right" />
            </button>
            <span className="absolute bottom-2 right-2 z-20 rounded-full bg-brand-navy/80 px-2.5 py-0.5 text-xs font-medium text-white">
              {currentIndex + 1} de {images.length}
            </span>
          </>
        ) : null}
      </div>

      {hasMultiple ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, index) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Ver foto ${index + 1}`}
              className={`relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-md border-2 ${
                index === currentIndex
                  ? "border-brand-navy"
                  : "border-transparent"
              }`}
            >
              <Image
                src={img.url}
                alt={img.alt}
                fill
                unoptimized={unoptimized}
                sizes="96px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}

      {fullscreen ? (
        <FullscreenGallery
          images={images}
          index={currentIndex}
          onIndex={setActive}
          onClose={() => setFullscreen(false)}
          unoptimized={unoptimized}
        />
      ) : null}
    </div>
  );
}

function FullscreenGallery({
  images,
  index,
  onIndex,
  onClose,
  unoptimized = false,
}: {
  images: PropertyImage[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  unoptimized?: boolean;
}) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const last = images.length - 1;
  const hasMultiple = images.length > 1;
  const current = images[Math.min(index, last)];

  const step = (dir: -1 | 1) => {
    onIndex(Math.min(Math.max(index + dir, 0), last));
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      step(dx < 0 ? 1 : -1);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label="Galeria de fotos"
    >
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-medium">
          {Math.min(index, last) + 1} de {images.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar galeria"
          className="rounded-full p-2 text-white/90 transition hover:bg-white/10"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div
        className="relative flex-1"
        onTouchStart={hasMultiple ? onTouchStart : undefined}
        onTouchEnd={hasMultiple ? onTouchEnd : undefined}
      >
        <Image
          src={current.url}
          alt={current.alt}
          fill
          unoptimized={unoptimized}
          sizes="100vw"
          className="object-contain"
        />

        {hasMultiple ? (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              disabled={index === 0}
              aria-label="Foto anterior"
              className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/15 p-2.5 text-white transition hover:bg-white/25 disabled:opacity-30 sm:flex"
            >
              <Arrow dir="left" />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              disabled={index === last}
              aria-label="Próxima foto"
              className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/15 p-2.5 text-white transition hover:bg-white/25 disabled:opacity-30 sm:flex"
            >
              <Arrow dir="right" />
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Arrow({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {dir === "left" ? (
        <path d="M15 18l-6-6 6-6" />
      ) : (
        <path d="M9 6l6 6-6 6" />
      )}
    </svg>
  );
}
