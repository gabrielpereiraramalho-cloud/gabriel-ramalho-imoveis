"use client";

import { useEffect, useRef, useState } from "react";

export type MultiSelectOption = { value: string; label: string };

/**
 * Filtro multi-seleção compacto (popover com checkboxes) para uso em formulário
 * GET. Os checkboxes têm `name` fixo e enviam múltiplos valores na URL (lógica
 * OR dentro do grupo). Mantêm-se no DOM mesmo com o popover fechado para que a
 * seleção seja submetida normalmente.
 */
export function MultiSelectFilter({
  name,
  label,
  options,
  initial,
  placeholder = "Todas",
}: {
  name: string;
  label: string;
  options: MultiSelectOption[];
  initial: string[];
  placeholder?: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initial));
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const toggle = (value: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const chosen = options.filter((o) => selected.has(o.value));
  const summary =
    chosen.length === 0
      ? placeholder
      : chosen.length === 1
        ? chosen[0].label
        : `${chosen[0].label} +${chosen.length - 1}`;

  return (
    <div className="flex flex-col gap-1" ref={ref}>
      <span className="text-xs font-medium text-zinc-600">{label}</span>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex w-full items-center justify-between rounded-md border border-zinc-300 bg-white px-3 py-2 text-left text-sm text-zinc-900"
        >
          <span className={chosen.length === 0 ? "text-zinc-500" : undefined}>
            {summary}
          </span>
          <span aria-hidden="true" className="ml-2 text-zinc-400">
            ▾
          </span>
        </button>

        {/* Checkboxes reais: submetem mesmo com o popover fechado (hidden). */}
        <div
          role="listbox"
          aria-label={label}
          className={`${open ? "block" : "hidden"} absolute left-0 z-20 mt-1 max-h-60 w-full min-w-[12rem] overflow-auto rounded-md border border-zinc-200 bg-white p-2 shadow-lg`}
        >
          {chosen.length > 0 ? (
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="mb-1 w-full rounded px-2 py-1 text-left text-xs text-brand-navy hover:bg-zinc-50"
            >
              Limpar seleção
            </button>
          ) : null}
          {options.map((o) => (
            <label
              key={o.value}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-zinc-50"
            >
              <input
                type="checkbox"
                name={name}
                value={o.value}
                checked={selected.has(o.value)}
                onChange={() => toggle(o.value)}
              />
              {o.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
