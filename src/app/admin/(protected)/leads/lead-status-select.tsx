"use client";

import { useTransition } from "react";

import { LEAD_STATUSES, LEAD_STATUS_LABELS } from "@/lib/leads";
import { setLeadStatus } from "./actions";

export function LeadStatusSelect({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={status}
      disabled={pending}
      onChange={(e) =>
        startTransition(() => setLeadStatus(id, e.target.value))
      }
      className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs disabled:opacity-60"
    >
      {LEAD_STATUSES.map((s) => (
        <option key={s} value={s}>
          {LEAD_STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
