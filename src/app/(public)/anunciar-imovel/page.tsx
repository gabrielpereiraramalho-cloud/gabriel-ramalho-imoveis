import type { Metadata } from "next";

import { OwnerLeadForm } from "./owner-lead-form";

const DESCRIPTION =
  "Preencha algumas informações e entrarei em contato para entender melhor o seu imóvel.";

export const metadata: Metadata = {
  title: "Quero anunciar meu imóvel",
  description: DESCRIPTION,
  alternates: { canonical: "/anunciar-imovel" },
  openGraph: {
    title: "Quero anunciar meu imóvel | Gabriel Ramalho Imóveis",
    description: DESCRIPTION,
    url: "/anunciar-imovel",
  },
};

export default function AnunciarImovelPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-12">
      <header className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold">
          Proprietários
        </span>
        <h1 className="font-serif text-3xl font-semibold text-brand-navy">
          Quero anunciar meu imóvel
        </h1>
        <p className="text-zinc-600">{DESCRIPTION}</p>
      </header>

      <OwnerLeadForm />
    </main>
  );
}
