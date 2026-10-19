"use server";

import { createClient } from "@/lib/supabase/server";
import { isRequestAdmin } from "@/lib/auth/admin";
import { extractPropertyDraft } from "@/lib/ai/property-extractor";
import { callStructured, isOpenAiConfigured } from "@/lib/ai/provider";
import { isAiQuickfillEnabled } from "@/lib/ai/config";
import type { SuggestResult } from "@/lib/ai/property-draft";

/**
 * Gera um RASCUNHO estruturado a partir do texto livre. Server Action pública →
 * exige admin. Não salva, não publica, não toca em Órulo/analytics/banco além
 * de LER os slugs de features. Mensagens de erro nunca expõem a chave.
 */
export async function suggestPropertyDraft(text: string): Promise<SuggestResult> {
  if (!isAiQuickfillEnabled()) {
    return { ok: false, error: "Assistente de IA desativado." };
  }

  const supabase = await createClient();
  if (!(await isRequestAdmin(supabase))) {
    return { ok: false, error: "Não autorizado." };
  }

  if (!isOpenAiConfigured()) {
    return {
      ok: false,
      configMissing: true,
      error: "Assistente de IA indisponível: configuração ausente.",
    };
  }

  const { data: features } = await supabase
    .from("features")
    .select("slug")
    .eq("active", true);
  const allowedSlugs = (features ?? [])
    .map((f) => f.slug)
    .filter((s): s is string => Boolean(s));

  return extractPropertyDraft(text, allowedSlugs, callStructured);
}
