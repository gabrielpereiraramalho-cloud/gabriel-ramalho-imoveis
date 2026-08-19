import Image from "next/image";
import Link from "next/link";

import type { PropertyCard as PropertyCardData } from "@/lib/properties/queries";
import { HIGHLIGHTED_STATUSES, STATUS_LABELS } from "@/lib/properties/format";
import { PropertyCard } from "@/components/property-card";
import { PropertyPrice } from "@/components/property-price";

/**
 * Renderiza os imóveis em destaque de forma elegante conforme a quantidade:
 * 1 → card horizontal maior; 2 → duas colunas; 3+ → grid padrão.
 */
export function FeaturedProperties({
  items,
}: {
  items: PropertyCardData[];
}) {
  if (items.length === 0) return null;

  if (items.length === 1) {
    return <SingleFeature card={items[0]} />;
  }

  const cols =
    items.length === 2
      ? "sm:grid-cols-2"
      : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={`grid grid-cols-1 gap-6 ${cols}`}>
      {items.map((card) => (
        <PropertyCard key={card.id} card={card} />
      ))}
    </div>
  );
}

function SingleFeature({ card }: { card: PropertyCardData }) {
  const meta = [card.neighborhoodName, card.cityName]
    .filter(Boolean)
    .join(", ");
  const showStatus = HIGHLIGHTED_STATUSES.includes(card.status);
  const specs: string[] = [];
  if (card.privateArea !== null) specs.push(`${card.privateArea} m²`);
  if (card.bedrooms > 0) specs.push(`${card.bedrooms} quartos`);
  if (card.suites > 0) specs.push(`${card.suites} suítes`);
  if (card.parkingSpaces > 0) specs.push(`${card.parkingSpaces} vagas`);

  return (
    <Link
      href={`/imovel/${card.slug}`}
      className="group mx-auto grid w-full max-w-4xl overflow-hidden rounded-lg border border-zinc-200 bg-white transition-shadow hover:shadow-md md:grid-cols-2"
    >
      <div className="relative min-h-[240px] bg-offwhite md:min-h-[340px]">
        {card.coverUrl ? (
          <Image
            src={card.coverUrl}
            alt={card.title}
            fill
            sizes="(max-width: 768px) 100vw, 512px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
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

      <div className="flex flex-col gap-3 p-6 sm:p-8">
        <h3 className="font-serif text-2xl text-brand-navy">{card.title}</h3>
        {meta ? <p className="text-sm text-zinc-500">{meta}</p> : null}
        {specs.length > 0 ? (
          <p className="text-sm text-zinc-600">{specs.join(" · ")}</p>
        ) : null}
        <PropertyPrice
          purpose={card.purpose}
          salePrice={card.salePrice}
          rentPrice={card.rentPrice}
          className="mt-2 text-2xl font-semibold text-brand-navy"
        />
        <span className="mt-auto pt-2 text-sm font-medium text-brand-navy group-hover:text-brand-gold">
          Ver detalhes →
        </span>
      </div>
    </Link>
  );
}
