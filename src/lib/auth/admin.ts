import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

/**
 * Confirma se a requisição atual é de um admin ativo (profiles.role="admin",
 * active=true), usando a sessão do cliente Supabase (cookies). Serve para
 * proteger Server Actions, que são endpoints públicos e NÃO herdam a proteção
 * do layout do route group. Use antes de qualquer efeito colateral sensível.
 */
export async function isRequestAdmin(
  supabase: SupabaseClient<Database>,
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", user.id)
    .single();

  return Boolean(profile && profile.role === "admin" && profile.active);
}
