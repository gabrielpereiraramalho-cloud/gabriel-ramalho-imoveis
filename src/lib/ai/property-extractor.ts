/**
 * Orquestra a extração: monta schema + prompt (com slugs reais), chama o
 * `caller` (provider real OU mock nos testes) e roda a validação pós-IA pura.
 * NÃO importa o SDK/provider — o chamador (Server Action) injeta o `caller`,
 * mantendo este módulo testável sem rede/chave.
 */

import { buildPropertySchema, buildSystemPrompt } from "./property-schema";
import { validateDraft, type SuggestResult } from "./property-draft";

/** Contrato do provedor: recebe prompt/schema e devolve o JSON cru do modelo. */
export type StructuredCaller = (args: {
  system: string;
  user: string;
  schema: ReturnType<typeof buildPropertySchema>;
}) => Promise<unknown>;

export const MAX_INPUT_CHARS = 4000;

export async function extractPropertyDraft(
  text: string,
  allowedSlugs: string[],
  caller: StructuredCaller,
): Promise<SuggestResult> {
  const input = (text ?? "").trim();
  if (input.length === 0) {
    return { ok: false, error: "Escreva uma descrição do imóvel antes de gerar." };
  }
  const user = input.slice(0, MAX_INPUT_CHARS);

  let raw: unknown;
  try {
    raw = await caller({
      system: buildSystemPrompt(allowedSlugs),
      user,
      schema: buildPropertySchema(allowedSlugs),
    });
  } catch {
    // Mensagem segura (sem detalhes internos/chave). Fallback: cadastro manual.
    return {
      ok: false,
      error:
        "Não foi possível gerar o rascunho agora. Preencha manualmente ou tente novamente.",
    };
  }

  const { draft, confirmations } = validateDraft(raw, allowedSlugs, user);
  return { ok: true, draft, confirmations };
}
