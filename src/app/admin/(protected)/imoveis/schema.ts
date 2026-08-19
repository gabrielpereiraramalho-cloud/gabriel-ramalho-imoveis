import { slugify } from "@/lib/slug";
import type {
  PropertyPurpose,
  PropertyStatus,
  SolarPosition,
  TablesInsert,
} from "@/types/database";

export const PROPERTY_PURPOSES = ["sale", "rent"] as const;
export const PROPERTY_STATUSES = [
  "available",
  "reserved",
  "sold",
  "rented",
  "hidden",
] as const;
export const SOLAR_POSITIONS = [
  "nascente",
  "sul",
  "norte",
  "poente",
  "nascente_sul",
  "other",
] as const;

export const PURPOSE_LABELS: Record<PropertyPurpose, string> = {
  sale: "Venda",
  rent: "Aluguel",
};

export const STATUS_LABELS: Record<PropertyStatus, string> = {
  available: "Disponível",
  reserved: "Reservado",
  sold: "Vendido",
  rented: "Alugado",
  hidden: "Oculto",
};

export const SOLAR_LABELS: Record<SolarPosition, string> = {
  nascente: "Nascente",
  sul: "Sul",
  norte: "Norte",
  poente: "Poente",
  nascente_sul: "Nascente/Sul",
  other: "Outro",
};

/** Estado retornado pelas Server Actions do formulário de imóvel. */
export type PropertyFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export type ParsedProperty = {
  values: TablesInsert<"properties">;
  featureIds: string[];
  fieldErrors: Record<string, string>;
};

/**
 * Faz o parse e a validação server-side dos dados do formulário de imóvel.
 * Não confia na validação do navegador. Mensagens em português.
 */
export function parsePropertyForm(formData: FormData): ParsedProperty {
  const fieldErrors: Record<string, string> = {};

  const str = (k: string): string => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  const strOrNull = (k: string): string | null => {
    const v = str(k);
    return v === "" ? null : v;
  };
  const bool = (k: string): boolean => {
    const v = formData.get(k);
    return v === "on" || v === "true";
  };

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

  const reqInt = (k: string, label: string): number => {
    const raw = str(k);
    if (raw === "") return 0;
    const n = Number(raw);
    if (!Number.isInteger(n)) {
      fieldErrors[k] = `${label} deve ser um número inteiro.`;
      return 0;
    }
    if (n < 0) {
      fieldErrors[k] = `${label} não pode ser negativo.`;
      return 0;
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
    return n;
  };

  const optCoord = (k: string, label: string): number | null => {
    const raw = str(k);
    if (raw === "") return null;
    const n = Number(raw.replace(",", "."));
    if (Number.isNaN(n)) {
      fieldErrors[k] = `${label} inválido.`;
      return null;
    }
    return n;
  };

  // Identificação
  const code = str("code");
  const title = str("title");
  const slugRaw = str("slug");
  const property_type = str("property_type");
  const purposeRaw = str("purpose");
  const statusRaw = str("status") || "available";
  const solarRaw = str("solar_position");

  if (!code) fieldErrors.code = "Código é obrigatório.";
  if (!title) fieldErrors.title = "Título é obrigatório.";
  if (!property_type)
    fieldErrors.property_type = "Tipo do imóvel é obrigatório.";

  const slug = slugRaw ? slugify(slugRaw) : slugify(title);
  if (!slug) fieldErrors.slug = "Slug inválido. Preencha o título ou o slug.";

  if (!(PROPERTY_PURPOSES as readonly string[]).includes(purposeRaw)) {
    fieldErrors.purpose = "Finalidade inválida.";
  }
  if (!(PROPERTY_STATUSES as readonly string[]).includes(statusRaw)) {
    fieldErrors.status = "Status inválido.";
  }
  if (solarRaw && !(SOLAR_POSITIONS as readonly string[]).includes(solarRaw)) {
    fieldErrors.solar_position = "Posição solar inválida.";
  }

  const values: TablesInsert<"properties"> = {
    code,
    title,
    slug,
    property_type,
    purpose: purposeRaw as PropertyPurpose,
    status: statusRaw as PropertyStatus,
    featured: bool("featured"),
    tag: strOrNull("tag"),
    active: bool("active"),
    description: strOrNull("description"),

    // Valores
    sale_price: optDecimal("sale_price", "Preço de venda"),
    rent_price: optDecimal("rent_price", "Preço de aluguel"),
    condominium_fee: optDecimal("condominium_fee", "Condomínio"),
    iptu: optDecimal("iptu", "IPTU"),
    accepts_financing: bool("accepts_financing"),

    // Localização
    city_id: strOrNull("city_id"),
    neighborhood_id: strOrNull("neighborhood_id"),
    address: strOrNull("address"),
    address_number: strOrNull("address_number"),
    complement: strOrNull("complement"),
    postal_code: strOrNull("postal_code"),
    latitude: optCoord("latitude", "Latitude"),
    longitude: optCoord("longitude", "Longitude"),
    show_exact_address: bool("show_exact_address"),

    // Medidas
    private_area: optDecimal("private_area", "Área privativa"),
    total_area: optDecimal("total_area", "Área total"),
    external_area: optDecimal("external_area", "Área externa"),

    // Cômodos
    bedrooms: reqInt("bedrooms", "Quartos"),
    suites: reqInt("suites", "Suítes"),
    bathrooms: reqInt("bathrooms", "Banheiros"),
    parking_spaces: reqInt("parking_spaces", "Vagas"),
    floor: optInt("floor", "Andar"),

    // Orientação
    solar_position: solarRaw ? (solarRaw as SolarPosition) : null,

    // Vídeos
    youtube_url: strOrNull("youtube_url"),
    instagram_url: strOrNull("instagram_url"),
    virtual_tour_url: strOrNull("virtual_tour_url"),

    // Parceiro
    partner_id: strOrNull("partner_id"),
  };

  const featureIds = formData
    .getAll("features")
    .filter((v): v is string => typeof v === "string" && v !== "");

  return { values, featureIds, fieldErrors };
}
