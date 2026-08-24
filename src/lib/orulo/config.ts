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

/** Erro da integração — mensagens sempre sem secrets/tokens. */
export class OruloError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OruloError";
  }
}
