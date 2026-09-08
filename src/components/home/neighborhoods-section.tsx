import Link from "next/link";

import type { NeighborhoodOffer } from "@/lib/catalog/queries";

/**
 * "Encontre por localização" — 100% dinâmica a partir do catálogo unificado.
 * Recebe os bairros já agregados (top N por nº de ofertas). Cada card leva a
 * /imoveis com o bairro aplicado no filtro. Some se não houver bairros.
 */
export function NeighborhoodsSection({
  bairros,
}: {
  bairros: NeighborhoodOffer[];
}) {
  if (bairros.length === 0) return null;

  return (
    <section id="bairros" className="scroll-mt-20">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-gold">
            Localização
          </span>
          <h2 className="font-serif text-2xl font-semibold text-brand-navy sm:text-3xl">
            Encontre por localização
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {bairros.map((n) => (
            <Link
              key={n.slug}
              href={`/imoveis?bairro=${n.slug}`}
              className="group flex flex-col justify-between rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-brand-gold"
            >
              <span className="font-serif text-lg text-brand-navy">
                {n.name}
              </span>
              <span className="mt-6 text-xs font-medium text-brand-navy/60 group-hover:text-brand-gold">
                {n.count} {n.count === 1 ? "imóvel" : "imóveis"} →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
