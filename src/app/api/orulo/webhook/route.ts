import { createAdminClient } from "@/lib/supabase/admin";
import {
  isValidWebhookToken,
  parseWebhookPayload,
} from "@/lib/orulo/webhook-parse";
import { logWebhookEvent, processWebhookEvent } from "@/lib/orulo/webhook";

// Precisa de Node (crypto, libs server-only) e nunca deve ser cacheado.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Log estruturado, seguro (sem secrets/tokens nem payload sensível). */
function log(fields: Record<string, string | number | null | undefined>): void {
  const parts = Object.entries({ at: new Date().toISOString(), ...fields }).map(
    ([k, v]) => `${k}=${v ?? "-"}`,
  );
  console.log(`[orulo-webhook] ${parts.join(" ")}`);
}

/**
 * Webhook público da Órulo: POST https://<site>/api/orulo/webhook?token=<secret>
 *
 * Responde HTTP 200 apenas quando o evento é aceito/processado (a Órulo trata
 * qualquer resposta ≠ 200, ou timeout, como falha de entrega e reentrega). A
 * reconciliação periódica (não implementada aqui) é o fallback recomendado.
 */
export async function POST(request: Request): Promise<Response> {
  // 1) Autenticidade: segredo compartilhado na URL (?token=) ou header.
  const url = new URL(request.url);
  const provided =
    url.searchParams.get("token") ?? request.headers.get("x-webhook-token");
  if (!isValidWebhookToken(provided)) {
    log({ result: "401", reason: "token inválido ou ausente" });
    return new Response("unauthorized", { status: 401 });
  }

  // 2) Corpo JSON.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    log({ result: "400", reason: "JSON inválido" });
    return new Response("invalid json", { status: 400 });
  }

  // 3) Validação do payload.
  const parsed = parseWebhookPayload(body);
  if (!parsed.ok) {
    if (parsed.ignorable) {
      // Bem-formado mas evento não tratado: ACK 200 para não gerar reentregas.
      log({ result: "200", outcome: "ignored", reason: parsed.reason });
      return new Response("ignored", { status: 200 });
    }
    log({ result: "400", reason: parsed.reason });
    return new Response("invalid payload", { status: 400 });
  }

  const { event } = parsed;

  // 4) Processamento idempotente (com a chave secreta do Supabase, sem sessão).
  try {
    const supabase = createAdminClient();
    const result = await processWebhookEvent(supabase, event);
    await logWebhookEvent(supabase, {
      eventName: event.name,
      buildingId: event.buildingId,
      status: event.status,
      clientId: event.clientId,
      outcome: result.outcome,
      detail: result.detail,
    });
    log({
      result: "200",
      building_id: event.buildingId,
      status: event.status,
      outcome: result.outcome,
      detail: result.detail,
    });
    return new Response("ok", { status: 200 });
  } catch (err) {
    // Falha (ex.: API da Órulo indisponível, erro no banco): responde 5xx para
    // que a Órulo reentregue. Mensagem sem secrets/tokens.
    const msg = err instanceof Error ? err.message : "erro desconhecido";
    log({
      result: "502",
      building_id: event.buildingId,
      status: event.status,
      outcome: "error",
      detail: msg,
    });
    // Best-effort: tenta registrar o erro no log durável.
    try {
      await logWebhookEvent(createAdminClient(), {
        eventName: event.name,
        buildingId: event.buildingId,
        status: event.status,
        clientId: event.clientId,
        outcome: "error",
        detail: msg,
      });
    } catch {
      // ignora — createAdminClient pode falhar se faltar SUPABASE_SECRET_KEY.
    }
    return new Response("processing error", { status: 502 });
  }
}
