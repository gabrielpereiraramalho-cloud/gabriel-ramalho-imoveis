import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

import { logout } from "./actions";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex flex-1 flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        Painel Administrativo
      </h1>

      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex gap-2">
          <dt className="font-medium text-zinc-600 dark:text-zinc-400">
            E-mail:
          </dt>
          <dd>{user?.email ?? "—"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-medium text-zinc-600 dark:text-zinc-400">
            Administrador:
          </dt>
          <dd>Ativo</dd>
        </div>
      </dl>

      <nav className="flex gap-3">
        <Link
          href="/admin/imoveis"
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
        >
          Imóveis
        </Link>
        <Link
          href="/admin/leads"
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
        >
          Leads
        </Link>
        <Link
          href="/admin/orulo"
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
        >
          Catálogo Órulo
        </Link>
      </nav>

      <form action={logout}>
        <button
          type="submit"
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
        >
          Sair
        </button>
      </form>
    </main>
  );
}
