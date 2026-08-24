"use client";

import { useState, useTransition } from "react";

import {
  publishBuilding,
  unpublishBuilding,
  type PublishResult,
} from "./actions";

export function PublishControls({
  externalId,
  published,
  eligible,
  reasons,
}: {
  externalId: string;
  published: boolean;
  eligible: boolean;
  reasons: string[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<PublishResult>) => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Erro.");
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {published ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => unpublishBuilding(externalId))}
            className="rounded border border-zinc-300 px-2 py-1 text-xs disabled:opacity-60"
          >
            {pending ? "..." : "Despublicar"}
          </button>
        ) : (
          <button
            type="button"
            disabled={pending || !eligible}
            title={eligible ? undefined : `Inelegível: ${reasons.join(", ")}`}
            onClick={() => run(() => publishBuilding(externalId))}
            className="rounded bg-brand-navy px-2 py-1 text-xs font-medium text-white disabled:opacity-40"
          >
            {pending ? "..." : "Publicar"}
          </button>
        )}
      </div>
      {error ? (
        <span className="text-xs text-red-600" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
