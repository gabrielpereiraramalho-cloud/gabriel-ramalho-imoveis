/**
 * Gera um slug amigável a partir de um texto: minúsculo, sem acentos,
 * espaços/símbolos convertidos em hífens.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
