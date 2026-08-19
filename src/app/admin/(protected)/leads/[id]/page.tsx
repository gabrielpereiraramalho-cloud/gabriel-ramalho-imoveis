import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  leadTypeLabel,
  ownerLeadWhatsappUrl,
} from "@/lib/leads";
import { LeadStatusSelect } from "../lead-status-select";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

function money(v: number | string | null): string {
  if (v === null || v === "") return "—";
  const n = Number(v);
  return Number.isNaN(n) ? "—" : brl.format(n);
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-zinc-100 py-2">
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </dt>
      <dd className="text-sm">{value || "—"}</dd>
    </div>
  );
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();

  if (!lead) {
    notFound();
  }

  const wa = ownerLeadWhatsappUrl(lead.phone, lead.name);

  return (
    <main className="flex flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Lead — {lead.name ?? "sem nome"}
        </h1>
        <Link
          href="/admin/leads"
          className="text-sm text-zinc-500 hover:underline"
        >
          ← Leads
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500">Status:</span>
          <LeadStatusSelect id={lead.id} status={lead.status} />
        </div>
        {wa ? (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Chamar no WhatsApp
          </a>
        ) : null}
      </div>

      <dl className="max-w-xl">
        <Row label="Data/hora" value={new Date(lead.created_at).toLocaleString("pt-BR")} />
        <Row label="Origem" value={lead.source} />
        <Row label="Tipo do lead" value={leadTypeLabel(lead.lead_type)} />
        <Row label="Nome" value={lead.name} />
        <Row label="WhatsApp" value={lead.phone} />
        <Row label="Tipo do imóvel" value={lead.property_type} />
        <Row label="Cidade" value={lead.city} />
        <Row label="Bairro" value={lead.neighborhood} />
        <Row label="Valor aproximado" value={money(lead.estimated_value)} />
        <Row label="Quartos" value={lead.bedrooms ?? "—"} />
        <Row
          label="Área (m²)"
          value={lead.area === null ? "—" : String(lead.area)}
        />
        <Row label="Mensagem" value={lead.message} />
      </dl>
    </main>
  );
}
