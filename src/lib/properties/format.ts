import type {
  PropertyPurpose,
  PropertyStatus,
  SolarPosition,
} from "@/types/database";

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

/** Status que merecem um selo visual no card/detalhe. */
export const HIGHLIGHTED_STATUSES: PropertyStatus[] = [
  "reserved",
  "sold",
  "rented",
];

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

/** Converte valores numeric (que podem vir como string) para number|null. */
export function toNum(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

/** Formata em BRL sem centavos; null vira "Consulte". */
export function formatBRL(value: number | null): string {
  return value === null ? "Consulte" : brl.format(value);
}

/** Preço principal conforme a finalidade (aluguel adiciona "/mês"). */
export function mainPriceLabel(
  purpose: PropertyPurpose,
  salePrice: number | null,
  rentPrice: number | null,
): string {
  if (purpose === "rent") {
    return rentPrice === null ? "Consulte" : `${brl.format(rentPrice)}/mês`;
  }
  return formatBRL(salePrice);
}
