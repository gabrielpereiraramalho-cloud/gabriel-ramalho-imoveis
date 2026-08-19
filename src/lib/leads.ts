/** Domínio de leads: status, rótulos e tipos de imóvel do formulário. */

export const LEAD_STATUSES = [
  "novo",
  "em_atendimento",
  "concluido",
  "descartado",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  novo: "Novo",
  em_atendimento: "Em atendimento",
  concluido: "Concluído",
  descartado: "Descartado",
};

export function leadStatusLabel(status: string | null): string {
  if (status && (LEAD_STATUSES as readonly string[]).includes(status)) {
    return LEAD_STATUS_LABELS[status as LeadStatus];
  }
  return status ?? "—";
}

export const LEAD_TYPE_LABELS: Record<string, string> = {
  owner_property_submission: "Proprietário (anunciar)",
  property_inquiry: "Interesse em imóvel",
};

export function leadTypeLabel(leadType: string | null): string {
  if (!leadType) return "—";
  return LEAD_TYPE_LABELS[leadType] ?? leadType;
}

/** Origem usada para leads de proprietário que querem anunciar. */
export const OWNER_LEAD_TYPE = "owner_property_submission";

/** Opções de tipo de imóvel do formulário (valores de formulário, não enum). */
export const OWNER_PROPERTY_TYPES = [
  "Apartamento",
  "Casa",
  "Terreno",
  "Comercial",
  "Outro",
] as const;

/**
 * Monta o link de WhatsApp para o admin chamar o lead a partir do telefone
 * informado. Retorna null se não houver dígitos. (DDI 55 quando ausente.)
 */
export function ownerLeadWhatsappUrl(
  phone: string,
  name: string | null,
): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  const number = digits.length <= 11 ? `55${digits}` : digits;
  const greeting = name ? `Olá, ${name}!` : "Olá!";
  const message = `${greeting} Aqui é Gabriel Ramalho. Recebi pelo meu site as informações do seu imóvel e estou entrando em contato para entender melhor os detalhes.`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
