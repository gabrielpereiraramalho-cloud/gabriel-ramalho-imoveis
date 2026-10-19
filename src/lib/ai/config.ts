/**
 * Flag do "Cadastro rápido por IA" (Fase 2). DESLIGADA por padrão: o assistente
 * só aparece quando NEXT_PUBLIC_AI_QUICKFILL estiver explicitamente ligada
 * (1 | true | on | yes). Sem a flag, o cadastro manual funciona como hoje.
 */
export function isAiQuickfillEnabled(): boolean {
  const v = (process.env.NEXT_PUBLIC_AI_QUICKFILL ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "on" || v === "yes";
}
