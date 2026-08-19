import Link from "next/link";

type NeighborhoodLink = { name: string; citySlug: string; slug: string };

// Bairros iniciais destacados (slugs coerentes com o seed do banco).
const NEIGHBORHOODS: NeighborhoodLink[] = [
  { name: "Bessa", citySlug: "joao-pessoa", slug: "bessa" },
  { name: "Jardim Oceania", citySlug: "joao-pessoa", slug: "jardim-oceania" },
  { name: "Manaíra", citySlug: "joao-pessoa", slug: "manaira" },
  { name: "Cabo Branco", citySlug: "joao-pessoa", slug: "cabo-branco" },
  { name: "Tambaú", citySlug: "joao-pessoa", slug: "tambau" },
  { name: "Altiplano", citySlug: "joao-pessoa", slug: "altiplano" },
  { name: "Aeroclube", citySlug: "joao-pessoa", slug: "aeroclube" },
  { name: "Brisamar", citySlug: "joao-pessoa", slug: "brisamar" },
  { name: "Intermares", citySlug: "cabedelo", slug: "intermares" },
  { name: "Ponta de Campina", citySlug: "cabedelo", slug: "ponta-de-campina" },
];

export function NeighborhoodsSection() {
  return (
    <section id="bairros" className="scroll-mt-20">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-16">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-gold">
            Localização
          </span>
          <h2 className="font-serif text-2xl font-semibold text-brand-navy sm:text-3xl">
            Encontre por localização
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {NEIGHBORHOODS.map((n) => (
            <Link
              key={`${n.citySlug}-${n.slug}`}
              href={`/imoveis?cidade=${n.citySlug}&bairro=${n.slug}`}
              className="group flex flex-col justify-between rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-brand-gold"
            >
              <span className="font-serif text-lg text-brand-navy">
                {n.name}
              </span>
              <span className="mt-6 text-xs font-medium text-brand-navy/60 group-hover:text-brand-gold">
                Ver imóveis →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
