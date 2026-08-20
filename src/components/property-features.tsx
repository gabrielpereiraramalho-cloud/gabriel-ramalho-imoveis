import Link from "next/link";

import type { PropertyFeature } from "@/lib/properties/queries";

const CATEGORY_LABELS: Record<string, string> = {
  property: "Imóvel",
  condominium: "Condomínio",
  location: "Localização",
};

function categoryLabel(category: string | null): string {
  if (!category) return "Outras";
  return CATEGORY_LABELS[category] ?? "Outras";
}

export function PropertyFeatures({
  features,
}: {
  features: PropertyFeature[];
}) {
  if (features.length === 0) return null;

  const groups = new Map<string, { name: string; slug: string }[]>();
  for (const f of features) {
    const key = categoryLabel(f.category);
    const list = groups.get(key) ?? [];
    list.push({ name: f.name, slug: f.slug });
    groups.set(key, list);
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-serif text-2xl font-semibold text-brand-navy">
        Características
      </h2>
      <div className="flex flex-col gap-4">
        {[...groups.entries()].map(([category, items]) => (
          <div key={category} className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-zinc-500">{category}</h3>
            <ul className="flex flex-wrap gap-2">
              {items.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={`/imoveis?features=${encodeURIComponent(item.slug)}`}
                    title={`Ver imóveis com ${item.name}`}
                    className="inline-flex rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-700 transition-colors hover:border-brand-navy hover:text-brand-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy active:bg-zinc-50"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
