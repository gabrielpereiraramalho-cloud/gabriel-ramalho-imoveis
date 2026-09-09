/**
 * Normalização reutilizável de TIPO/tipologia para categorias públicas do
 * catálogo unificado. Aplica-se tanto ao `property_type` dos imóveis manuais
 * quanto ao `type` das tipologias Órulo (texto livre / em inglês).
 *
 * Exemplos: Apartment → Apartamento; Cobertura Duplex → Cobertura; Loja →
 * Comercial; Sala → Comercial; Casa em Condomínio → Casa; Loft → Studio.
 * O que não se encaixa em nenhuma categoria pública retorna null (ex.: Terreno).
 */
export const PROPERTY_CATEGORIES = [
  "Apartamento",
  "Studio",
  "Garden",
  "Cobertura",
  "Casa",
  "Comercial",
] as const;

export type PropertyCategory = (typeof PROPERTY_CATEGORIES)[number];

export function normalizePropertyType(
  raw: string | null | undefined,
): PropertyCategory | null {
  if (!raw) return null;
  const s = raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .toLowerCase();

  // Ordem importa: "Cobertura Duplex" é Cobertura (não Apartamento).
  if (/cobertura|penthouse/.test(s)) return "Cobertura";
  if (/garden/.test(s)) return "Garden";
  if (/studio|kitnet|quitinete|loft/.test(s)) return "Studio";
  if (/loja|comercial|\bsala\b|escritorio|office|corporat|store/.test(s))
    return "Comercial";
  if (/casa|house|sobrado|bangalo/.test(s)) return "Casa";
  if (/apart|apto|\bflat\b|duplex/.test(s)) return "Apartamento";
  return null;
}

/** Categorias distintas (na ordem canônica) a partir de vários tipos crus. */
export function normalizePropertyTypes(
  raws: (string | null | undefined)[],
): PropertyCategory[] {
  const present = new Set<PropertyCategory>();
  for (const r of raws) {
    const c = normalizePropertyType(r);
    if (c) present.add(c);
  }
  return PROPERTY_CATEGORIES.filter((c) => present.has(c));
}
