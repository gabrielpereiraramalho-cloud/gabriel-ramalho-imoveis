import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { getSupabaseUrl } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Cliente Supabase com a CHAVE SECRETA (service role) — USO EXCLUSIVO NO
 * SERVIDOR, em contextos SEM sessão de usuário (ex.: webhook da Órulo, que a
 * Órulo chama diretamente, sem cookies/admin logado).
 *
 * A chave secreta ignora a RLS por definição; por isso este cliente NUNCA deve
 * ser importado em componentes de cliente nem exposto ao browser. O `server-only`
 * acima garante erro de build caso alguém tente importá-lo no bundle do cliente.
 *
 * Não persiste sessão (sem cookies): cada requisição é autônoma.
 */
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "Variável de ambiente obrigatória ausente: SUPABASE_SECRET_KEY. " +
        "Necessária para o webhook Órulo escrever sem sessão de admin.",
    );
  }

  return createSupabaseClient<Database>(getSupabaseUrl(), secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
