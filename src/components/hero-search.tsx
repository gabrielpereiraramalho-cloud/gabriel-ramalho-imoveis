"use client";

import { useState, type FormEvent } from "react";

import type {
  CityOption,
  NeighborhoodOption,
} from "@/lib/properties/queries";

const fieldCls =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900";
const labelCls =
  "text-[11px] font-semibold uppercase tracking-wide text-zinc-500";

export function HeroSearch({
  cities,
  neighborhoods,
  types,
}: {
  cities: CityOption[];
  neighborhoods: NeighborhoodOption[];
  types: string[];
}) {
  const [citySlug, setCitySlug] = useState("");
  const [neighborhoodSlug, setNeighborhoodSlug] = useState("");

  const selectedCity = cities.find((c) => c.slug === citySlug);
  const visibleNeighborhoods = selectedCity
    ? neighborhoods.filter((n) => n.city_id === selectedCity.id)
    : neighborhoods;

  // Remove campos vazios para manter a URL limpa.
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    for (const el of Array.from(e.currentTarget.elements)) {
      if (el instanceof HTMLSelectElement && el.name && el.value === "") {
        el.disabled = true;
      }
    }
  }

  return (
    <form
      method="get"
      action="/imoveis"
      onSubmit={handleSubmit}
      className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-[0_10px_30px_-18px_rgba(11,46,89,0.35)] sm:grid-cols-2 lg:grid-cols-5 lg:items-end"
    >
      <label className="flex flex-col gap-1">
        <span className={labelCls}>Finalidade</span>
        <select name="finalidade" className={fieldCls} defaultValue="">
          <option value="">Todas</option>
          <option value="sale">Venda</option>
          <option value="rent">Aluguel</option>
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className={labelCls}>Cidade</span>
        <select
          name="cidade"
          value={citySlug}
          onChange={(e) => {
            setCitySlug(e.target.value);
            setNeighborhoodSlug("");
          }}
          className={fieldCls}
        >
          <option value="">Todas</option>
          {cities.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className={labelCls}>Bairro</span>
        <select
          name="bairro"
          value={neighborhoodSlug}
          onChange={(e) => setNeighborhoodSlug(e.target.value)}
          className={fieldCls}
        >
          <option value="">Todos</option>
          {visibleNeighborhoods.map((n) => (
            <option key={n.id} value={n.slug}>
              {n.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className={labelCls}>Tipo</span>
        <select name="tipo" className={fieldCls} defaultValue="">
          <option value="">Todos</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        className="rounded-md bg-brand-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-navy-dark sm:col-span-2 lg:col-span-1"
      >
        Buscar imóveis
      </button>
    </form>
  );
}
