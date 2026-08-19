import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-offwhite text-zinc-900">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center gap-6 px-4 py-20 text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold">
          Erro 404
        </span>
        <h1 className="font-serif text-3xl font-semibold text-brand-navy sm:text-4xl">
          Página não encontrada
        </h1>
        <p className="max-w-md text-zinc-600">
          O endereço que você acessou não existe ou o imóvel não está mais
          disponível.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="rounded-md bg-brand-navy px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-navy-dark"
          >
            Voltar para o início
          </Link>
          <Link
            href="/imoveis"
            className="rounded-md border border-brand-navy/25 px-6 py-3 text-sm font-semibold text-brand-navy transition-colors hover:bg-brand-navy hover:text-white"
          >
            Ver imóveis
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
