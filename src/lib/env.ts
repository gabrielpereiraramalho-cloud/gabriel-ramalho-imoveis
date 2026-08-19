/**
 * Acesso centralizado às variáveis de ambiente.
 *
 * As funções abaixo leem `process.env` sob demanda (não no carregamento do
 * módulo), evitando que a ausência de variáveis quebre o build. A validação
 * só ocorre quando a variável é efetivamente utilizada em tempo de execução.
 */

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Variável de ambiente obrigatória ausente: ${name}. ` +
        `Configure-a no arquivo .env.local (veja .env.example).`,
    );
  }
  return value;
}

/** URL pública do projeto Supabase. */
export function getSupabaseUrl(): string {
  return requireEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
}

/**
 * Chave publicável (pública) do Supabase — segura para o browser.
 * Nomenclatura atual recomendada pelo Supabase (substitui a antiga anon key).
 */
export function getSupabasePublishableKey(): string {
  return requireEnv(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
