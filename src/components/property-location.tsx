import type { PropertyDetail } from "@/lib/properties/queries";

export function PropertyLocation({ property }: { property: PropertyDetail }) {
  const base = [
    property.neighborhoodName,
    property.cityName,
    property.state,
  ].filter(Boolean);

  const exact: string[] = [];
  if (property.showExactAddress) {
    if (property.address) {
      exact.push(
        [property.address, property.addressNumber].filter(Boolean).join(", "),
      );
    }
    if (property.complement) exact.push(property.complement);
    if (property.postalCode) exact.push(`CEP: ${property.postalCode}`);
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-serif text-2xl font-semibold text-brand-navy">
        Localização
      </h2>
      {base.length > 0 ? (
        <p className="text-sm text-zinc-700">{base.join(", ")}</p>
      ) : null}
      {exact.length > 0 ? (
        <div className="flex flex-col gap-1 text-sm text-zinc-600">
          {exact.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
