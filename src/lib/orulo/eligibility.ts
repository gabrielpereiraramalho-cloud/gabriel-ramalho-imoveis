/**
 * Validação de elegibilidade para publicação de um empreendimento Órulo.
 * Usada na publicação individual agora e preparada para a publicação
 * automática na praça definitiva (mesmas regras).
 */
export type EligibilityInput = {
  name: string | null;
  city: string | null;
  neighborhood: string | null;
  min_price: number | string | null;
  status: string | null;
  cover_image_id: string | null;
  images: unknown;
};

export type Eligibility = { eligible: boolean; reasons: string[] };

const num = (v: number | string | null): number | null => {
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function hasAtLeastOneImage(input: EligibilityInput): boolean {
  if (input.cover_image_id) return true;
  return Array.isArray(input.images) && input.images.length > 0;
}

export function checkEligibility(input: EligibilityInput): Eligibility {
  const reasons: string[] = [];
  if (!input.name) reasons.push("sem nome");
  if (!input.city) reasons.push("sem cidade");
  if (!input.neighborhood) reasons.push("sem bairro");
  const price = num(input.min_price);
  if (price === null || price <= 0) reasons.push("preço inválido");
  if (!hasAtLeastOneImage(input)) reasons.push("sem imagem");
  if (!input.status) reasons.push("status inativo");
  // Origem Órulo é garantida (tabela orulo_buildings).
  return { eligible: reasons.length === 0, reasons };
}
