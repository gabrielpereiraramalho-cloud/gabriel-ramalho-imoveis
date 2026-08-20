"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import type { PropertyCard } from "@/lib/properties/queries";
import { PropertyPrice } from "@/components/property-price";

const SWIPE_THRESHOLD = 40;
const AUTOPLAY_MS = 6000;
const INTERACTION_PAUSE_MS = 8000;

/** Preferência do usuário por menos movimento (sem flicker de hidratação). */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/** Visibilidade da aba/janela. */
function useDocumentVisible(): boolean {
  return useSyncExternalStore(
    (cb) => {
      document.addEventListener("visibilitychange", cb);
      return () => document.removeEventListener("visibilitychange", cb);
    },
    () => !document.hidden,
    () => true,
  );
}

/**
 * Vitrine do Hero: carrossel leve com até 3 imóveis em destaque.
 * Autoplay discreto (6s) que pausa em hover/interação/aba oculta e respeita
 * prefers-reduced-motion. Cada slide é clicável; setas no desktop e swipe no
 * mobile. Primeira imagem com priority para preservar o LCP.
 */
export function HeroShowcase({ items }: { items: PropertyCard[] }) {
  const [index, setIndex] = useState(0);
  const [hover, setHover] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const interactTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = usePrefersReducedMotion();
  const visible = useDocumentVisible();

  const last = items.length - 1;
  const hasMultiple = items.length > 1;

  const autoplayOn =
    hasMultiple && !reduceMotion && !hover && !interacting && visible;

  // Autoplay: avança em loop (último → primeiro).
  useEffect(() => {
    if (!autoplayOn) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [autoplayOn, items.length]);

  useEffect(() => {
    return () => {
      if (interactTimer.current) clearTimeout(interactTimer.current);
    };
  }, []);

  // Pausa temporária após interação manual; retoma após alguns segundos.
  const pauseForInteraction = () => {
    setInteracting(true);
    if (interactTimer.current) clearTimeout(interactTimer.current);
    interactTimer.current = setTimeout(
      () => setInteracting(false),
      INTERACTION_PAUSE_MS,
    );
  };

  const go = (dir: -1 | 1) => {
    setIndex((i) => Math.min(Math.max(i + dir, 0), last));
  };
  const handleArrow = (dir: -1 | 1) => {
    pauseForInteraction();
    go(dir);
  };
  const handleDot = (i: number) => {
    pauseForInteraction();
    setIndex(i);
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
      pauseForInteraction();
      go(dx < 0 ? 1 : -1);
    }
  };
  // Evita abrir o imóvel quando o toque foi um swipe (e não um tap).
  const onClickCapture = (e: React.MouseEvent) => {
    if (swiped.current) {
      e.preventDefault();
      e.stopPropagation();
      swiped.current = false;
    }
  };

  return (
    <div
      className="relative aspect-[4/3] w-full overflow-hidden rounded-lg ring-1 ring-brand-navy/10 lg:aspect-[5/4]"
      onTouchStart={hasMultiple ? onTouchStart : undefined}
      onTouchEnd={hasMultiple ? onTouchEnd : undefined}
      onClickCapture={onClickCapture}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-roledescription="carrossel"
      aria-label="Imóveis em destaque"
    >
      <div
        className="flex h-full transition-transform duration-500 ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {items.map((card, i) => {
          const meta = [card.neighborhoodName, card.cityName]
            .filter(Boolean)
            .join(", ");
          return (
            <Link
              key={card.id}
              href={`/imovel/${card.slug}`}
              className="relative block h-full w-full shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold"
              aria-hidden={i !== index}
              tabIndex={i === index ? 0 : -1}
            >
              <div className="absolute inset-0 bg-brand-navy" />
              {card.coverUrl ? (
                <Image
                  src={card.coverUrl}
                  alt={card.title}
                  fill
                  priority={i === 0}
                  sizes="(max-width: 1024px) 100vw, 640px"
                  className="object-cover"
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-brand-navy-dark/85 via-brand-navy-dark/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-5 text-offwhite">
                <h3 className="font-serif text-xl font-semibold sm:text-2xl">
                  {card.title}
                </h3>
                {meta ? (
                  <p className="text-sm text-offwhite/85">{meta}</p>
                ) : null}
                <PropertyPrice
                  purpose={card.purpose}
                  salePrice={card.salePrice}
                  rentPrice={card.rentPrice}
                  className="text-lg font-semibold text-brand-gold-light"
                />
                <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                  Ver imóvel →
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {hasMultiple ? (
        <>
          <button
            type="button"
            onClick={() => handleArrow(-1)}
            disabled={index === 0}
            aria-label="Imóvel anterior"
            className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/80 p-2 text-brand-navy shadow-sm transition hover:bg-white disabled:opacity-30 sm:flex"
          >
            <Chevron dir="left" />
          </button>
          <button
            type="button"
            onClick={() => handleArrow(1)}
            disabled={index === last}
            aria-label="Próximo imóvel"
            className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/80 p-2 text-brand-navy shadow-sm transition hover:bg-white disabled:opacity-30 sm:flex"
          >
            <Chevron dir="right" />
          </button>

          <div className="absolute left-1/2 top-3 flex -translate-x-1/2 gap-1.5">
            {items.map((card, i) => (
              <button
                key={card.id}
                type="button"
                onClick={() => handleDot(i)}
                aria-label={`Ir para o imóvel ${i + 1}`}
                aria-current={i === index}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-5 bg-white" : "w-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
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
