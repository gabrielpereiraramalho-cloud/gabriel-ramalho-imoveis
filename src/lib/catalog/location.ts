/**
 * Normalização e correspondência de LOCALIZAÇÃO (cidade/bairro) para o catálogo
 * unificado. Reutilizável para todos os empreendimentos Órulo, cujo bairro/
 * cidade vêm como texto livre (ex.: "Altiplano Cabo Branco") e precisam casar
 * com os slugs dos filtros (ex.: "altiplano", "cabo-branco").
 *
 * Estratégia baseada em TOKENS normalizados (não substring ingênua):
 *  - cidade: igualdade da sequência normalizada (João Pessoa == Joao Pessoa),
 *    sem afrouxar entre cidades diferentes;
 *  - bairro: o filtro casa quando seus tokens aparecem como uma SUBSEQUÊNCIA
 *    CONTÍGUA (frase) nos tokens do bairro do empreendimento — assim
 *    "Altiplano Cabo Branco" casa com "Altiplano" e com "Cabo Branco", e
 *    "Jardim Cidade Universitária" casa com "Cidade Universitária", sem os
 *    falsos positivos de um `includes` cru (ex.: "alto" não casa "altiplano").
 */

/**
 * Normaliza um texto de localização em tokens: minúsculas, sem acentos, com
 * hífens/barras/vírgulas/pontuação tratados como separadores e espaços
 * colapsados. Serve tanto para o texto livre da Órulo quanto para os slugs dos
 * filtros ("cabo-branco" → ["cabo", "branco"]).
 */
export function normalizeLocationTokens(input: string | null | undefined): string[] {
  if (!input) return [];
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ") // hífen, barra, vírgula, pontuação → espaço
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/** String normalizada canônica (tokens unidos por espaço). */
export function normalizeLocation(input: string | null | undefined): string {
  return normalizeLocationTokens(input).join(" ");
}

/** `needle` aparece como subsequência contígua (frase) dentro de `hay`? */
function containsPhrase(hay: string[], needle: string[]): boolean {
  if (needle.length === 0 || needle.length > hay.length) return false;
  for (let i = 0; i + needle.length <= hay.length; i++) {
    let ok = true;
    for (let j = 0; j < needle.length; j++) {
      if (hay[i + j] !== needle[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

/**
 * Cidade do empreendimento casa com algum dos slugs selecionados (OR)?
 * Igualdade da sequência normalizada (tolerante a acento/caixa, estrita entre
 * cidades diferentes).
 */
export function cityMatchesAny(
  buildingCity: string | null | undefined,
  citySlugs: string[],
): boolean {
  if (citySlugs.length === 0) return true;
  const city = normalizeLocation(buildingCity);
  if (!city) return false;
  return citySlugs.some((slug) => normalizeLocation(slug) === city);
}

/**
 * Bairro do empreendimento casa com algum dos slugs selecionados (OR)?
 * Casa quando os tokens do filtro formam uma frase contígua dentro dos tokens
 * do bairro do empreendimento.
 */
export function neighborhoodMatchesAny(
  buildingNeighborhood: string | null | undefined,
  neighborhoodSlugs: string[],
): boolean {
  if (neighborhoodSlugs.length === 0) return true;
  const hay = normalizeLocationTokens(buildingNeighborhood);
  if (hay.length === 0) return false;
  return neighborhoodSlugs.some((slug) =>
    containsPhrase(hay, normalizeLocationTokens(slug)),
  );
}
