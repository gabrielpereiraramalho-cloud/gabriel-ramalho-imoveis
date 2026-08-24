import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPublishedBuildingBySlug } from "@/lib/orulo/public-queries";
import { BuildingDetail } from "@/components/orulo/building-detail";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const b = await getPublishedBuildingBySlug(slug);
  if (!b) return { title: "Empreendimento não encontrado", robots: { index: false } };
  const meta = [b.neighborhood, b.city].filter(Boolean).join(", ");
  const url = `/empreendimento/${slug}`;
  return {
    title: `${b.name} | Empreendimento`,
    description: `${b.name}${meta ? ` — ${meta}` : ""}. ${
      b.developer ? `Incorporadora ${b.developer}. ` : ""
    }A partir de consulta.`.slice(0, 160),
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title: b.name,
      url,
      images: b.coverUrl ? [{ url: b.coverUrl }] : undefined,
    },
  };
}

export default async function EmpreendimentoPage({ params }: Params) {
  const { slug } = await params;
  const b = await getPublishedBuildingBySlug(slug);
  if (!b) notFound();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-4 py-10">
      <BuildingDetail b={b} />
    </main>
  );
}
