/**
 * Configuração da integração Órulo — lida SOMENTE no servidor.
 * Nunca usar NEXT_PUBLIC_* aqui: o Client Secret não pode ir ao browser.
 */
export const oruloConfig = {
  baseUrl: (process.env.ORULO_BASE_URL ?? "https://www.orulo.com.br").replace(
    /\/+$/,
    "",
  ),
  clientId: process.env.ORULO_CLIENT_ID ?? "",
  clientSecret: process.env.ORULO_CLIENT_SECRET ?? "",
};

export function isOruloConfigured(): boolean {
  return Boolean(oruloConfig.clientId && oruloConfig.clientSecret);
}

/**
 * Flag de PUBLICAÇÃO AUTOMÁTICA (default DESLIGADA). Enquanto off, nada é
 * publicado automaticamente — a publicação continua sendo manual pelo admin.
 * Só será consultada pelos fluxos automáticos (webhook/reconciliação) quando
 * estes forem habilitados, após validação manual.
 */
export function isOruloAutoPublishEnabled(): boolean {
  const v = (process.env.ORULO_AUTO_PUBLISH ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "on" || v === "yes";
}

/** Erro da integração — mensagens sempre sem secrets/tokens. */
export class OruloError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OruloError";
  }
}
