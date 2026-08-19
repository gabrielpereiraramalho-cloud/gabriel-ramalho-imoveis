import Link from "next/link";

export function SellCta() {
  return (
    <section className="bg-brand-navy text-offwhite">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-start gap-4 px-4 py-14 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="font-serif text-2xl font-semibold sm:text-3xl">
            Quer vender seu imóvel?
          </h2>
          <p className="max-w-2xl text-offwhite/80">
            Apresente seu imóvel de forma profissional e alcance compradores com
            uma estratégia de divulgação direcionada.
          </p>
        </div>
        <Link
          href="/anunciar-imovel"
          className="shrink-0 rounded-full bg-brand-gold px-6 py-3 text-sm font-semibold text-brand-navy-dark transition-colors hover:bg-brand-gold-light"
        >
          Quero anunciar meu imóvel
        </Link>
      </div>
    </section>
  );
}
