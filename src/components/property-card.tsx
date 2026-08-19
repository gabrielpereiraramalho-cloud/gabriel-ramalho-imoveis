import Image from "next/image";
import Link from "next/link";

import type { PropertyCard as PropertyCardData } from "@/lib/properties/queries";
import { HIGHLIGHTED_STATUSES, STATUS_LABELS } from "@/lib/properties/format";
import { PropertyPrice } from "./property-price";

function metaLine(card: PropertyCardData): string {
  return [card.neighborhoodName, card.cityName].filter(Boolean).join(", ");
}

export function PropertyCard({ card }: { card: PropertyCardData }) {
  const showStatus = HIGHLIGHTED_STATUSES.includes(card.status);
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
        <div className="absolute left-3 top-3 flex gap-2">
          {card.tag ? (
            <span className="rounded-full bg-brand-gold px-2.5 py-0.5 text-xs font-semibold text-brand-navy-dark">
              {card.tag}
            </span>
          ) : null}
          {showStatus ? (
            <span className="rounded-full bg-brand-navy/90 px-2.5 py-0.5 text-xs font-medium text-white">
              {STATUS_LABELS[card.status]}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="line-clamp-2 font-serif text-lg text-brand-navy">
          {card.title}
        </h3>
        {metaLine(card) ? (
          <p className="text-sm text-zinc-500">{metaLine(card)}</p>
        ) : null}
        {specs.length > 0 ? (
          <p className="text-sm text-zinc-600">{specs.join(" · ")}</p>
        ) : null}
        <PropertyPrice
          purpose={card.purpose}
          salePrice={card.salePrice}
          rentPrice={card.rentPrice}
          className="mt-auto pt-2 text-xl font-semibold text-brand-navy"
        />
      </div>
    </Link>
  );
}
