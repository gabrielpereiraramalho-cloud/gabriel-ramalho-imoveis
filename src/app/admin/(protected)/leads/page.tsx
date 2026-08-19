import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { leadTypeLabel, ownerLeadWhatsappUrl } from "@/lib/leads";
import { LeadStatusSelect } from "./lead-status-select";

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

function date(v: string): string {
  return new Date(v).toLocaleString("pt-BR");
}

const thCls = "px-3 py-2 text-left font-medium whitespace-nowrap";
const tdCls = "px-3 py-2 whitespace-nowrap";

export default async function LeadsPage() {
  const supabase = await createClient();
  const { data: leads, error } = await supabase
    .from("leads")
    .select(
      "id, name, phone, lead_type, property_type, neighborhood, city, estimated_value, status, created_at",
    )
    .order("created_at", { ascending: false });

  return (
    <main className="flex flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
        <Link href="/admin" className="text-sm text-zinc-500 hover:underline">
          ← Painel
        </Link>
      </div>

      {error ? (
        <p className="text-sm text-red-600">
          Erro ao carregar leads: {error.message}. Verifique se a migration de
          campos de leads foi aplicada no Supabase.
        </p>
      ) : null}

      <div className="overflow-x-auto rounded border border-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className={thCls}>Data</th>
              <th className={thCls}>Nome</th>
              <th className={thCls}>WhatsApp</th>
              <th className={thCls}>Tipo do lead</th>
              <th className={thCls}>Tipo do imóvel</th>
              <th className={thCls}>Bairro</th>
              <th className={thCls}>Cidade</th>
              <th className={thCls}>Valor</th>
              <th className={thCls}>Status</th>
              <th className={thCls}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {(leads ?? []).length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-zinc-500" colSpan={10}>
                  Nenhum lead recebido ainda.
                </td>
              </tr>
            ) : (
              (leads ?? []).map((lead) => {
                const wa = ownerLeadWhatsappUrl(lead.phone, lead.name);
                return (
                  <tr key={lead.id} className="border-t border-zinc-200">
                    <td className={tdCls}>{date(lead.created_at)}</td>
                    <td className={tdCls}>{lead.name ?? "—"}</td>
                    <td className={tdCls}>{lead.phone}</td>
                    <td className={tdCls}>{leadTypeLabel(lead.lead_type)}</td>
                    <td className={tdCls}>{lead.property_type ?? "—"}</td>
                    <td className={tdCls}>{lead.neighborhood ?? "—"}</td>
                    <td className={tdCls}>{lead.city ?? "—"}</td>
                    <td className={tdCls}>{money(lead.estimated_value)}</td>
                    <td className={tdCls}>
                      <LeadStatusSelect id={lead.id} status={lead.status} />
                    </td>
                    <td className={tdCls}>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/leads/${lead.id}`}
                          className="rounded border border-zinc-300 px-2 py-1 text-xs"
                        >
                          Detalhes
                        </Link>
                        {wa ? (
                          <a
                            href={wa}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700"
                          >
                            WhatsApp
                          </a>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
