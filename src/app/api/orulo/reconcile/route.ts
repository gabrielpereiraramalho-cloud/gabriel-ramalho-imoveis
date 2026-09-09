import { reconcileOrulo } from "@/lib/orulo/reconcile";

// Precisa de Node (libs server-only) e nunca deve ser cacheada.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function log(fields: Record<string, string | number | boolean | null | undefined>) {
  const parts = Object.entries({ at: new Date().toISOString(), ...fields }).map(
    ([k, v]) => `${k}=${v ?? "-"}`,
  );
  console.log(`[orulo-reconcile] ${parts.join(" ")}`);
}

/**
 * Reconciliação diária da Órulo (fallback do webhook). Disparada SOMENTE pelo
 * Vercel Cron. Protegida por CRON_SECRET: o Vercel Cron envia
 * `Authorization: Bearer <CRON_SECRET>`; aceitamos também `?token=<segredo>`
 * para acionamento manual controlado. Fail-closed se o segredo não existir.
 */
async function handle(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET ?? "";
  const auth = request.headers.get("authorization") ?? "";
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const authorized =
    secret !== "" && (auth === `Bearer ${secret}` || token === secret);
  if (!authorized) {
    log({ result: "401", reason: "não autorizado" });
    return new Response("unauthorized", { status: 401 });
  }

  try {
    const summary = await reconcileOrulo();
    log({
      result: "200",
      skipped: summary.skipped ?? false,
      reason: summary.reason,
      active: summary.activeCount,
      novos: summary.newUpserts,
      reativados: summary.reactivated,
      saidas: summary.leftDistribution,
      removidos: summary.removedApplied,
      publicados: summary.published,
      despublicados: summary.unpublished,
      falhas: summary.failures?.length ?? 0,
      erro: summary.error,
    });
    return Response.json(summary, { status: summary.ok ? 200 : 500 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "erro desconhecido";
    log({ result: "500", erro: msg });
    return new Response("reconcile error", { status: 500 });
  }
}

// Vercel Cron chama via GET; POST disponível para acionamento manual.
export const GET = handle;
export const POST = handle;
