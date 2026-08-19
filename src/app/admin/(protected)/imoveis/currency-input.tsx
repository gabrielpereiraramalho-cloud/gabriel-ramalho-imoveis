"use client";

import { useState, type ChangeEvent } from "react";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function initialValue(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/**
 * Calcula o novo valor em REAIS inteiros a partir do texto do campo e do valor
 * atual.
 *
 * O display formatado sempre é `reais + ",00"` (centavos decorativos, não
 * editáveis). A digitação é em reais: comparamos a quantidade de dígitos do
 * texto com a quantidade esperada (dígitos do valor atual + 2 dos centavos)
 * para saber se o usuário acrescentou (append) ou apagou (backspace) — evitando
 * que os dígitos digitados caiam na casa dos centavos. Sem vírgula (campo
 * recém-digitado, colado ou limpo), os dígitos já são os reais.
 */
function nextReais(raw: string, current: number | null): number | null {
  const digits = raw.replace(/\D/g, "");
  const cur = current === null ? "" : String(current);

  let reais: string;
  if (!raw.includes(",")) {
    reais = digits;
  } else {
    const expectedLen = cur.length + 2; // + "00" dos centavos renderizados
    if (digits.length > expectedLen) {
      reais = cur + digits.slice(expectedLen); // acrescentou dígito(s)
    } else if (digits.length < expectedLen) {
      const removed = expectedLen - digits.length; // apagou do fim
      reais = cur.slice(0, Math.max(0, cur.length - removed));
    } else {
      reais = cur;
    }
  }

  reais = reais.replace(/^0+/, "");
  return reais === "" ? null : Number(reais);
}

/**
 * Campo monetário com máscara brasileira em reais inteiros (ex.: R$ 330.000,00).
 * Exibe formatado enquanto o usuário digita e envia o valor numérico (reais,
 * sem centavos) em um input hidden com o `name` do campo.
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
  const [value, setValue] = useState<number | null>(initialValue(defaultValue));

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setValue(nextReais(e.target.value, value));
  };

  return (
    <>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={value === null ? "" : brl.format(value)}
        onChange={handleChange}
        placeholder={placeholder ?? "R$ 0,00"}
        className={className}
      />
      <input
        type="hidden"
        name={name}
        value={value === null ? "" : String(value)}
      />
    </>
  );
}
