import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Executa apenas nas rotas administrativas (inclui /admin/login para o
  // refresh de sessão; a própria rota de login não é redirecionada).
  matcher: ["/admin/:path*"],
};
