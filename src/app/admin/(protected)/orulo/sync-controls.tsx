"use client";

import { useRef, useState } from "react";

import { runOruloSyncBatch, type SyncBatchResult } from "./actions";

const DETAIL_BATCH = 2; // detalhes por chamada (cabe no teto de ~10s do Hobby)
const MAX_ITERATIONS = 200; // trava de segurança
const MAX_CONSECUTIVE_ERRORS = 3; // para após N lotes seguidos sem retorno

type Tally = {
  found: number;
  created: number;
  updated: number;
  unchanged: number;
  failed: number;
  remaining: number | null;
  distributionSet: number;
  distributionCleared: number;
};

const emptyTally: Tally = {
  found: 0,
  created: 0,
  updated: 0,
  unchanged: 0,
  failed: 0,
  remaining: null,
  distributionSet: 0,
  distributionCleared: 0,
};

/**
 * "Sincronizar agora" — dispara a reconciliação incremental em LOTES pequenos
 * (a Server Action processa um lote com espaçamento/backoff; o cliente repete
 * até `remaining` = 0). Diferente do fluxo antigo, roda no cliente com
 * try/catch: uma falha de lote NÃO derruba a página ("This page couldn't load").
 * Interrompível (Parar) e reexecutável — idempotente.
 */
export function SyncControls() {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [tally, setTally] = useState<Tally>(emptyTally);
  const [failures, setFailures] = useState<{ id: string; error: string }[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [stopped, setStopped] = useState(false);
  const stopRef = useRef(false);

  async function run() {
    setRunning(true);
    setDone(false);
    setNotice(null);
    setFailures([]);
    setStopped(false);
    stopRef.current = false;

    let created = 0;
    let updated = 0;
    let failed = 0;
    let distributionSet = 0;
    let distributionCleared = 0;
    const fails: { id: string; error: string }[] = [];
    let lastRemaining: number | null = null;
    let consecutiveErrors = 0;

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      if (stopRef.current) break;

      let res: SyncBatchResult;
      try {
        res = await runOruloSyncBatch(DETAIL_BATCH);
        consecutiveErrors = 0;
      } catch {
        // Timeout/queda de rede de um lote. O progresso é commitado por
        // empreendimento (upsert individual), então RETOMA automaticamente: a
        // próxima chamada recomeça de onde parou. Só desiste após N seguidos.
        consecutiveErrors += 1;
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          setNotice(
            "Vários lotes seguidos falharam (possível limite de tempo/rede). Nada foi corrompido — clique em Sincronizar para retomar.",
          );
          break;
        }
        await new Promise((r) => setTimeout(r, 1200));
        continue;
      }

      if (res.error) {
        setNotice(res.error);
        break;
      }

      created += res.created;
      updated += res.updated;
      failed += res.failed;
      distributionSet += res.distributionSet;
      distributionCleared += res.distributionCleared;
      for (const f of res.failures) fails.push(f);

      setTally({
        found: res.found,
        created,
        updated,
        unchanged: res.unchanged,
        failed,
        remaining: res.remaining,
        distributionSet,
        distributionCleared,
      });
      setFailures(fails.slice(-30));

      if (res.remaining === 0) break;
      // Sem progresso (só falhas restantes) → para para não repetir em vão.
      if (lastRemaining !== null && res.remaining >= lastRemaining) {
        setNotice(
          `Parando: ${res.remaining} empreendimento(s) não puderam ser sincronizados nesta execução (ver falhas).`,
        );
        break;
      }
      lastRemaining = res.remaining;

      await new Promise((r) => setTimeout(r, 700)); // pausa entre lotes
    }

    setRunning(false);
    setDone(true);
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-zinc-900">Sincronizar agora</h2>
        <p className="text-xs text-zinc-500">
          Reconciliação incremental com a Órulo (<code>/ids/active</code> é a
          verdade da distribuição). Busca detalhe só de novos/alterados, em lotes
          seguros com backoff. Pode parar e retomar.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 disabled:opacity-60"
        >
          {running ? "Sincronizando…" : "Sincronizar agora"}
        </button>
        {running ? (
          <button
            type="button"
            onClick={() => {
              stopRef.current = true;
              setStopped(true);
            }}
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-brand-navy"
          >
            Parar
          </button>
        ) : null}
      </div>

      {notice ? (
        <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {notice}
        </p>
      ) : null}

      {running || done ? (
        <div className="flex flex-wrap gap-4 text-sm text-zinc-700">
          <span>Ativos: <strong>{tally.found}</strong></span>
          <span>Criados: {tally.created}</span>
          <span>Atualizados: {tally.updated}</span>
          <span>Sem mudança: {tally.unchanged}</span>
          <span className={tally.failed > 0 ? "text-red-600" : undefined}>
            Falhas: {tally.failed}
          </span>
          <span>Restantes: {tally.remaining ?? "—"}</span>
          {tally.distributionSet > 0 ? (
            <span>Reativados: {tally.distributionSet}</span>
          ) : null}
          {tally.distributionCleared > 0 ? (
            <span>Saíram da distribuição: {tally.distributionCleared}</span>
          ) : null}
          {done && !running ? (
            <span className="font-medium text-green-700">
              {stopped ? "Interrompido." : "Concluído."}
            </span>
          ) : null}
        </div>
      ) : null}

      {failures.length > 0 ? (
        <details className="text-xs text-zinc-600">
          <summary className="cursor-pointer">
            Ver falhas ({failures.length})
          </summary>
          <ul className="mt-2 flex flex-col gap-1">
            {failures.map((f, i) => (
              <li key={`${f.id}-${i}`}>
                <code>{f.id}</code>: {f.error}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
