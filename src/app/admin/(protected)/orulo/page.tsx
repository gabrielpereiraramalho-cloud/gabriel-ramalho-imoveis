import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { isOruloConfigured } from "@/lib/orulo/config";
import { runOruloSync } from "./actions";

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

function dateTime(v: string | null): string {
  return v ? new Date(v).toLocaleString("pt-BR") : "—";
}

const thCls = "px-3 py-2 text-left font-medium whitespace-nowrap";
const tdCls = "px-3 py-2 whitespace-nowrap";

export default async function OruloPage() {
  const configured = isOruloConfigured();
  const supabase = await createClient();

  const [{ data: buildings, error: buildingsError }, { data: runs }] =
    await Promise.all([
      supabase
        .from("orulo_buildings")
        .select(
          "external_id, name, city, neighborhood, min_price, status, synced_at",
        )
        .order("synced_at", { ascending: false })
        .limit(200),
      supabase
        .from("orulo_sync_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(1),
    ]);

  const lastRun = runs?.[0] ?? null;
  const total = buildings?.length ?? 0;

  return (
    <main className="flex flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Órulo — integração (teste)
        </h1>
        <Link href="/admin" className="text-sm text-zinc-500 hover:underline">
          ← Painel
        </Link>
      </div>

      {/* Status */}
      <section className="grid gap-3 rounded border border-zinc-200 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Credenciais"
          value={configured ? "Configurado" : "Não configurado"}
        />
        <Stat
          label="Última sincronização"
          value={dateTime(lastRun?.started_at ?? null)}
        />
        <Stat
          label="Status da última execução"
          value={lastRun ? (lastRun.status === "success" ? "Sucesso" : "Erro") : "—"}
        />
        <Stat label="Empreendimentos no banco" value={String(total)} />
      </section>

      {!configured ? (
        <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Defina <code>ORULO_CLIENT_ID</code> e <code>ORULO_CLIENT_SECRET</code>{" "}
          no <code>.env.local</code> (e depois na Vercel) para autenticar. O
          secret nunca vai ao browser.
        </p>
      ) : null}

      {lastRun ? (
        <section className="flex flex-wrap gap-4 text-sm text-zinc-600">
          <span>Páginas percorridas: {lastRun.pages_traversed ?? "—"}</span>
          <span>IDs encontrados: {lastRun.buildings_found ?? "—"}</span>
          <span>Criados: {lastRun.created_count ?? "—"}</span>
          <span>Atualizados: {lastRun.updated_count ?? "—"}</span>
          <span>Com imagens: {lastRun.images_fetched ?? "—"}</span>
          <span>Com plantas: {lastRun.floor_plans_fetched ?? "—"}</span>
          {lastRun.error_summary ? (
            <span className="text-red-600">Erro: {lastRun.error_summary}</span>
          ) : null}
        </section>
      ) : null}

      <form action={runOruloSync}>
        <button
          type="submit"
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Sincronizar agora
        </button>
      </form>

      {buildingsError ? (
        <p className="text-sm text-red-600">
          Erro ao carregar empreendimentos: {buildingsError.message}. Verifique
          se a migration da integração Órulo foi aplicada no Supabase.
        </p>
      ) : null}

      <div className="overflow-x-auto rounded border border-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className={thCls}>ID Órulo</th>
              <th className={thCls}>Nome</th>
              <th className={thCls}>Cidade</th>
              <th className={thCls}>Bairro</th>
              <th className={thCls}>Preço inicial</th>
              <th className={thCls}>Status</th>
            </tr>
          </thead>
          <tbody>
            {(buildings ?? []).length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-zinc-500" colSpan={6}>
                  Nenhum empreendimento sincronizado ainda.
                </td>
              </tr>
            ) : (
              (buildings ?? []).map((b) => (
                <tr key={b.external_id} className="border-t border-zinc-200">
                  <td className={tdCls}>{b.external_id}</td>
                  <td className={`${tdCls} max-w-xs truncate`}>
                    {b.name ?? "—"}
                  </td>
                  <td className={tdCls}>{b.city ?? "—"}</td>
                  <td className={tdCls}>{b.neighborhood ?? "—"}</td>
                  <td className={tdCls}>{money(b.min_price)}</td>
                  <td className={tdCls}>{b.status ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
