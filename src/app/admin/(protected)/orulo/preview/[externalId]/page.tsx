import Link from "next/link";
import { notFound } from "next/navigation";

import { getBuildingForPreview } from "@/lib/orulo/public-queries";
import { BuildingDetail } from "@/components/orulo/building-detail";

export default async function OruloPreviewPage({
  params,
}: {
  params: Promise<{ externalId: string }>;
}) {
  const { externalId } = await params;
  const b = await getBuildingForPreview(externalId);
  if (!b) notFound();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
        <span>
          Prévia interna — {b.published ? "PUBLICADO" : "NÃO publicado"} · ID
          Órulo {b.externalId} · slug <code>{b.slug}</code>
        </span>
        <Link href="/admin/orulo" className="font-medium hover:underline">
          ← Órulo
        </Link>
      </div>

      <BuildingDetail b={b} />
    </main>
  );
}
