/**
 * Camada PURA da Fase 2 (sem SDK, sem rede): tipos + validação pós-IA.
 *
 * `validateDraft` recebe a saída crua do modelo (já conforme o schema, mas nunca
 * confiável), o conjunto de slugs de features permitidos e o TEXTO ORIGINAL, e
 * devolve um rascunho normalizado + a lista de confirmações. Nunca inventa:
 * campo ausente/ inválido vira null; descrição com dado não informado é
 * descartada; features fora da lista são removidas. Testável sem API.
 */

import type { SolarPosition } from "@/types/database";

export type PropertyDraft = {
  title: string | null;
  description: string | null;
  property_type: string | null;
  purpose: "sale" | "rent" | null;
  sale_price: number | null;
  rent_price: number | null;
  condominium_fee: number | null;
  iptu: number | null;
  bedrooms: number | null;
  suites: number | null;
  bathrooms: number | null;
  parking_spaces: number | null;
  private_area: number | null;
  total_area: number | null;
  external_area: number | null;
  floor: number | null;
  solar_position: SolarPosition | null;
  city: string | null;
  neighborhood: string | null;
  address: string | null;
  accepts_financing: boolean | null;
  tag: string | null;
  features: string[];
};

export type SuggestResult =
  | { ok: true; draft: PropertyDraft; confirmations: string[] }
  | { ok: false; error: string; configMissing?: boolean };

const SOLAR_VALUES: SolarPosition[] = [
  "nascente",
  "sul",
  "norte",
  "poente",
  "nascente_sul",
  "other",
];

/** Adjetivos comerciais proibidos na descrição (não informados pelo corretor). */
export const BANNED_ADJECTIVES = [
  "luxuoso",
  "luxuosa",
  "luxo",
  "exclusivo",
  "exclusiva",
  "excelente localização",
  "ótima localização",
  "otima localizacao",
  "alto padrão",
  "alto padrao",
  "vista privilegiada",
  "vista deslumbrante",
  "acabamento premium",
  "sofisticado",
  "sofisticada",
  "deslumbrante",
  "imperdível",
  "imperdivel",
  "espetacular",
  "maravilhoso",
  "maravilhosa",
];

const toObj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" ? (v as Record<string, unknown>) : {};

function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

/** Número ≥ 0; inválido/negativo → null (+ confirmação opcional via retorno). */
function nonNegNumber(v: unknown): { value: number | null; invalid: boolean } {
  if (v === null || v === undefined || v === "") return { value: null, invalid: false };
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return { value: null, invalid: true };
  return { value: n, invalid: false };
}

function nonNegInt(v: unknown): { value: number | null; invalid: boolean } {
  const r = nonNegNumber(v);
  if (r.value === null) return r;
  if (!Number.isInteger(r.value)) return { value: null, invalid: true };
  return r;
}

/**
 * Extrai VALORES monetários/numéricos de um texto, expandindo "mil"/"milhão".
 * Usado para garantir que a descrição não cite número ausente do texto original.
 */
export function extractAmounts(text: string): Set<number> {
  const out = new Set<number>();
  if (!text) return out;
  const lower = text.toLowerCase();
  const re = /(\d[\d.\s]*(?:,\d+)?)\s*(mil|milh(?:ão|ao|ões|oes))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(lower)) !== null) {
    const rawNum = m[1].replace(/\s/g, "");
    // pt-BR: ponto = milhar, vírgula = decimal
    const normalized = rawNum.replace(/\./g, "").replace(",", ".");
    let n = Number(normalized);
    if (!Number.isFinite(n)) continue;
    const unit = m[2];
    if (unit) n *= unit.startsWith("mil") && !unit.startsWith("milh") ? 1000 : 1_000_000;
    out.add(n);
    if (unit) out.add(Number(rawNum.replace(/\./g, "").replace(",", "."))); // também o número "cru"
  }
  return out;
}


/** Normaliza para comparação: minúsculas, sem acentos, espaços simples. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** true se o texto cita algum número que não está no texto original nem no draft. */
function hasUnknownNumber(
  text: string,
  inputText: string,
  draftNumbers: number[],
): boolean {
  const allowed = extractAmounts(inputText);
  for (const n of draftNumbers) allowed.add(n);
  for (const d of extractAmounts(text)) {
    if (!allowed.has(d)) return true;
  }
  return false;
}

/** Termos comerciais proibidos que aparecem no texto gerado MAS NÃO no original. */
function addedBannedTerms(text: string, inputText: string): string[] {
  const t = norm(text);
  const i = norm(inputText);
  return BANNED_ADJECTIVES.filter((a) => {
    const na = norm(a);
    return t.includes(na) && !i.includes(na);
  });
}

/** Linguagem de conflito/dúvida — nunca pode ir para texto público. */
const CONFLICT_RE =
  /diverg|na verdade|conflit|contradi|nao esta claro|nao ficou claro|a confirmar|confirme|confirmar|duvida|incerto|inconsisten/;
