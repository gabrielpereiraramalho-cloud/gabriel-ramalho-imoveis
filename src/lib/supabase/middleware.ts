import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Atualiza/renova a sessão do Supabase a cada requisição e protege as rotas
 * de administração.
 *
 * Fluxo SSR recomendado: o cliente é criado com os cookies da requisição e,
 * a cada refresh de token, os cookies são reescritos na resposta. Nenhuma
 * lógica deve ficar entre a criação do cliente e `getUser()`.
 *
 * A verificação de perfil admin (role/active) é feita no layout protegido,
 * não aqui, para não consultar o banco no middleware.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLoginRoute = pathname === "/admin/login";

  // Sem sessão em rota protegida -> redireciona ao login (exceto a própria).
  if (!user && pathname.startsWith("/admin") && !isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
