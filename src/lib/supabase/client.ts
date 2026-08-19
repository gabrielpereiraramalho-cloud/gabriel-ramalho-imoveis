import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Cria um cliente Supabase para uso em Client Components (browser).
 *
 * Utiliza apenas a chave publicável (pública). Nunca deve usar a service role.
 */
export function createClient() {
  return createBrowserClient<Database>(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
  );
}
