import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Layout que protege todas as rotas do painel (route group `(protected)`).
 *
 * O middleware já garante que há sessão. Aqui validamos o profile admin
 * (role=admin, active=true). A rota /admin/login fica FORA deste grupo,
 * evitando loop de redirect.
 */
export default async function ProtectedAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin" || !profile.active) {
    redirect("/admin/login?error=not_admin");
  }

  return children;
}
