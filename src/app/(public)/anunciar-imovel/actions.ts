"use server";

import { createClient } from "@/lib/supabase/server";
import { OWNER_LEAD_TYPE, OWNER_PROPERTY_TYPES } from "@/lib/leads";

export type OwnerLeadState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  tracking?: { propertyType: string; city: string; neighborhood: string } | null;
};

const MAX_SHORT = 120;
const MAX_MESSAGE = 2000;

export async function submitOwnerLead(
  _prevState: OwnerLeadState,
  formData: FormData,
): Promise<OwnerLeadState> {
  // Honeypot: campo invisível preenchido = bot. Sucesso silencioso sem salvar.
  if (String(formData.get("company") ?? "").trim() !== "") {
    return { ok: true, tracking: null };
  }

  const fieldErrors: Record<string, string> = {};
  const str = (k: string) => String(formData.get(k) ?? "").trim();

  const name = str("name");
  const phone = str("phone");
  const propertyType = str("property_type");
  const city = str("city");
  const neighborhood = str("neighborhood");
  const message = str("message");

  if (!name) fieldErrors.name = "Informe seu nome.";
  if (!phone) fieldErrors.phone = "Informe seu WhatsApp.";
  if (!propertyType) fieldErrors.property_type = "Selecione o tipo do imóvel.";
  else if (!(OWNER_PROPERTY_TYPES as readonly string[]).includes(propertyType))
    fieldErrors.property_type = "Tipo inválido.";
  if (!city) fieldErrors.city = "Informe a cidade.";
  if (!neighborhood) fieldErrors.neighborhood = "Informe o bairro.";

  // Limites de tamanho.
  const limits: [string, string, number][] = [
    ["name", name, MAX_SHORT],
    ["phone", phone, 40],
    ["city", city, MAX_SHORT],
    ["neighborhood", neighborhood, MAX_SHORT],
    ["message", message, MAX_MESSAGE],
  ];
  for (const [key, value, limit] of limits) {
    if (value.length > limit) fieldErrors[key] = `Máximo de ${limit} caracteres.`;
  }

  const optDecimal = (k: string, label: string): number | null => {
    const raw = str(k);
    if (raw === "") return null;
    const n = Number(raw.replace(",", "."));
    if (Number.isNaN(n)) {
      fieldErrors[k] = `${label} inválido.`;
      return null;
    }
    if (n < 0) {
      fieldErrors[k] = `${label} não pode ser negativo.`;
      return null;
    }
    return n;
  };
  const optInt = (k: string, label: string): number | null => {
    const raw = str(k);
    if (raw === "") return null;
    const n = Number(raw);
    if (!Number.isInteger(n)) {
      fieldErrors[k] = `${label} deve ser um número inteiro.`;
      return null;
    }
    if (n < 0) {
      fieldErrors[k] = `${label} não pode ser negativo.`;
      return null;
    }
    return n;
  };

  const estimated_value = optDecimal("estimated_value", "Valor aproximado");
  const bedrooms = optInt("bedrooms", "Quartos");
  const area = optDecimal("area", "Área");

  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Corrija os campos destacados.", fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("leads").insert({
    name,
    phone,
    message: message || null,
    lead_type: OWNER_LEAD_TYPE,
    property_type: propertyType,
    city,
    neighborhood,
    estimated_value,
    bedrooms,
    area,
    source: "anunciar-imovel",
    status: "novo",
  });

  if (error) {
    return { error: `Não foi possível enviar agora. Tente novamente. (${error.message})` };
  }

  return { ok: true, tracking: { propertyType, city, neighborhood } };
}
