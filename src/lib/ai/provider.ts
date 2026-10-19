import "server-only";

/**
 * Provedor de IA DESACOPLADO. É o ÚNICO ponto que conhece o SDK/modelo —
 * trocar de provedor/modelo no futuro é mexer só aqui. Server-side apenas.
 *
 * Lê OPENAI_API_KEY (server-side, nunca NEXT_PUBLIC) e AI_MODEL (default
 * gpt-6-luna). Usa Structured Outputs (response_format json_schema strict),
 * timeout (o modelo não aceita temperature customizada). Nunca loga a chave nem detalhes sensíveis.
 */

import { buildPropertySchema } from "./property-schema";

export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

const AI_MODEL = process.env.AI_MODEL || "gpt-6-luna";
const TIMEOUT_MS = 20_000;

export async function callStructured(args: {
  system: string;
  user: string;
  schema: ReturnType<typeof buildPropertySchema>;
}): Promise<unknown> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY ausente");

  // Import dinâmico: o SDK só é carregado quando realmente há uma chamada.
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey, timeout: TIMEOUT_MS });

  const completion = await client.chat.completions.create({
    model: AI_MODEL,
    messages: [
      { role: "system", content: args.system },
      { role: "user", content: args.user },
    ],
    response_format: {
      type: "json_schema",
      json_schema: args.schema,
    },
  });

  const content = completion.choices?.[0]?.message?.content;
  if (!content) throw new Error("Resposta vazia do modelo");
  return JSON.parse(content);
}
