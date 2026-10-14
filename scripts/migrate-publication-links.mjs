// ---------------------------------------------------------------------------
// Backfill ÚNICO e SEGURO dos publication_links da Órulo após a migração de
// domínio (gabrielramalhoimoveis.com.br → www.ramalhonexo.com.br).
//
// Os publication_links NÃO são persistidos no banco: vivem apenas na Órulo. Os
// empreendimentos publicados foram enviados com a URL do domínio ANTIGO. Como
// publishBuildingCore é idempotente (não reenvia links de quem já está
// publicado), trocar NEXT_PUBLIC_SITE_URL sozinho não atualiza a Órulo — daí
// este backfill.
//
// GARANTIAS:
//   • Só reescreve publication_links (PUT substitui a lista, 1 link ativo).
//   • NÃO toca em published, in_distribution, removed_at, eligibility, slug.
//   • NÃO escreve NADA no Supabase (apenas LEITURA para listar os publicados).
//   • Idempotente: rodar N vezes deixa o mesmo estado (a URL final é a mesma).
//   • Espaçamento entre chamadas + backoff/Retry-After em HTTP 429.
//   • DRY-RUN por padrão: sem `--execute` nada é enviado à Órulo.
//
// USO (a partir da raiz do projeto, com .env.local preenchido):
//   node scripts/migrate-publication-links.mjs            # dry-run (não envia)
//   node scripts/migrate-publication-links.mjs --execute  # aplica na Órulo
//   node scripts/migrate-publication-links.mjs --site=https://www.ramalhonexo.com.br --execute
//
// O domínio-alvo vem de (nesta ordem): --site=<url> | NEXT_PUBLIC_SITE_URL |
// fallback https://www.ramalhonexo.com.br. O script imprime qual usou.
// ---------------------------------------------------------------------------
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// --- args --------------------------------------------------------------------
const args = process.argv.slice(2);
const EXECUTE = args.includes("--execute");
const siteArg = args.find((a) => a.startsWith("--site="))?.slice("--site=".length);

// --- env (.env.local) --------------------------------------------------------
function loadEnv(path) {
  const out = {};
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return out;
  }
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}
const fileEnv = loadEnv(".env.local");
const env = { ...fileEnv, ...process.env };

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET = env.SUPABASE_SECRET_KEY;
const ORULO_BASE = (env.ORULO_BASE_URL || "https://www.orulo.com.br").replace(/\/+$/, "");
const ORULO_CLIENT_ID = env.ORULO_CLIENT_ID;
const ORULO_CLIENT_SECRET = env.ORULO_CLIENT_SECRET;
const SITE = (siteArg || env.NEXT_PUBLIC_SITE_URL || "https://www.ramalhonexo.com.br").replace(/\/+$/, "");

function fail(msg) {
  console.error(`ERRO: ${msg}`);
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_SECRET) fail("Supabase não configurado (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY).");
if (!ORULO_CLIENT_ID || !ORULO_CLIENT_SECRET) fail("Órulo não configurado (ORULO_CLIENT_ID / ORULO_CLIENT_SECRET).");
if (!/^https:\/\/.+/.test(SITE)) fail(`Domínio-alvo inválido: ${SITE}`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SPACING_MS = 350; // ~3 req/s
const MAX_429_RETRIES = 4; // respeita Retry-After; senão 1s,2s,4s,8s
const MAX_BACKOFF_MS = 8000;

// --- Órulo OAuth (client_credentials) ---------------------------------------
let token = null;
async function getToken() {
  if (token) return token;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: ORULO_CLIENT_ID,
    client_secret: ORULO_CLIENT_SECRET,
  });
  const res = await fetch(`${ORULO_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
  });
  if (!res.ok) fail(`Falha na autenticação Órulo (HTTP ${res.status}).`);
  const json = await res.json();
  if (!json.access_token) fail("Resposta de token sem access_token.");
  token = json.access_token;
  return token;
}

// PUT publication_links com backoff em 429. Substitui a lista por 1 link ativo.
async function putLink(buildingId, url) {
  const path = `/api/v2/buildings/${buildingId}/publication_links`;
  for (let attempt = 0; ; attempt++) {
    const t = await getToken();
    const res = await fetch(`${ORULO_BASE}${path}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${t}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ publication_links: [{ url, active: true }] }),
    });
    if (res.status === 401 && attempt === 0) {
      token = null; // renova token uma vez
      continue;
    }
    if (res.status === 429 && attempt < MAX_429_RETRIES) {
      const ra = Number(res.headers.get("retry-after"));
      const waitMs = Number.isFinite(ra) && ra > 0
        ? Math.min(ra * 1000, MAX_BACKOFF_MS)
        : Math.min(1000 * 2 ** attempt, MAX_BACKOFF_MS);
      await sleep(waitMs);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return;
  }
}

// --- LEITURA Supabase: empreendimentos publicados ----------------------------
async function loadPublished() {
  const db = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("orulo_buildings")
      .select("external_id, slug, published, in_distribution, removed_at")
      .eq("published", true)
      .order("external_id", { ascending: true })
      .range(from, from + 999);
    if (error) fail(`Erro ao ler orulo_buildings: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

// --- main --------------------------------------------------------------------
async function main() {
  console.log("=".repeat(70));
  console.log("Backfill de publication_links da Órulo");
  console.log(`Domínio-alvo : ${SITE}`);
  console.log(`Órulo base   : ${ORULO_BASE}`);
  console.log(`Modo         : ${EXECUTE ? "EXECUÇÃO (envia PUT à Órulo)" : "DRY-RUN (não envia nada)"}`);
  console.log("=".repeat(70));

  const published = await loadPublished();
  const targets = published.filter((r) => r.slug); // sem slug não há URL pública
  const semSlug = published.length - targets.length;

  console.log(`Publicados no banco: ${published.length}`);
  if (semSlug > 0) console.log(`  (ignorados por não terem slug: ${semSlug})`);
  console.log(`A atualizar        : ${targets.length}`);
  console.log("");
  console.log("URLs que serão gravadas (amostra até 10):");
  for (const r of targets.slice(0, 10)) {
    console.log(`  #${r.external_id} → ${SITE}/empreendimento/${r.slug}`);
  }
  if (targets.length > 10) console.log(`  … e mais ${targets.length - 10}.`);
  console.log("");

  if (!EXECUTE) {
    console.log("DRY-RUN: nenhuma chamada foi feita à Órulo. Rode com --execute para aplicar.");
    return;
  }

  let ok = 0;
  let failN = 0;
  const failures = [];
  for (const r of targets) {
    const url = `${SITE}/empreendimento/${r.slug}`;
    try {
      await putLink(r.external_id, url);
      ok += 1;
      console.log(`  ok   #${r.external_id} → ${url}`);
    } catch (err) {
      failN += 1;
      const msg = err instanceof Error ? err.message : "erro";
      failures.push({ id: r.external_id, error: msg });
      console.log(`  FALHA #${r.external_id}: ${msg}`);
    }
    await sleep(SPACING_MS);
  }

  console.log("");
  console.log("-".repeat(70));
  console.log(`Concluído. Sucesso: ${ok} | Falhas: ${failN} | Total: ${targets.length}`);
  if (failures.length > 0) {
    console.log("Falhas (reexecute o script para reprocessar — é idempotente):");
    for (const f of failures) console.log(`  #${f.id}: ${f.error}`);
    process.exitCode = 1;
  }
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
