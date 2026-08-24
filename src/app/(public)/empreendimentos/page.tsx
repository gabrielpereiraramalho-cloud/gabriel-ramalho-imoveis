import type { Metadata } from "next";

import { listPublishedBuildings } from "@/lib/orulo/public-queries";
import { BuildingCard } from "@/components/orulo/building-card";
import { defaultOgImage } from "@/lib/site";

const DESCRIPTION =
  "Lançamentos e empreendimentos selecionados para morar ou investir em João Pessoa e região.";

export const metadata: Metadata = {
  title: "Empreendimentos e lançamentos",
  description: DESCRIPTION,
  alternates: { canonical: "/empreendimentos" },
  openGraph: {
    title: "Empreendimentos e lançamentos | Gabriel Ramalho Imóveis",
    description: DESCRIPTION,
    url: "/empreendimentos",
    images: [{ url: defaultOgImage }],
  },
};

export default async function EmpreendimentosPage() {
  const buildings = await listPublishedBuildings();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold">
          Lançamentos
        </span>
        <h1 className="font-serif text-3xl font-semibold text-brand-navy">
          Empreendimentos
        </h1>
        <p className="text-zinc-600">{DESCRIPTION}</p>
      </header>

      {buildings.length === 0 ? (
        <p className="rounded-lg border border-zinc-200 bg-white p-6 text-zinc-600">
          Em breve novos empreendimentos por aqui.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {buildings.map((card) => (
            <BuildingCard key={card.slug} card={card} />
          ))}
        </div>
      )}
    </main>
  );
}
