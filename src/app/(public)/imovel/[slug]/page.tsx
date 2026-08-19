import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getPublicPropertyBySlug,
  getSimilarProperties,
  type PropertyDetail,
} from "@/lib/properties/queries";
import {
  HIGHLIGHTED_STATUSES,
  mainPriceLabel,
  SOLAR_LABELS,
  STATUS_LABELS,
} from "@/lib/properties/format";
import {
  absoluteUrl,
  defaultOgImage,
  jsonLdScript,
  siteConfig,
} from "@/lib/site";
import { PropertyCard } from "@/components/property-card";
import { PropertyFeatures } from "@/components/property-features";
import { PropertyGallery } from "@/components/property-gallery";
import { PropertyLocation } from "@/components/property-location";
import { PropertyPrice } from "@/components/property-price";
import { PropertyWhatsappCta } from "@/components/property-whatsapp-cta";
import { PropertyMobileCta } from "@/components/property-mobile-cta";

type Params = { params: Promise<{ slug: string }> };

/** Descrição curta gerada a partir dos atributos (não copia a descrição). */
function buildMetaDescription(p: PropertyDetail): string {
  let base = p.propertyType;
  if (p.neighborhoodName) base += ` no ${p.neighborhoodName}`;
  if (p.cityName) base += `, ${p.cityName}`;

  const extra: string[] = [];
  if (p.bedrooms > 0)
    extra.push(`${p.bedrooms} ${p.bedrooms === 1 ? "quarto" : "quartos"}`);
  if (p.suites > 0)
    extra.push(`${p.suites} ${p.suites === 1 ? "suíte" : "suítes"}`);
  if (p.privateArea !== null) extra.push(`${p.privateArea} m²`);

  let desc = base;
  if (extra.length > 0) desc += ` com ${extra.join(", ")}`;

  const price = mainPriceLabel(p.purpose, p.salePrice, p.rentPrice);
  if (price !== "Consulte") {
    desc += `. ${p.purpose === "rent" ? "Aluguel" : "Venda"}: ${price}`;
  }
  return `${desc}.`.slice(0, 180);
}

/** Mapeia o tipo do imóvel para um tipo Schema.org coerente. */
function schemaType(propertyType: string): string {
  const t = propertyType.toLowerCase();
  if (/apart|flat|studio|kitnet|kitchenette|cobertura|loft/.test(t))
    return "Apartment";
  if (/casa|sobrado|bangal/.test(t)) return "House";
  return "Residence";
}

function propertyJsonLd(p: PropertyDetail): Record<string, unknown> {
  const address: Record<string, unknown> = {
    "@type": "PostalAddress",
    addressLocality: p.cityName ?? siteConfig.addressLocality,
    addressRegion: p.state ?? siteConfig.addressRegion,
    addressCountry: "BR",
  };
  // Só expõe endereço completo se autorizado.
  if (p.showExactAddress) {
    const street = [p.address, p.addressNumber].filter(Boolean).join(", ");
    if (street) address.streetAddress = street;
    if (p.postalCode) address.postalCode = p.postalCode;
  }

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": schemaType(p.propertyType),
    name: p.title,
    description: buildMetaDescription(p),
    url: absoluteUrl(`/imovel/${p.slug}`),
    address,
  };
  if (p.coverImageUrl) data.image = p.coverImageUrl;
  if (p.privateArea !== null)
    data.floorSize = {
      "@type": "QuantitativeValue",
      value: p.privateArea,
      unitCode: "MTK",
    };
  if (p.bedrooms > 0) {
    data.numberOfBedrooms = p.bedrooms;
    data.numberOfRooms = p.bedrooms;
  }
  if (p.bathrooms > 0) data.numberOfBathroomsTotal = p.bathrooms;

  const price = p.purpose === "sale" ? p.salePrice : p.rentPrice;
  if (price !== null) {
    data.offers = {
      "@type": "Offer",
      price,
      priceCurrency: "BRL",
      availability:
        p.status === "available"
          ? "https://schema.org/InStock"
          : "https://schema.org/LimitedAvailability",
      url: absoluteUrl(`/imovel/${p.slug}`),
    };
  }
  return data;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const property = await getPublicPropertyBySlug(slug);
  if (!property) {
    return { title: "Imóvel não encontrado", robots: { index: false } };
  }

  const description = buildMetaDescription(property);
  const url = `/imovel/${slug}`;
  const image = property.coverImageUrl ?? defaultOgImage;

  return {
    title: property.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title: property.title,
      description,
      url,
      images: [{ url: image }],
    },
    twitter: {
      card: "summary_large_image",
      title: property.title,
      description,
      images: [image],
    },
  };
}

type Spec = { label: string; value: string };

