"use client";

import { useState } from "react";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Extrai apenas os dígitos e interpreta como valor inteiro em reais. */
function toValue(raw: string): number | null {
  const digits = raw.replace(/\D/g, "");
  if (digits === "") return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

function initialValue(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/**
 * Campo monetário com máscara brasileira (ex.: R$ 330.000,00).
 * Exibe formatado enquanto o usuário digita e envia o valor numérico em um
 * input hidden com o `name` do campo (a validação server-side não muda).
 */
export function CurrencyInput({
  id,
  name,
  defaultValue,
  className,
  placeholder,
}: {
  id: string;
  name: string;
  defaultValue?: unknown;
  className?: string;
  placeholder?: string;
}) {
  const [value, setValue] = useState<number | null>(
    initialValue(defaultValue),
  );

  return (
    <>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={value === null ? "" : brl.format(value)}
        onChange={(e) => setValue(toValue(e.target.value))}
        placeholder={placeholder ?? "R$ 0,00"}
        className={className}
      />
      <input type="hidden" name={name} value={value === null ? "" : String(value)} />
    </>
  );
}
