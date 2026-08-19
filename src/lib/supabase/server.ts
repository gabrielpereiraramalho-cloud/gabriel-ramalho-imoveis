import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Cria um cliente Supabase para uso no servidor (Server Components, Route
 * Handlers e Server Actions).
 *
 * Integra-se aos cookies da requisição para persistir a sessão. Em Server
 * Components a escrita de cookies não é permitida; nesse caso o `setAll`
 * falha silenciosamente (o refresh de sessão é feito pelo middleware,
 * a ser adicionado na etapa de autenticação).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Chamado a partir de um Server Component: ignorável.
          }
        },
      },
    },
  );
}
