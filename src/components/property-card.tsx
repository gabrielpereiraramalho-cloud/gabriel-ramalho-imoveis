import Image from "next/image";
import Link from "next/link";

import type { PropertyCard as PropertyCardData } from "@/lib/properties/queries";
import { CARD_STATUS_LABELS } from "@/lib/properties/format";
import { PropertyPrice } from "./property-price";

function metaLine(card: PropertyCardData): string {
  return [card.neighborhoodName, card.cityName].filter(Boolean).join(", ");
}

export function PropertyCard({ card }: { card: PropertyCardData }) {
  // Selo comercial sempre presente (uniformiza a grade com os empreendimentos).
  const statusLabel =
    card.status !== "hidden" ? CARD_STATUS_LABELS[card.status] : "";
  const specs: string[] = [];
  if (card.privateArea !== null) specs.push(`${card.privateArea} m²`);
  if (card.bedrooms > 0) specs.push(`${card.bedrooms} quartos`);
  if (card.suites > 0) specs.push(`${card.suites} suítes`);
  if (card.parkingSpaces > 0) specs.push(`${card.parkingSpaces} vagas`);

  return (
    <Link
      href={`/imovel/${card.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-offwhite">
        {card.coverUrl ? (
          <Image
            src={card.coverUrl}
            alt={card.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-zinc-400">
            Sem foto
          </div>
        )}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1.5 sm:left-3 sm:top-3 sm:gap-2">
          {card.tag ? (
            <span className="rounded-full bg-brand-gold px-2 py-0.5 text-[11px] font-semibold text-brand-navy-dark sm:px-2.5 sm:text-xs">
              {card.tag}
            </span>
          ) : null}
          {statusLabel ? (
            <span className="rounded-full bg-brand-navy/90 px-2 py-0.5 text-[11px] font-medium text-white sm:px-2.5 sm:text-xs">
              {statusLabel}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:gap-2 sm:p-5">
        <h3 className="line-clamp-2 font-serif text-base text-brand-navy sm:text-lg">
          {card.title}
        </h3>
        {metaLine(card) ? (
          <p className="text-xs text-zinc-500 sm:text-sm">{metaLine(card)}</p>
        ) : null}
        {specs.length > 0 ? (
          <p className="text-xs text-zinc-600 sm:text-sm">{specs.join(" · ")}</p>
        ) : null}
        <PropertyPrice
          purpose={card.purpose}
          salePrice={card.salePrice}
          rentPrice={card.rentPrice}
          className="mt-auto pt-1 text-base font-semibold text-brand-navy sm:pt-2 sm:text-xl"
        />
      </div>
    </Link>
  );
}
