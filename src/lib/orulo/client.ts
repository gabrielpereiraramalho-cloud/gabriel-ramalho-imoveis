import "server-only";

import { OruloError, isOruloConfigured, oruloConfig } from "./config";

/**
 * Cliente HTTP server-side da Órulo.
 * - Autenticação: POST /oauth/token (application/x-www-form-urlencoded),
 *   grant_type=client_credentials com client_id/client_secret no BODY.
 * - Token reaproveitado em memória enquanto válido.
 * - Catálogo sob /api/v2/. Nunca loga secret/token.
 */

type TokenCache = { token: string; expiresAt: number } | null;
let tokenCache: TokenCache = null;

async function fetchToken(): Promise<string> {
  if (!isOruloConfigured()) {
    throw new OruloError(
      "Órulo não configurado: defina ORULO_CLIENT_ID e ORULO_CLIENT_SECRET.",
    );
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: oruloConfig.clientId,
    client_secret: oruloConfig.clientSecret,
  });

  const res = await fetch(`${oruloConfig.baseUrl}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new OruloError(`Falha na autenticação Órulo (HTTP ${res.status}).`);
  }

  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!json.access_token) {
    throw new OruloError("Resposta de token da Órulo sem access_token.");
  }

  const expiresIn =
    typeof json.expires_in === "number" ? json.expires_in : 3600;
  tokenCache = {
    token: json.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
  };
  return json.access_token;
}

async function getAccessToken(): Promise<string> {
  // margem de 30s para não usar token à beira de expirar
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) {
    return tokenCache.token;
  }
  return fetchToken();
}

/** GET autenticado em uma rota da Órulo (ex.: "/api/v2/config"). */
export async function oruloGet<T>(path: string): Promise<T> {
  const doFetch = async (token: string) =>
    fetch(`${oruloConfig.baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    });

  let token = await getAccessToken();
  let res = await doFetch(token);

  // Token pode ter expirado no servidor da Órulo: renova uma vez.
  if (res.status === 401) {
    tokenCache = null;
    token = await getAccessToken();
    res = await doFetch(token);
  }

  if (!res.ok) {
    throw new OruloError(`Órulo GET ${path} falhou (HTTP ${res.status}).`);
  }

  return (await res.json()) as T;
}

/** PUT autenticado (JSON) em uma rota da Órulo. Retorna o status HTTP. */
export async function oruloPut(path: string, body: unknown): Promise<void> {
  const doFetch = async (token: string) =>
    fetch(`${oruloConfig.baseUrl}${path}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

  let token = await getAccessToken();
  let res = await doFetch(token);
  if (res.status === 401) {
    tokenCache = null;
    token = await getAccessToken();
    res = await doFetch(token);
  }

  if (!res.ok) {
    throw new OruloError(`Órulo PUT ${path} falhou (HTTP ${res.status}).`);
  }
}
