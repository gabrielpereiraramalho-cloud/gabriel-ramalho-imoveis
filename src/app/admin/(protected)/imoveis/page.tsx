import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { PURPOSE_LABELS, STATUS_LABELS } from "./schema";
import {
  deleteProperty,
  setActive,
  setFeatured,
  setPublished,
} from "./actions";
import { DeleteButton } from "./delete-button";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatPrice(value: number | string | null): string {
  if (value === null || value === "") return "—";
  const n = Number(value);
  return Number.isNaN(n) ? "—" : brl.format(n);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("pt-BR");
}

const thCls = "px-3 py-2 text-left font-medium whitespace-nowrap";
const tdCls = "px-3 py-2 whitespace-nowrap";

export default async function ImoveisPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const term = (q ?? "").trim();

  const supabase = await createClient();

  let query = supabase
    .from("properties")
    .select(
      "id, code, title, property_type, purpose, sale_price, rent_price, status, featured, active, published_at, created_at, neighborhoods(name)",
    )
    .order("created_at", { ascending: false });

  if (term) {
    const safe = term.replace(/[,%()*]/g, " ");
    query = query.or(`code.ilike.%${safe}%,title.ilike.%${safe}%`);
  }

  const { data: properties, error } = await query;

  return (
    <main className="flex flex-1 flex-col gap-6 p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Imóveis</h1>
        <Link
          href="/admin/imoveis/novo"
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
        >
          + Novo imóvel
        </Link>
      </div>

      <form method="get" className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={term}
          placeholder="Buscar por código ou título"
          className="w-full max-w-sm rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
        >
          Buscar
        </button>
        {term ? (
          <Link
            href="/admin/imoveis"
            className="rounded px-4 py-2 text-sm font-medium text-zinc-500"
          >
            Limpar
          </Link>
        ) : null}
      </form>

      {error ? (
        <p className="text-sm text-red-600">
          Erro ao carregar imóveis: {error.message}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              <th className={thCls}>Código</th>
              <th className={thCls}>Título</th>
              <th className={thCls}>Bairro</th>
              <th className={thCls}>Tipo</th>
              <th className={thCls}>Finalidade</th>
              <th className={thCls}>Preço</th>
              <th className={thCls}>Status</th>
              <th className={thCls}>Destaque</th>
              <th className={thCls}>Ativo</th>
              <th className={thCls}>Publicado</th>
              <th className={thCls}>Criado em</th>
              <th className={thCls}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {(properties ?? []).length === 0 ? (
              <tr>
                <td
                  className="px-3 py-6 text-center text-zinc-500"
                  colSpan={12}
                >
                  Nenhum imóvel encontrado.
                </td>
              </tr>
            ) : (
              (properties ?? []).map((p) => {
                const price =
                  p.purpose === "sale" ? p.sale_price : p.rent_price;
                return (
                  <tr
                    key={p.id}
                    className="border-t border-zinc-200 dark:border-zinc-800"
                  >
                    <td className={tdCls}>{p.code}</td>
                    <td className={`${tdCls} max-w-xs truncate`}>{p.title}</td>
                    <td className={tdCls}>{p.neighborhoods?.name ?? "—"}</td>
                    <td className={tdCls}>{p.property_type}</td>
                    <td className={tdCls}>{PURPOSE_LABELS[p.purpose]}</td>
                    <td className={tdCls}>{formatPrice(price)}</td>
                    <td className={tdCls}>{STATUS_LABELS[p.status]}</td>
                    <td className={tdCls}>
                      <form action={setFeatured.bind(null, p.id, !p.featured)}>
                        <button
                          type="submit"
                          className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700"
                        >
                          {p.featured ? "Sim" : "Não"}
                        </button>
                      </form>
                    </td>
                    <td className={tdCls}>
                      <form action={setActive.bind(null, p.id, !p.active)}>
                        <button
                          type="submit"
                          className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700"
                        >
                          {p.active ? "Sim" : "Não"}
                        </button>
                      </form>
                    </td>
                    <td className={tdCls}>
                      <form
                        action={setPublished.bind(
                          null,
                          p.id,
                          p.published_at === null,
                        )}
                      >
                        <button
                          type="submit"
                          className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700"
                        >
                          {p.published_at !== null ? "Sim" : "Não"}
                        </button>
                      </form>
                    </td>
                    <td className={tdCls}>{formatDate(p.created_at)}</td>
                    <td className={tdCls}>
                      <div className="flex gap-2">
                        <Link
                          href={`/admin/imoveis/${p.id}/editar`}
                          className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700"
                        >
                          Editar
                        </Link>
                        <DeleteButton
                          action={deleteProperty.bind(null, p.id)}
                          code={p.code}
                        />
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