function hasConflictLanguage(text: string): boolean {
  return CONFLICT_RE.test(norm(text));
}

/** Qualificadores explícitos de área (dispensam a confirmação de área presumida). */
const AREA_QUALIFIER_RE =
  /privativ|total|constru|extern|util|quintal|varanda/;

/** Tipos cuja área "solta" se presume privativa; os demais (casa/terreno) = total. */
const PRIVATE_AREA_TYPES =
  /apart|apto|sala|kitnet|kitinete|flat|loft|studio|estudio|cobertura|conjunto/;

/** Extrai números seguidos de m²/m2/metros do texto original. */
function areaNumbers(text: string): number[] {
  const out: number[] = [];
  const re = /(\d[\d.]*(?:,\d+)?)\s*(m²|m2|metros)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const n = Number(m[1].replace(/\./g, "").replace(",", "."));
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

/** Valor livre só é aceito se existir no texto original (evita inventar local). */
function appearsInInput(value: string | null, inputText: string): string | null {
  if (!value) return null;
  return norm(inputText).includes(norm(value)) ? value : null;
}

function capitalizeFirst(s: string | null): string | null {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Expressões genéricas de lazer que NÃO listam itens. */
const VAGUE_LAZER_RE =
  /lazer (completo|total|completa)|(completa|ampla|otima) area de lazer|area de lazer|infraestrutura (completa )?de lazer/;

/** A feature (slug) está escrita literalmente no texto? ("pet-friendly" → "pet friendly") */
function featureWrittenIn(slug: string, inputText: string): boolean {
  return norm(inputText).includes(slug.replace(/-/g, " "));
}

// Tópicos de confirmação para deduplicação SEMÂNTICA.
type Topic = "finalidade" | "area" | "a_partir" | "condominio" | "lazer";
function topicOf(c: string): Topic | null {
  const n = norm(c);
  if (/finalidade|venda e aluguel|venda ou aluguel/.test(n)) return "finalidade";
  if (/a partir de|preco inicial/.test(n)) return "a_partir";
  if (/(m2|m²|area)/.test(n) && /(privativ|total|presum|classifica)/.test(n)) return "area";
  if (/condominio incluso|valor do condominio/.test(n)) return "condominio";
  if (/lazer/.test(n)) return "lazer";
  return null;
}

// Mensagens-padrão do validador.
const MSG = {
  finalidade: "Imóvel com venda e aluguel — confirme a finalidade principal (manchete).",
  area: "Classificação da área presumida (privativa/total) — confira se está no campo correto.",
  aPartir:
    "Preço informado como “a partir de” — é preço inicial, não um valor fechado. Confira.",
  descConflito:
    "Descrição continha dúvida/conflito (isso fica só nas confirmações) — reescreva ou gere novamente.",
  descTermo:
    "Descrição acrescentou termo comercial não informado — reescreva ou gere novamente.",
  descNumero: "Descrição continha número/dado não informado — reescreva ou gere novamente.",
  tituloTermo: "Título sugerido acrescentou termo/dado não informado — escreva o título.",
  semFinalidade:
    "Finalidade e preço não informados — confirme se é venda ou aluguel e informe o valor.",
  lazer: "“Lazer completo” é genérico — confirme quais itens de lazer o imóvel possui.",
};

/**
 * Valida e normaliza a saída crua do modelo. `inputText` é o texto original.
 * Regras: nunca inventar; termos comerciais só se escritos pelo usuário (vale
 * para título e descrição); conflito nunca no texto público; área sem
 * qualificação pode ser sugerida, mas SEMPRE com confirmação; "a partir de"
 * gera confirmação; cidade/bairro/endereço só se presentes no texto; tipo com
 * inicial maiúscula; dedup semântico das confirmações.
 */
export function validateDraft(
  raw: unknown,
  allowedSlugs: string[],
  inputText: string,
): { draft: PropertyDraft; confirmations: string[] } {
  const o = toObj(raw);
  const modelConfs: string[] = [];
  if (Array.isArray(o.confirmations)) {
    for (const c of o.confirmations) {
      const s = str(c);
      if (s) modelConfs.push(s);
    }
  }
  const own: string[] = []; // confirmações do validador (prioritárias)

  const numField = (key: string, label: string): number | null => {
    const r = nonNegNumber(o[key]);
    if (r.invalid) own.push(`${label}: valor inválido no texto — confirmar.`);
    return r.value;
  };
  const intField = (key: string, label: string): number | null => {
    const r = nonNegInt(o[key]);
    if (r.invalid) own.push(`${label}: valor inválido no texto — confirmar.`);
    return r.value;
  };

  const allowed = new Set(allowedSlugs);
  const features = Array.isArray(o.features)
    ? Array.from(
        new Set(
          o.features
            .map((f) => str(f))
            .filter((s): s is string => !!s && allowed.has(s)),
        ),
      )
    : [];

  const purposeRaw = str(o.purpose);
  const purpose = purposeRaw === "sale" || purposeRaw === "rent" ? purposeRaw : null;
  const solarRaw = str(o.solar_position);
  const solar_position = SOLAR_VALUES.includes(solarRaw as SolarPosition)
    ? (solarRaw as SolarPosition)
    : null;

  const sale_price = numField("sale_price", "Preço de venda");
  const rent_price = numField("rent_price", "Preço de aluguel");
  const condominium_fee = numField("condominium_fee", "Condomínio");
  const iptu = numField("iptu", "IPTU");
  const bedrooms = intField("bedrooms", "Quartos");
  const suites = intField("suites", "Suítes");
  const bathrooms = intField("bathrooms", "Banheiros");
  const parking_spaces = intField("parking_spaces", "Vagas");
  let private_area = numField("private_area", "Área privativa");
  let total_area = numField("total_area", "Área total");
  const external_area = numField("external_area", "Área externa");
  const floor = intField("floor", "Andar");

  const property_type = capitalizeFirst(str(o.property_type));

  // ---- Área sem qualificação: sugere, mas SEMPRE com confirmação. ----
  const hasQualifier = AREA_QUALIFIER_RE.test(norm(inputText));
  const areas = areaNumbers(inputText);
  if (!hasQualifier && areas.length === 1 && private_area === null && total_area === null) {
    if (property_type && PRIVATE_AREA_TYPES.test(norm(property_type))) {
      private_area = areas[0];
    } else if (property_type) {
      total_area = areas[0];
    }
  }
  const areaPresumed = !hasQualifier && (private_area !== null || total_area !== null);
  if (areaPresumed) own.push(MSG.area);

  const draftNumbers = [
    sale_price, rent_price, condominium_fee, iptu, bedrooms, suites, bathrooms,
    parking_spaces, private_area, total_area, external_area, floor,
  ].filter((n): n is number => n !== null);

  // ---- Descrição ----
  let description = str(o.description);
  if (description) {
    if (hasConflictLanguage(description)) {
      description = null;
      own.push(MSG.descConflito);
    } else if (addedBannedTerms(description, inputText).length > 0) {
      description = null;
      own.push(MSG.descTermo);
    } else if (hasUnknownNumber(description, inputText, draftNumbers)) {
      description = null;
      own.push(MSG.descNumero);
    }
  }

  // ---- Título (mesmas regras da descrição) ----
  let title = str(o.title);
  if (
    title &&
    (hasConflictLanguage(title) ||
      addedBannedTerms(title, inputText).length > 0 ||
      hasUnknownNumber(title, inputText, draftNumbers))
  ) {
    title = null;
    own.push(MSG.tituloTermo);
  }

  // ---- "A partir de" ----
  if (/a partir de/.test(norm(inputText)) && (sale_price !== null || rent_price !== null)) {
    own.push(MSG.aPartir);
  }

  const draft: PropertyDraft = {
    title,
    description,
    property_type,
    purpose,
    sale_price,
    rent_price,
    condominium_fee,
    iptu,
    bedrooms,
    suites,
    bathrooms,
    parking_spaces,
    private_area,
    total_area,
    external_area,
    floor,
    solar_position,
    // Cidade/bairro/endereço só se escritos no texto (nunca presume João Pessoa).
    city: appearsInInput(str(o.city), inputText),
    neighborhood: appearsInInput(str(o.neighborhood), inputText),
    address: appearsInInput(str(o.address), inputText),
    accepts_financing:
      typeof o.accepts_financing === "boolean" ? o.accepts_financing : null,
    tag: str(o.tag),
    features,
  };

  if (draft.sale_price !== null && draft.rent_price !== null && draft.purpose === null) {
    own.push(MSG.finalidade);
  }

  // Finalidade e preço totalmente ausentes → aviso fixo (finalidade é obrigatória p/ salvar).
  if (draft.purpose === null && draft.sale_price === null && draft.rent_price === null) {
    own.push(MSG.semFinalidade);
  }

  // "Lazer completo" (ou equivalente) sem itens: nenhuma feature inferida dele;
  // só ficam as features cujo nome está escrito no texto. Confirmação fixa.
  if (VAGUE_LAZER_RE.test(norm(inputText))) {
    draft.features = draft.features.filter((slug) => featureWrittenIn(slug, inputText));
    own.push(MSG.lazer);
  }

  // ---- Dedup semântico: tópico coberto pelo validador remove o equivalente do modelo;
  //      entre as do modelo, mantém uma por tópico. ----
  const ownTopics = new Set<Topic>();
  for (const c of own) {
    const t = topicOf(c);
    if (t) ownTopics.add(t);
  }
  const seenTopics = new Set<Topic>();
  const modelKept = modelConfs.filter((c) => {
    const t = topicOf(c);
    if (!t) return true;
    if (ownTopics.has(t) || seenTopics.has(t)) return false;
    seenTopics.add(t);
    return true;
  });

  const seen = new Set<string>();
  const confirmations = [...modelKept, ...own].filter((c) => {
    const k = norm(c);
    return seen.has(k) ? false : (seen.add(k), true);
  });

  return { draft, confirmations };
}
