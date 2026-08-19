"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string };

/**
 * Server Action de login do administrador.
 *
 * 1) Autentica no Supabase; 2) verifica o profile (role=admin, active=true);
 * 3) redireciona para /admin. Em qualquer falha, retorna mensagem simples.
 */
export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Informe e-mail e senha." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: "Credenciais inválidas." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", data.user.id)
    .single();

  if (!profile || profile.role !== "admin" || !profile.active) {
    await supabase.auth.signOut();
    return { error: "Usuário sem permissão de administrador." };
  }

  redirect("/admin");
}
