"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import type {
  CityOption,
  FeatureOption,
  NeighborhoodOption,
} from "@/lib/properties/queries";
import { MultiSelectFilter } from "@/components/multi-select-filter";

export type PropertyFiltersValues = {
  q: string;
  finalidade: string[];
  tipo: string[];
  cidade: string[];
  bairro: string[];
  min: string;
  max: string;
  quartos: string[];
  vagas: string[];
  areaMin: string;
  areaMax: string;
  ordem: string;
  features: string[];
};

type Props = {
  cities: CityOption[];
  neighborhoods: NeighborhoodOption[];
  types: string[];
  features: FeatureOption[];
  values: PropertyFiltersValues;
};

const inputCls =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900";
const labelCls = "text-xs font-medium text-zinc-600";

export function PropertyFilters({
  cities,
  neighborhoods,
  types,
  features,
  values,
}: Props) {
  const [open, setOpen] = useState(false);

  const selectedFeatures = new Set(values.features);

  // Remove campos vazios da submissão para manter a URL limpa.
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    for (const el of Array.from(e.currentTarget.elements)) {
      if (
        (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) &&
        el.name &&
        el.type !== "checkbox" &&
        el.value === ""
      ) {
        el.disabled = true;
      }
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-brand-navy sm:hidden"
      >
        {open ? "Ocultar filtros" : "Filtros"}
      </button>

      <form
        method="get"
        action="/imoveis"
        onSubmit={handleSubmit}
        className={`${open ? "grid" : "hidden"} gap-4 rounded-lg border border-zinc-200 bg-white p-4 sm:grid`}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-2">
            <label htmlFor="q" className={labelCls}>
              Buscar imóvel
            </label>
            <input
              id="q"
              name="q"
              defaultValue={values.q}
              placeholder="Título ou código"
              className={inputCls}
            />
          </div>

          <MultiSelectFilter
            name="finalidade"
            label="Finalidade"
            placeholder="Todas"
            initial={values.finalidade}
            options={[
              { value: "sale", label: "Venda" },
              { value: "rent", label: "Aluguel" },
            ]}
          />

          <MultiSelectFilter
            name="tipo"
            label="Tipo"
            placeholder="Todos"
            initial={values.tipo}
            options={types.map((t) => ({ value: t, label: t }))}
          />

          <MultiSelectFilter
            name="cidade"
            label="Cidade"
            placeholder="Todas"
            initial={values.cidade}
            options={cities.map((c) => ({ value: c.slug, label: c.name }))}
          />

          <MultiSelectFilter
            name="bairro"
            label="Bairro"
            placeholder="Todos"
            initial={values.bairro}
            options={neighborhoods.map((n) => ({
              value: n.slug,
              label: n.name,
            }))}
          />

          <div className="flex flex-col gap-1">
            <label htmlFor="min" className={labelCls}>
              Preço mínimo
            </label>
            <input
              id="min"
              name="min"
              type="number"
              min="0"
              defaultValue={values.min}
              className={inputCls}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="max" className={labelCls}>
              Preço máximo
            </label>
            <input
              id="max"
              name="max"
              type="number"
              min="0"
              defaultValue={values.max}
              className={inputCls}
            />
          </div>

          <MultiSelectFilter
            name="quartos"
            label="Quartos"
            placeholder="Qualquer"
            initial={values.quartos}
            options={[
              { value: "1", label: "1" },
              { value: "2", label: "2" },
              { value: "3", label: "3" },
              { value: "4", label: "4+" },
            ]}
          />

          <MultiSelectFilter
            name="vagas"
            label="Vagas"
            placeholder="Qualquer"
            initial={values.vagas}
            options={[
              { value: "0", label: "0" },
              { value: "1", label: "1" },
              { value: "2", label: "2" },
              { value: "3", label: "3+" },
            ]}
          />

          <div className="flex flex-col gap-1">
            <label htmlFor="areaMin" className={labelCls}>
              Área mín. (m²)
            </label>
            <input
              id="areaMin"
              name="areaMin"
              type="number"
              min="0"
              defaultValue={values.areaMin}
              className={inputCls}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="areaMax" className={labelCls}>
              Área máx. (m²)
            </label>
            <input
              id="areaMax"
              name="areaMax"
              type="number"
              min="0"
              defaultValue={values.areaMax}
              className={inputCls}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="ordem" className={labelCls}>
              Ordenar por
            </label>
            <select
              id="ordem"
              name="ordem"
              defaultValue={values.ordem}
              className={inputCls}
            >
              <option value="recentes">Mais recentes</option>
              <option value="preco-asc">Menor preço</option>
              <option value="preco-desc">Maior preço</option>
              <option value="area-desc">Maior área</option>
            </select>
          </div>
        </div>

        {features.length > 0 ? (
          <fieldset className="flex flex-col gap-2">
            <legend className={labelCls}>
              Características (o imóvel deve ter todas as marcadas)
            </legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {features.map((f) => (
                <label
                  key={f.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="features"
                    value={f.slug}
                    defaultChecked={selectedFeatures.has(f.slug)}
                  />
                  {f.name}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-md bg-brand-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-navy-dark"
          >
            Buscar imóveis
          </button>
          <Link
            href="/imoveis"
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-brand-navy"
          >
            Limpar filtros
          </Link>
        </div>
      </form>
    </div>
  );
}
