import { timingSafeEqual } from "node:crypto";

/**
 * Webhook da Órulo — validação e parsing PUROS (sem IO/rede/banco), para serem
 * testáveis isoladamente. O contrato (evento BUILDING_UPDATE) é oficial:
 *
 *   { "date": "17/09/2025 12:34:56", "name": "BUILDING_UPDATE",
 *     "properties": { "building_id": 123, "status": "active" } }
 *
 * Eventos de distribuição incluem "client_id" (UID da aplicação OAuth):
 *   { ..., "properties": { "status": "added_to_distribution",
 *                          "building_id": 123, "client_id": "uuid" } }
 */

export type OruloWebhookStatus =
  | "active"
  | "removed"
  | "added_to_distribution"
  | "excluded_from_distribution";

const KNOWN_STATUSES = new Set<string>([
  "active",
  "removed",
  "added_to_distribution",
  "excluded_from_distribution",
]);

const DISTRIBUTION_STATUSES = new Set<string>([
  "added_to_distribution",
  "excluded_from_distribution",
]);

export type OruloWebhookEvent = {
  name: string;
  buildingId: string;
  status: OruloWebhookStatus;
  clientId: string | null;
  date: string | null;
};

export type ParseResult =
  | { ok: true; event: OruloWebhookEvent }
  // ignorable = corpo bem-formado mas evento que não tratamos (ack 200 para não
  // gerar reentregas). Caso contrário, payload inválido (responder 400).
  | { ok: false; reason: string; ignorable: boolean };

/**
 * Valida o segredo compartilhado da URL do webhook em tempo constante.
 * Fail-closed: se ORULO_WEBHOOK_SECRET não estiver configurado, rejeita.
 */
export function isValidWebhookToken(
  provided: string | null | undefined,
): boolean {
  const expected = process.env.ORULO_WEBHOOK_SECRET ?? "";
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Extrai e valida o evento do corpo JSON recebido. Tolerante e defensivo. */
export function parseWebhookPayload(body: unknown): ParseResult {
  if (!body || typeof body !== "object") {
    return { ok: false, reason: "corpo não é um objeto JSON", ignorable: false };
  }
  const b = body as Record<string, unknown>;
  const props =
    b.properties && typeof b.properties === "object"
      ? (b.properties as Record<string, unknown>)
      : null;
  if (!props) {
    return { ok: false, reason: "properties ausente", ignorable: false };
  }

  const rawId = props.building_id;
  const buildingId =
    typeof rawId === "number" && Number.isFinite(rawId)
      ? String(rawId)
      : typeof rawId === "string" && rawId.trim() !== ""
        ? rawId.trim()
        : "";
  if (!buildingId) {
    return { ok: false, reason: "building_id ausente", ignorable: false };
  }

  const status = typeof props.status === "string" ? props.status : "";
  if (!KNOWN_STATUSES.has(status)) {
    // Bem-formado, porém status que não tratamos: ack para evitar reentregas.
    return {
      ok: false,
      reason: `status não tratado: ${status || "(vazio)"}`,
      ignorable: true,
    };
  }

  const clientId =
    typeof props.client_id === "string" && props.client_id.trim() !== ""
      ? props.client_id.trim()
      : null;
  const name = typeof b.name === "string" && b.name ? b.name : "BUILDING_UPDATE";
  const date = typeof b.date === "string" && b.date ? b.date : null;

  return {
    ok: true,
    event: {
      name,
      buildingId,
      status: status as OruloWebhookStatus,
      clientId,
      date,
    },
  };
}

/**
 * Eventos de distribuição carregam client_id (UID da app OAuth). Só tratamos os
 * da NOSSA integração. Sem client_id, a doc manda tratar defensivamente como
 * aplicável a todas as integrações (processa). Eventos de catálogo (active/
 * removed) não têm client_id e valem sempre.
 */
export function isForOurIntegration(event: OruloWebhookEvent): boolean {
  if (!DISTRIBUTION_STATUSES.has(event.status)) return true;
  if (!event.clientId) return true;
  return event.clientId === (process.env.ORULO_CLIENT_ID ?? "");
}
