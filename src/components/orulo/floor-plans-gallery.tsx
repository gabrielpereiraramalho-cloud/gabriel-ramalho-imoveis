"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import type { OruloMedia } from "@/lib/orulo/public-queries";

const SWIPE_THRESHOLD = 40;

/**
 * Plantas do empreendimento com lightbox. O clique NÃO navega para o arquivo
 * (o CDN da Órulo serve as plantas como download); em vez disso, abre um modal
 * que exibe a imagem INLINE (mesma URL oficial da Órulo, sem reprocessar).
 * Fecha com X, clique fora e Esc; navega entre plantas com setas/teclado/swipe;
 * no mobile permite pinch-zoom (touch-action) na imagem ampliada.
 */
export function FloorPlansGallery({ plans }: { plans: OruloMedia[] }) {
  const [open, setOpen] = useState<number | null>(null);

  if (plans.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {plans.map((p, index) => (
        <button
          key={p.url}
          type="button"
          onClick={() => setOpen(index)}
          aria-label={`Ampliar ${p.alt || `planta ${index + 1}`}`}
          className="relative aspect-[3/4] cursor-zoom-in overflow-hidden rounded-lg border border-zinc-200 bg-white transition-shadow hover:shadow-md"
        >
          <Image
            src={p.thumb}
            alt={p.alt}
            fill
            unoptimized
            sizes="(max-width: 640px) 50vw, 33vw"
            className="object-contain"
          />
        </button>
      ))}

      {open !== null ? (
        <FloorPlanLightbox
          plans={plans}
          index={open}
          onIndex={setOpen}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </div>
  );
}

function FloorPlanLightbox({
  plans,
  index,
  onIndex,
  onClose,
}: {
  plans: OruloMedia[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const last = plans.length - 1;
  const hasMultiple = plans.length > 1;
  const current = plans[Math.min(index, last)];

  const step = (dir: -1 | 1) => {
    onIndex(Math.min(Math.max(index + dir, 0), last));
  };

  // Esc fecha; setas navegam; trava o scroll da página enquanto aberto.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, last]);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return; // deixa o pinch (2 dedos) para o zoom
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
      aria-label="Planta do empreendimento"
      onClick={onClose}
    >
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-medium">
          {hasMultiple ? `${Math.min(index, last) + 1} de ${plans.length}` : "Planta"}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
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

      {/* Área da imagem: clique fora (nesta área) fecha; a imagem para a
          propagação. overflow-auto + touch-action pinch-zoom habilita zoom. */}
      <div
        className="relative flex flex-1 items-center justify-center overflow-auto p-4"
        onTouchStart={hasMultiple ? onTouchStart : undefined}
        onTouchEnd={hasMultiple ? onTouchEnd : undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={current.alt}
          onClick={(e) => e.stopPropagation()}
          style={{ touchAction: "pinch-zoom" }}
          className="max-h-full max-w-full select-none object-contain"
        />

        {hasMultiple ? (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                step(-1);
              }}
              disabled={index === 0}
              aria-label="Planta anterior"
              className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/15 p-2.5 text-white transition hover:bg-white/25 disabled:opacity-30 sm:flex"
            >
              <Arrow dir="left" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                step(1);
              }}
              disabled={index === last}
              aria-label="Próxima planta"
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
      {dir === "left" ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 6l6 6-6 6" />}
    </svg>
  );
}
