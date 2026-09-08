"use client";

import { useRef, useState } from "react";

import { publishEligibleBatch } from "./actions";

const BATCH_LIMIT = 15; // por chamada (bounded p/ não estourar timeout)
const MAX_ITERATIONS = 80; // trava de segurança (80 x 15 = 1200)

type Tally = {
  published: number;
  skipped: number;
  failed: number;
  remaining: number | null;
};

/**
 * Publica os empreendimentos elegíveis/em distribuição ainda não publicados em
 * LOTES sequenciais (a Server Action publica um lote com espaçamento/backoff;
 * o cliente repete até acabar). Interrompível (Parar) e reexecutável — como é
 * idempotente, retomar não duplica publication_links.
 */
export function PublishEligibleButton({ pending }: { pending: number }) {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [tally, setTally] = useState<Tally>({
    published: 0,
    skipped: 0,
    failed: 0,
    remaining: pending,
  });
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

    let published = 0;
    let skipped = 0;
    let failed = 0;
    const fails: { id: string; error: string }[] = [];

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      if (stopRef.current) break;
      const res = await publishEligibleBatch(BATCH_LIMIT);

      if (res.error) {
        setNotice(res.error);
        break;
      }

      published += res.published;
      skipped += res.skipped;
      failed += res.failed;
      for (const f of res.failures) fails.push(f);

      setTally({ published, skipped, failed, remaining: res.remaining });
      setFailures(fails.slice(-30));

      // Fim: nada pendente, ou lote sem progresso (evita loop com inelegíveis).
      if (res.remaining === 0 || res.published === 0) break;

      await new Promise((r) => setTimeout(r, 800)); // pausa entre lotes
    }

    setRunning(false);
    setDone(true);
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-zinc-900">
          Publicar elegíveis (em distribuição)
        </h2>
        <p className="text-xs text-zinc-500">
          Publica em lotes seguros os empreendimentos elegíveis, em distribuição
          e ainda não publicados. Idempotente: pode parar e retomar.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="inline-flex items-center gap-2 rounded-md bg-brand-navy px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-navy-dark disabled:opacity-60"
        >
          {running ? "Publicando…" : "Publicar elegíveis"}
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
        <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {notice}
        </p>
      ) : null}

      {running || done ? (
        <div className="flex flex-wrap gap-4 text-sm text-zinc-700">
          <span>Publicados: <strong>{tally.published}</strong></span>
          <span>Pulados: {tally.skipped}</span>
          <span className={tally.failed > 0 ? "text-red-600" : undefined}>
            Falhas: {tally.failed}
          </span>
          <span>Restantes: {tally.remaining ?? "—"}</span>
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
