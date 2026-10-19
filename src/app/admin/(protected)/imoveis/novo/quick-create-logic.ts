/**
 * Lógica PURA do assistente (sem React): mapeia o rascunho da IA para os
 * valores/field-names do formulário, calcula quais campos têm marcador "IA" e
 * mescla uma nova geração preservando os campos editados manualmente.
 * Testável sem DOM.
 */

import type { PropertyDraft } from "@/lib/ai/property-draft";

/** Valores do formulário (strings, como no FormData), por field-name. */
export type FormValues = Record<string, string>;

const money = (n: number | null): string => (n === null ? "" : String(n));
const text = (s: string | null): string => s ?? "";
const bool = (b: boolean | null): string => (b === true ? "on" : "");

/**
 * Converte o rascunho nos valores do formulário existente (mesmos field-names
 * do parsePropertyForm). city/neighborhood são texto livre; features vão como
 * lista de slugs (o componente mapeia slug→id das checkboxes).
 */
export function draftToFormValues(draft: PropertyDraft): FormValues {
  return {
    title: text(draft.title),
    property_type: text(draft.property_type),
    purpose: draft.purpose ?? "",
    description: text(draft.description),
    sale_price: money(draft.sale_price),
    rent_price: money(draft.rent_price),
    condominium_fee: money(draft.condominium_fee),
    iptu: money(draft.iptu),
    bedrooms: money(draft.bedrooms),
    suites: money(draft.suites),
    bathrooms: money(draft.bathrooms),
    parking_spaces: money(draft.parking_spaces),
    private_area: money(draft.private_area),
    total_area: money(draft.total_area),
    external_area: money(draft.external_area),
    floor: money(draft.floor),
    solar_position: draft.solar_position ?? "",
    city: text(draft.city),
    neighborhood: text(draft.neighborhood),
    address: text(draft.address),
    accepts_financing: bool(draft.accepts_financing),
    tag: text(draft.tag),
  };
}

/** Campos (field-names) preenchidos pela IA = os que têm valor não vazio. */
export function aiFieldsFromValues(values: FormValues, features: string[]): Set<string> {
  const set = new Set<string>();
  for (const [k, v] of Object.entries(values)) {
    if (v !== "" ) set.add(k);
  }
  if (features.length > 0) set.add("features");
  return set;
}

/**
 * Mescla uma NOVA geração preservando o que o usuário editou manualmente.
 * - campos em `manualEdited` mantêm o valor atual (não são sobrescritos);
 * - demais recebem o valor novo;
 * - marcador "IA" fica só nos campos preenchidos pela IA e NÃO editados.
 */
export function applyRegenerate(
  current: FormValues,
  currentFeatures: string[],
  newDraft: PropertyDraft,
  manualEdited: Set<string>,
): { values: FormValues; features: string[]; aiFields: Set<string> } {
  const newValues = draftToFormValues(newDraft);
  const merged: FormValues = { ...current };
  const aiFields = new Set<string>();

  for (const [k, v] of Object.entries(newValues)) {
    if (manualEdited.has(k)) {
      continue; // preserva edição manual
    }
    merged[k] = v;
    if (v !== "") aiFields.add(k);
  }

  let features: string[];
  if (manualEdited.has("features")) {
    features = currentFeatures;
  } else {
    features = newDraft.features;
    if (features.length > 0) aiFields.add("features");
  }

  return { values: merged, features, aiFields };
}

const NUMERIC_FIELDS = new Set([
  "sale_price", "rent_price", "condominium_fee", "iptu", "bedrooms", "suites",
  "bathrooms", "parking_spaces", "private_area", "total_area", "external_area",
  "floor",
]);

/**
 * Converte os valores revisados (strings) para o `initial` do PropertyForm
 * (números como número, booleano, texto). city/neighborhood saem à parte.
 */
export function formValuesToInitial(values: FormValues): {
  initial: Record<string, unknown>;
  city: string;
  neighborhood: string;
} {
  const initial: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values)) {
    if (k === "city" || k === "neighborhood") continue;
    if (k === "accepts_financing") {
      initial[k] = v === "on";
      continue;
    }
    if (NUMERIC_FIELDS.has(k)) {
      if (v === "") continue;
      const n = Number(v);
      if (Number.isFinite(n)) initial[k] = n;
      continue;
    }
    if (v !== "") initial[k] = v;
  }
  return {
    initial,
    city: values.city ?? "",
    neighborhood: values.neighborhood ?? "",
  };
}
