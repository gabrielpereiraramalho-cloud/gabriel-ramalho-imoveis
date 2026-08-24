import Image from "next/image";

import type { OruloBuildingDetail } from "@/lib/orulo/public-queries";
import { siteConfig, whatsappUrl } from "@/lib/site";
import { PropertyGallery } from "@/components/property-gallery";
import { WhatsAppLink } from "@/components/whatsapp-link";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

function money(v: number | null): string {
  return v === null ? "Consulte" : brl.format(v);
}
function range(min: number | null, max: number | null, suffix = ""): string {
  if (min === null && max === null) return "—";
  if (min !== null && max !== null && min !== max)
    return `${min} a ${max}${suffix}`;
  return `${min ?? max}${suffix}`;
}

export function BuildingDetail({ b }: { b: OruloBuildingDetail }) {
  const meta = [b.neighborhood, b.city].filter(Boolean).join(", ");
  const wa = whatsappUrl(
    `Olá, ${siteConfig.brand}! Tenho interesse no empreendimento ${b.name}${
      meta ? ` (${meta})` : ""
    } que vi no seu site.`,
  );
  const paragraphs = (b.description ?? "")
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="flex flex-col gap-10">
      {/* Cabeçalho */}
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-brand-gold px-2.5 py-0.5 text-xs font-semibold text-brand-navy-dark">
            Lançamento
          </span>
          {b.status ? (
            <span className="rounded-full bg-brand-navy/90 px-2.5 py-0.5 text-xs font-medium text-white">
              {b.status}
            </span>
          ) : null}
        </div>
        <h1 className="font-serif text-3xl font-semibold text-brand-navy sm:text-4xl">
          {b.name}
        </h1>
        {b.developer ? (
          <p className="text-sm uppercase tracking-wide text-brand-gold">
            {b.developer}
          </p>
        ) : null}
        {meta ? <p className="text-zinc-600">{meta}</p> : null}
        <p className="text-2xl font-semibold text-brand-navy">
          A partir de {money(b.minPrice)}
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[2fr_1fr] lg:items-start">
        <div className="flex min-w-0 flex-col gap-8">
          {/* Galeria */}
          <PropertyGallery
            images={b.images.map((m) => ({ url: m.url, alt: m.alt }))}
            unoptimized
          />

          {/* Informações principais */}
          <section className="flex flex-col gap-4">
            <h2 className="font-serif text-2xl font-semibold text-brand-navy">
              Informações principais
            </h2>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Info label="Dormitórios" value={range(b.minBedrooms, b.maxBedrooms)} />
              <Info label="Área privativa" value={range(b.minArea, b.maxArea, " m²")} />
              <Info label="Tipologias" value={String(b.typologies.length)} />
            </dl>
          </section>

          {/* Descrição */}
          {paragraphs.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="font-serif text-2xl font-semibold text-brand-navy">
                Sobre o empreendimento
              </h2>
              <div className="flex flex-col gap-3 text-zinc-700">
                {paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>
          ) : null}

          {/* Tipologias */}
          {b.typologies.length > 0 ? (
            <section className="flex flex-col gap-4">
              <h2 className="font-serif text-2xl font-semibold text-brand-navy">
                Tipologias
              </h2>
              <div className="overflow-x-auto rounded-lg border border-zinc-200">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium">Tipo</th>
                      <th className="px-3 py-2 font-medium">Área</th>
                      <th className="px-3 py-2 font-medium">Dorm.</th>
                      <th className="px-3 py-2 font-medium">Suítes</th>
                      <th className="px-3 py-2 font-medium">Vagas</th>
                      <th className="px-3 py-2 font-medium">A partir de</th>
                    </tr>
                  </thead>
                  <tbody>
                    {b.typologies.map((t) => (
                      <tr key={t.id} className="border-t border-zinc-100">
                        <td className="px-3 py-2">{t.type ?? "—"}</td>
                        <td className="px-3 py-2">
                          {t.privateArea !== null ? `${t.privateArea} m²` : "—"}
                        </td>
                        <td className="px-3 py-2">{t.bedrooms ?? "—"}</td>
                        <td className="px-3 py-2">{t.suites ?? "—"}</td>
                        <td className="px-3 py-2">{t.parking ?? "—"}</td>
                        <td className="px-3 py-2">{money(t.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {/* Plantas */}
          {b.floorPlans.length > 0 ? (
            <section className="flex flex-col gap-4">
              <h2 className="font-serif text-2xl font-semibold text-brand-navy">
                Plantas
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {b.floorPlans.map((p) => (
                  <a
                    key={p.url}
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative aspect-[3/4] overflow-hidden rounded-lg border border-zinc-200 bg-white"
                  >
                    <Image
                      src={p.thumb}
                      alt={p.alt}
                      fill
                      unoptimized
                      sizes="(max-width: 640px) 50vw, 33vw"
                      className="object-contain"
                    />
                  </a>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        {/* Contato */}
        <aside className="min-w-0 lg:sticky lg:top-8 lg:self-start">
          <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6">
            <p className="text-xl font-semibold text-brand-navy">
              A partir de {money(b.minPrice)}
            </p>
            <p className="text-sm text-zinc-500">Empreendimento — {b.city ?? "—"}</p>
            {wa ? (
              <WhatsAppLink
                href={wa}
                source="empreendimento"
                className="inline-flex items-center justify-center rounded-lg bg-brand-navy px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-navy-dark"
              >
                Tenho interesse
              </WhatsAppLink>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
