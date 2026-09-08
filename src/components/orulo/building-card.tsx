import Image from "next/image";
import Link from "next/link";

import type { OruloBuildingCard } from "@/lib/orulo/public-queries";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

function priceLabel(v: number | null): string {
  return v === null ? "Consulte" : `A partir de ${brl.format(v)}`;
}

function range(min: number | null, max: number | null, suffix = ""): string | null {
  if (min === null && max === null) return null;
  if (min !== null && max !== null && min !== max)
    return `${min}–${max}${suffix}`;
  return `${min ?? max}${suffix}`;
}

export function BuildingCard({ card }: { card: OruloBuildingCard }) {
  const meta = [card.neighborhood, card.city].filter(Boolean).join(", ");
  const beds = range(card.minBedrooms, card.maxBedrooms, " dorm.");
  const area = range(card.minArea, card.maxArea, " m²");

  return (
    <Link
      href={`/empreendimento/${card.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-offwhite">
        {card.coverUrl ? (
          <Image
            src={card.coverUrl}
            alt={card.name}
            fill
            unoptimized
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-zinc-400">
            Sem foto
          </div>
        )}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1.5 sm:left-3 sm:top-3 sm:gap-2">
          <span className="rounded-full bg-brand-gold px-2 py-0.5 text-[11px] font-semibold text-brand-navy-dark sm:px-2.5 sm:text-xs">
            Lançamento
          </span>
          {card.status ? (
            <span className="rounded-full bg-brand-navy/90 px-2 py-0.5 text-[11px] font-medium text-white sm:px-2.5 sm:text-xs">
              {card.status}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:gap-2 sm:p-5">
        <h3 className="line-clamp-2 font-serif text-base text-brand-navy sm:text-lg">
          {card.name}
        </h3>
        {card.developer ? (
          <p className="line-clamp-1 text-[11px] uppercase tracking-wide text-brand-gold sm:text-xs">
            {card.developer}
          </p>
        ) : null}
        {meta ? <p className="text-xs text-zinc-500 sm:text-sm">{meta}</p> : null}
        {[beds, area].filter(Boolean).length > 0 ? (
          <p className="text-xs text-zinc-600 sm:text-sm">
            {[beds, area].filter(Boolean).join(" · ")}
          </p>
        ) : null}
        <span className="mt-auto pt-1 text-base font-semibold text-brand-navy sm:pt-2 sm:text-lg">
          {priceLabel(card.minPrice)}
        </span>
      </div>
    </Link>
  );
}