export default async function ImovelPage({ params }: Params) {
  const { slug } = await params;
  const property = await getPublicPropertyBySlug(slug);

  if (!property) {
    notFound();
  }

  const similar = await getSimilarProperties({
    id: property.id,
    neighborhoodId: property.neighborhoodId,
    purpose: property.purpose,
  });

  const specs: Spec[] = [];
  if (property.privateArea !== null)
    specs.push({ label: "Área privativa", value: `${property.privateArea} m²` });
  if (property.totalArea !== null)
    specs.push({ label: "Área total", value: `${property.totalArea} m²` });
  if (property.bedrooms > 0)
    specs.push({ label: "Quartos", value: String(property.bedrooms) });
  if (property.suites > 0)
    specs.push({ label: "Suítes", value: String(property.suites) });
  if (property.bathrooms > 0)
    specs.push({ label: "Banheiros", value: String(property.bathrooms) });
  if (property.parkingSpaces > 0)
    specs.push({ label: "Vagas", value: String(property.parkingSpaces) });
  if (property.floor !== null)
    specs.push({
      label: "Andar",
      value: property.floor === 0 ? "Térreo" : String(property.floor),
    });
  if (property.solarPosition)
    specs.push({
      label: "Posição solar",
      value: SOLAR_LABELS[property.solarPosition],
    });

  const meta = [property.neighborhoodName, property.cityName]
    .filter(Boolean)
    .join(", ");
  const showStatus = HIGHLIGHTED_STATUSES.includes(property.status);
  const descriptionParagraphs = (property.description ?? "")
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const videos = [
    { label: "Vídeo no YouTube", url: property.youtubeUrl },
    { label: "Vídeo no Instagram", url: property.instagramUrl },
    { label: "Tour virtual", url: property.virtualTourUrl },
  ].filter((v): v is { label: string; url: string } => Boolean(v.url));

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(propertyJsonLd(property)) }}
      />
      {/* Cabeçalho */}
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {property.tag ? (
            <span className="rounded-full bg-brand-gold px-2.5 py-0.5 text-xs font-semibold text-brand-navy-dark">
              {property.tag}
            </span>
          ) : null}
          {showStatus ? (
            <span className="rounded-full bg-brand-navy/90 px-2.5 py-0.5 text-xs font-medium text-white">
              {STATUS_LABELS[property.status]}
            </span>
          ) : null}
        </div>
        <h1 className="font-serif text-3xl font-semibold text-brand-navy sm:text-4xl">
          {property.title}
        </h1>
        {meta ? <p className="text-zinc-600">{meta}</p> : null}
        <PropertyPrice
          purpose={property.purpose}
          salePrice={property.salePrice}
          rentPrice={property.rentPrice}
          className="text-2xl font-semibold text-brand-navy"
        />
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(280px,0.85fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-8">
          <PropertyGallery images={property.images} />

          {/* Informações principais */}
          {specs.length > 0 ? (
            <section className="flex flex-col gap-4">
              <h2 className="font-serif text-2xl font-semibold text-brand-navy">
                Informações principais
              </h2>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {specs.map((spec) => (
                  <div key={spec.label} className="flex flex-col">
                    <dt className="text-sm text-zinc-500">{spec.label}</dt>
                    <dd className="font-medium">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {/* Descrição */}
          {descriptionParagraphs.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="font-serif text-2xl font-semibold text-brand-navy">
                Sobre este imóvel
              </h2>
              <div className="flex flex-col gap-3 text-zinc-700">
                {descriptionParagraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </section>
          ) : null}

          <PropertyFeatures features={property.features} />

          <PropertyLocation property={property} />

          {/* Vídeos */}
          {videos.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="font-serif text-2xl font-semibold text-brand-navy">
                Vídeos
              </h2>
              <div className="flex flex-wrap gap-3">
                {videos.map((video) => (
                  <a
                    key={video.url}
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-brand-navy"
                  >
                    {video.label}
                  </a>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        {/* Coluna lateral: contato */}
        <aside className="min-w-0 lg:sticky lg:top-8 lg:self-start">
          <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6">
            <PropertyPrice
              purpose={property.purpose}
              salePrice={property.salePrice}
              rentPrice={property.rentPrice}
              className="text-xl font-semibold text-brand-navy"
            />
            <p className="text-sm text-zinc-500">Código: {property.code}</p>
            <PropertyWhatsappCta
              title={property.title}
              code={property.code}
            />
          </div>
        </aside>
      </div>

      {/* Imóveis semelhantes */}
      {similar.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h2 className="font-serif text-2xl font-semibold text-brand-navy">
            Você também pode gostar
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((card) => (
              <PropertyCard key={card.id} card={card} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Espaçador para a barra fixa não cobrir o conteúdo no mobile */}
      <div className="h-16 lg:hidden" aria-hidden="true" />

      <PropertyMobileCta
        title={property.title}
        code={property.code}
        purpose={property.purpose}
        salePrice={property.salePrice}
        rentPrice={property.rentPrice}
      />
    </main>
  );
}
