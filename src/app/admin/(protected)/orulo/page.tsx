import type { ReactNode } from "react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { isOruloConfigured, isOruloAutoPublishEnabled } from "@/lib/orulo/config";
import { checkEligibility } from "@/lib/orulo/eligibility";
import { PublishControls } from "./publish-controls";
import { PublishEligibleButton } from "./publish-eligible-button";
import { SyncControls } from "./sync-controls";

// Permite que o lote de publicação rode além do limite curto padrão (quando o
// plano da Vercel permitir); cada chamada ainda publica um lote bounded.
export const maxDuration = 60;

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

function money(v: number | string | null): string {
  if (v === null || v === "") return "—";
  const n = Number(v);
  return Number.isNaN(n) ? "—" : brl.format(n);
}

// Exibição sempre em America/Sao_Paulo (o banco continua em UTC). A conversão
// usa timezone IANA — nunca ajuste manual de horas. Formato: 01/09/2026, 07:35:00
const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function dateTime(v: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : dateTimeFormatter.format(d);
}

const thCls = "px-3 py-2 text-left font-medium whitespace-nowrap";
const tdCls = "px-3 py-2 whitespace-nowrap";

export default async function OruloPage() {
  const configured = isOruloConfigured();
  const supabase = await createClient();

  // Contagens reais via count exato (head=true não traz linhas).
  const countBase = () =>
    supabase.from("orulo_buildings").select("external_id", {
      count: "exact",
      head: true,
    });

  // Conteúdo elegível (aproxima checkEligibility em SQL): campos essenciais
  // presentes, preço > 0 e ao menos uma imagem. Reutilizado em duas contagens.
  const contentEligible = () =>
    countBase()
      .not("name", "is", null)
      .not("city", "is", null)
      .not("neighborhood", "is", null)
      .not("status", "is", null)
      .gt("min_price", 0)
      .not("cover_image_id", "is", null);

  const listCols =
    "external_id, slug, name, city, neighborhood, min_price, status, cover_image_id, images, published, removed_at, in_distribution, last_event_status, last_event_at, synced_at";

  const [
    { data: currentRows, error: buildingsError },
    { data: historicRows },
    { data: runs },
    { data: webhookEvents },
    { count: totalCount },
    { count: publishedCount },
    { count: removedCount },
    { count: inDistributionCount },
    { count: outOfDistributionCount },
    { count: contentEligibleCount },
    { count: eligibleNowCount },
    { count: pendingCount },
  ] = await Promise.all([
    // Tabela principal: SOMENTE a distribuição atual (in_distribution=true e
    // não removidos). SP/RJ e fora-da-praça NÃO aparecem aqui.
    supabase
      .from("orulo_buildings")
      .select(listCols)
      .eq("in_distribution", true)
      .is("removed_at", null)
      .order("synced_at", { ascending: false })
      .limit(1000),
    // Histórico / Fora da distribuição: fora da distribuição OU removidos.
    supabase
      .from("orulo_buildings")
      .select(listCols)
      .or("in_distribution.eq.false,removed_at.not.is.null")
      .order("last_event_at", { ascending: false, nullsFirst: false })
      .limit(1000),
    supabase
      .from("orulo_sync_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(1),
    // Apenas leitura do que já está gravado (não chama a API da Órulo).
    supabase
      .from("orulo_webhook_events")
      .select("received_at, outcome, status")
      .order("received_at", { ascending: false })
      .limit(1),
    countBase(),
    countBase().eq("published", true),
    countBase().not("removed_at", "is", null),
    countBase().eq("in_distribution", true),
    // Fora da distribuição (mas NÃO removidos): in_distribution=false e removed_at nulo.
    countBase().eq("in_distribution", false).is("removed_at", null),
    contentEligible(),
    // Elegíveis PARA PUBLICAÇÃO AGORA (gate completo): conteúdo ok + em
    // distribuição + não removido + ainda não publicado.
    contentEligible()
      .eq("in_distribution", true)
      .is("removed_at", null)
      .eq("published", false),
    // Pendentes de publicação: em distribuição, não removidos, ainda não publicados.
    countBase()
      .eq("in_distribution", true)
      .is("removed_at", null)
      .eq("published", false),
  ]);

  const lastRun = runs?.[0] ?? null;
  const lastWebhook = webhookEvents?.[0] ?? null;
  const total = totalCount ?? 0;
  const removed = removedCount ?? 0;
  const pending = pendingCount ?? 0;
  const autoPublish = isOruloAutoPublishEnabled();

  return (
    <main className="flex flex-1 flex-col gap-6 p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Catálogo Órulo
          </h1>
          <p className="text-sm text-zinc-500">
            Integração e sincronização de empreendimentos
          </p>
          {/* Indicador read-only da flag ORULO_AUTO_PUBLISH (sem botão). */}
          <span className="mt-1">
            <Badge tone={autoPublish ? "success" : "neutral"}>
              Auto-publicação: {autoPublish ? "Ativa" : "Desativada"}
            </Badge>
          </span>
        </div>
        <Link href="/admin" className="text-sm text-zinc-500 hover:underline">
          ← Painel
        </Link>
      </div>

      {/* Status */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Credenciais">
          <Badge tone={configured ? "positive" : "neutral"}>
            {configured ? "Configurado" : "Não configurado"}
          </Badge>
        </Stat>
        <Stat
          label="Última reconciliação"
          value={dateTime(lastRun?.started_at ?? null)}
          hint="Sincronização completa (botão “Sincronizar agora”)"
        />
        <Stat label="Status da reconciliação">
          {lastRun ? (
            <Badge tone={lastRun.status === "success" ? "success" : "error"}>
              {lastRun.status === "success" ? "Sucesso" : "Erro"}
            </Badge>
          ) : (
            <span className="text-sm font-semibold text-zinc-400">—</span>
          )}
        </Stat>
        <Stat
          label="Último webhook recebido"
          hint="Atualização automática recebida da Órulo"
        >
          {lastWebhook ? (
            <>
              <span className="text-sm font-semibold text-zinc-900">
                {dateTime(lastWebhook.received_at)}
              </span>
              {lastWebhook.status ? (
                <span className="text-xs text-zinc-400">
                  evento: {lastWebhook.status}
                </span>
              ) : null}
            </>
          ) : (
            <span className="text-sm font-semibold text-zinc-400">—</span>
          )}
        </Stat>
        <Stat label="Status do último webhook">
          {lastWebhook ? (
            <Badge tone={outcomeTone(lastWebhook.outcome)}>
              {outcomeLabel(lastWebhook.outcome)}
            </Badge>
          ) : (
            <span className="text-sm font-semibold text-zinc-400">—</span>
          )}
        </Stat>
      </section>

      {/* Contagens reais (count exato no banco, não limitado pela listagem) */}
      <section className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-7">
        <Stat
          label="Total histórico no banco"
          value={String(total)}
          hint="Nunca apagado"
        />
        <Stat label="Em distribuição" value={String(inDistributionCount ?? 0)} />
        <Stat label="Publicados" value={String(publishedCount ?? 0)} />
        <Stat
          label="Pendentes de publicação"
          value={String(pending)}
          hint="Em distribuição, não publicados"
        />
        <Stat
          label="Elegíveis para publicação"
          value={String(eligibleNowCount ?? 0)}
          hint={`Gate completo · conteúdo ok: ${contentEligibleCount ?? 0}`}
        />
        <Stat
          label="Fora da distribuição"
          value={String(outOfDistributionCount ?? 0)}
          hint="Não removidos"
        />
        <Stat label="Removidos" value={String(removed)} />
      </section>

      {/* Publicação controlada dos empreendimentos já em distribuição */}
      {/* Bloco de publicação em lote só aparece quando há pendentes. */}
      {pending > 0 ? <PublishEligibleButton pending={pending} /> : null}

      {!configured ? (
        <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Defina <code>ORULO_CLIENT_ID</code> e <code>ORULO_CLIENT_SECRET</code>{" "}
          no <code>.env.local</code> (e depois na Vercel) para autenticar. O
          secret nunca vai ao browser.
        </p>
      ) : null}

      {lastRun ? (
        <section className="flex flex-wrap gap-4 text-sm text-zinc-600">
          <span>Páginas percorridas: {lastRun.pages_traversed ?? "—"}</span>
          <span>IDs encontrados: {lastRun.buildings_found ?? "—"}</span>
          <span>Criados: {lastRun.created_count ?? "—"}</span>
          <span>Atualizados: {lastRun.updated_count ?? "—"}</span>
          <span>Com imagens: {lastRun.images_fetched ?? "—"}</span>
          <span>Com plantas: {lastRun.floor_plans_fetched ?? "—"}</span>
          {lastRun.error_summary ? (
            <span className="text-red-600">Erro: {lastRun.error_summary}</span>
          ) : null}
        </section>
      ) : null}

      <SyncControls />

      {buildingsError ? (
        <p className="text-sm text-red-600">
          Erro ao carregar empreendimentos: {buildingsError.message}. Verifique
          se a migration da integração Órulo foi aplicada no Supabase.
        </p>
      ) : null}

      {/* Tabela principal: SOMENTE a distribuição atual (in_distribution=true,
          não removidos). SP/RJ e histórico ficam na seção abaixo. */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-zinc-900">
          Distribuição atual ({(currentRows ?? []).length})
        </h2>
        <div className="overflow-x-auto rounded border border-zinc-200">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className={thCls}>ID Órulo</th>
                <th className={thCls}>Nome</th>
                <th className={thCls}>Cidade</th>
                <th className={thCls}>Bairro</th>
                <th className={thCls}>Preço inicial</th>
                <th className={thCls}>Publicado</th>
                <th className={thCls}>Elegível</th>
                <th className={thCls}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {(currentRows ?? []).length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center text-zinc-500" colSpan={8}>
                    Nenhum empreendimento na distribuição atual.
                  </td>
                </tr>
              ) : (
                (currentRows ?? []).map((b) => {
                  const elig = checkEligibility(b);
                  return (
                    <tr key={b.external_id} className="border-t border-zinc-200">
                      <td className={tdCls}>{b.external_id}</td>
                      <td className={`${tdCls} max-w-xs truncate`}>
                        {b.name ?? "—"}
                      </td>
                      <td className={tdCls}>{b.city ?? "—"}</td>
                      <td className={tdCls}>{b.neighborhood ?? "—"}</td>
                      <td className={tdCls}>{money(b.min_price)}</td>
                      <td className={tdCls}>{b.published ? "Sim" : "Não"}</td>
                      <td className={tdCls}>
                        {elig.eligible ? (
                          "Sim"
                        ) : (
                          <span
                            className="text-amber-700"
                            title={elig.reasons.join(", ")}
                          >
                            Não
                          </span>
                        )}
                      </td>
                      <td className={tdCls}>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/orulo/preview/${b.external_id}`}
                            className="rounded border border-zinc-300 px-2 py-1 text-xs"
                          >
                            Prévia
                          </Link>
                          <PublishControls
                            externalId={b.external_id}
                            published={b.published}
                            eligible={elig.eligible}
                            reasons={elig.reasons}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Histórico / Fora da distribuição: fora da praça OU removidos. Sem botão
          Publicar (não podem ser publicados). Nada é apagado do banco. */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-zinc-900">
          Histórico / Fora da distribuição ({(historicRows ?? []).length})
        </h2>
        <p className="text-xs text-zinc-500">
          Registros fora de <code>/ids/active</code> (ex.: excluídos da praça) ou
          removidos. Mantidos apenas como histórico — não são publicáveis.
        </p>
        <div className="overflow-x-auto rounded border border-zinc-200">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className={thCls}>ID Órulo</th>
                <th className={thCls}>Nome</th>
                <th className={thCls}>Cidade</th>
                <th className={thCls}>Bairro</th>
                <th className={thCls}>Situação</th>
                <th className={thCls}>Último evento</th>
                <th className={thCls}>Data</th>
                <th className={thCls}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {(historicRows ?? []).length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center text-zinc-500" colSpan={8}>
                    Nenhum registro fora da distribuição.
                  </td>
                </tr>
              ) : (
                (historicRows ?? []).map((b) => {
                  const isRemoved = b.removed_at !== null;
                  return (
                    <tr key={b.external_id} className="border-t border-zinc-200">
                      <td className={tdCls}>{b.external_id}</td>
                      <td className={`${tdCls} max-w-xs truncate`}>
                        {b.name ?? "—"}
                      </td>
                      <td className={tdCls}>{b.city ?? "—"}</td>
                      <td className={tdCls}>{b.neighborhood ?? "—"}</td>
                      <td className={tdCls}>
                        {isRemoved ? (
                          <Badge tone="error">Removido</Badge>
                        ) : (
                          <Badge tone="neutral">Fora da distribuição</Badge>
                        )}
                      </td>
                      <td className={tdCls}>{b.last_event_status ?? "—"}</td>
                      <td className={tdCls}>
                        {dateTime(b.removed_at ?? b.last_event_at)}
                      </td>
                      <td className={tdCls}>
                        <Link
                          href={`/admin/orulo/preview/${b.external_id}`}
                          className="rounded border border-zinc-300 px-2 py-1 text-xs"
                        >
                          Prévia
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  hint,
  children,
}: {
  label: string;
  value?: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-zinc-200 bg-white p-4">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <div className="flex flex-col gap-1">
        {children ?? (
          <span className="text-sm font-semibold text-zinc-900">{value}</span>
        )}
      </div>
      {hint ? <span className="text-xs text-zinc-400">{hint}</span> : null}
    </div>
  );
}

type BadgeTone = "success" | "error" | "positive" | "neutral";

// Rótulo/tom legível para o `outcome` do webhook (dados já gravados).
function outcomeLabel(outcome: string | null): string {
  switch (outcome) {
    case "processed":
      return "Processado";
    case "ignored":
      return "Ignorado";
    case "noop":
      return "Sem ação";
    case "error":
      return "Erro";
    case null:
      return "—";
    default:
      return outcome.charAt(0).toUpperCase() + outcome.slice(1);
  }
}

function outcomeTone(outcome: string | null): BadgeTone {
  if (outcome === "processed") return "success";
  if (outcome === "error") return "error";
  return "neutral";
}

function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  const tones: Record<BadgeTone, string> = {
    success: "bg-green-50 text-green-700 ring-green-600/20",
    error: "bg-red-50 text-red-700 ring-red-600/20",
    positive: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    neutral: "bg-zinc-100 text-zinc-600 ring-zinc-500/20",
  };
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
