"use client";

import { useActionState, useState } from "react";

import { slugify } from "@/lib/slug";
import type { Tables } from "@/types/database";
import {
  PROPERTY_PURPOSES,
  PROPERTY_STATUSES,
  PURPOSE_LABELS,
  SOLAR_LABELS,
  SOLAR_POSITIONS,
  STATUS_LABELS,
  type PropertyFormState,
} from "./schema";
import { CurrencyInput } from "./currency-input";

type Option = { id: string; name: string };
type FeatureOption = { id: string; name: string; category: string | null };

type Props = {
  action: (
    prevState: PropertyFormState,
    formData: FormData,
  ) => Promise<PropertyFormState>;
  submitLabel: string;
  features: FeatureOption[];
  partners: Option[];
  initial?: Partial<Tables<"properties">>;
  initialCity?: string;
  initialNeighborhood?: string;
  selectedFeatureIds?: string[];
};

const dv = (v: unknown): string =>
  v === null || v === undefined ? "" : String(v);

const inputCls =
  "rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";
const legendCls = "text-sm font-semibold text-zinc-700 dark:text-zinc-300";
const fieldsetCls =
  "flex flex-col gap-4 rounded border border-zinc-200 p-4 dark:border-zinc-800";

export function PropertyForm({
  action,
  submitLabel,
  features,
  partners,
  initial,
  initialCity,
  initialNeighborhood,
  selectedFeatureIds,
}: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const init = initial ?? {};
  const fe = state.fieldErrors ?? {};

  const [title, setTitle] = useState<string>(dv(init.title));
  const [slug, setSlug] = useState<string>(dv(init.slug));
  const [slugTouched, setSlugTouched] = useState<boolean>(Boolean(init.slug));

  const selected = new Set(selectedFeatureIds ?? []);

  const renderError = (name: string) =>
    fe[name] ? (
      <p className="text-xs text-red-600" role="alert">
        {fe[name]}
      </p>
    ) : null;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error ? (
        <p
          className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      {/* Identificação */}
      <fieldset className={fieldsetCls}>
        <legend className={legendCls}>Identificação</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="code" className="text-sm font-medium">
              Código *
            </label>
            <input
              id="code"
              name="code"
              defaultValue={dv(init.code)}
              className={inputCls}
            />
            {renderError("code")}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="property_type" className="text-sm font-medium">
              Tipo do imóvel *
            </label>
            <input
              id="property_type"
              name="property_type"
              placeholder="Apartamento, Casa, Terreno..."
              defaultValue={dv(init.property_type)}
              className={inputCls}
            />
            {renderError("property_type")}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="title" className="text-sm font-medium">
              Título *
            </label>
            <input
              id="title"
              name="title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              className={inputCls}
            />
            {renderError("title")}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="slug" className="text-sm font-medium">
              Slug
            </label>
            <input
              id="slug"
              name="slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
              className={inputCls}
            />
            <span className="text-xs text-zinc-500">
              Deixe vazio para gerar a partir do título.
            </span>
            {renderError("slug")}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="purpose" className="text-sm font-medium">
              Finalidade *
            </label>
            <select
              id="purpose"
              name="purpose"
              defaultValue={dv(init.purpose)}
              className={inputCls}
            >
              <option value="">Selecione...</option>
              {PROPERTY_PURPOSES.map((p) => (
                <option key={p} value={p}>
                  {PURPOSE_LABELS[p]}
                </option>
              ))}
            </select>
            {renderError("purpose")}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="status" className="text-sm font-medium">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={dv(init.status) || "available"}
              className={inputCls}
            >
              {PROPERTY_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            {renderError("status")}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="tag" className="text-sm font-medium">
              Tag
            </label>
            <input
              id="tag"
              name="tag"
              defaultValue={dv(init.tag)}
              className={inputCls}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="featured"
              defaultChecked={Boolean(init.featured)}
            />
            Destaque
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="active"
              defaultChecked={init.active ?? true}
            />
            Ativo
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="published"
              defaultChecked={Boolean(init.published_at)}
            />
            Publicado
          </label>
        </div>
      </fieldset>

      {/* Valores */}
      <fieldset className={fieldsetCls}>
        <legend className={legendCls}>Valores</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="sale_price" className="text-sm font-medium">
              Preço de venda
            </label>
            <CurrencyInput
              id="sale_price"
              name="sale_price"
              defaultValue={init.sale_price}
              className={inputCls}
            />
            {renderError("sale_price")}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="rent_price" className="text-sm font-medium">
              Preço de aluguel
            </label>
            <CurrencyInput
              id="rent_price"
              name="rent_price"
              defaultValue={init.rent_price}
              className={inputCls}
            />
            {renderError("rent_price")}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="condominium_fee" className="text-sm font-medium">
              Condomínio
            </label>
            <CurrencyInput
              id="condominium_fee"
              name="condominium_fee"
              defaultValue={init.condominium_fee}
              className={inputCls}
            />
            {renderError("condominium_fee")}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="iptu" className="text-sm font-medium">
              IPTU
            </label>
            <CurrencyInput
              id="iptu"
              name="iptu"
              defaultValue={init.iptu}
              className={inputCls}
            />
            {renderError("iptu")}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="accepts_financing"
            defaultChecked={Boolean(init.accepts_financing)}
          />
          Aceita financiamento
        </label>
      </fieldset>

      {/* Localização */}
      <fieldset className={fieldsetCls}>
        <legend className={legendCls}>Localização</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="city" className="text-sm font-medium">
              Cidade
            </label>
            <input
              id="city"
              name="city"
              defaultValue={initialCity ?? ""}
              placeholder="Ex.: João Pessoa"
              className={inputCls}
            />
            {renderError("city")}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="neighborhood" className="text-sm font-medium">
              Bairro
            </label>
            <input
              id="neighborhood"
              name="neighborhood"
              defaultValue={initialNeighborhood ?? ""}
              placeholder="Ex.: Bessa"
              className={inputCls}
            />
            {renderError("neighborhood")}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="address" className="text-sm font-medium">
              Endereço
            </label>
            <input
              id="address"
              name="address"
              defaultValue={dv(init.address)}
              className={inputCls}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="address_number" className="text-sm font-medium">
              Número
            </label>
            <input
              id="address_number"
              name="address_number"
              defaultValue={dv(init.address_number)}
              className={inputCls}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="complement" className="text-sm font-medium">
              Complemento
            </label>
            <input
              id="complement"
              name="complement"
              defaultValue={dv(init.complement)}
              className={inputCls}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="postal_code" className="text-sm font-medium">
              CEP
            </label>
            <input
              id="postal_code"
              name="postal_code"
              defaultValue={dv(init.postal_code)}
              className={inputCls}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="latitude" className="text-sm font-medium">
              Latitude
            </label>
            <input
              id="latitude"
              name="latitude"
              defaultValue={dv(init.latitude)}
              className={inputCls}
            />
            {renderError("latitude")}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="longitude" className="text-sm font-medium">
              Longitude
            </label>
            <input
              id="longitude"
              name="longitude"
              defaultValue={dv(init.longitude)}
              className={inputCls}
            />
            {renderError("longitude")}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="show_exact_address"
            defaultChecked={Boolean(init.show_exact_address)}
          />
          Exibir endereço completo
        </label>
      </fieldset>

      {/* Medidas */}
      <fieldset className={fieldsetCls}>
        <legend className={legendCls}>Medidas</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="private_area" className="text-sm font-medium">
              Área privativa (m²)
            </label>
            <input
              id="private_area"
              name="private_area"
              type="number"
              step="0.01"
              min="0"
              defaultValue={dv(init.private_area)}
              className={inputCls}
            />
            {renderError("private_area")}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="total_area" className="text-sm font-medium">
              Área total (m²)
            </label>
            <input
              id="total_area"
              name="total_area"
              type="number"
              step="0.01"
              min="0"
              defaultValue={dv(init.total_area)}
              className={inputCls}
            />
            {renderError("total_area")}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="external_area" className="text-sm font-medium">
              Área externa (m²)
            </label>
            <input
              id="external_area"
              name="external_area"
              type="number"
              step="0.01"
              min="0"
              defaultValue={dv(init.external_area)}
              className={inputCls}
            />
            {renderError("external_area")}
          </div>
        </div>
      </fieldset>

      {/* Cômodos */}
      <fieldset className={fieldsetCls}>
        <legend className={legendCls}>Cômodos</legend>
        <div className="grid gap-4 sm:grid-cols-5">
          <div className="flex flex-col gap-1">
            <label htmlFor="bedrooms" className="text-sm font-medium">
              Quartos
            </label>
            <input
              id="bedrooms"
              name="bedrooms"
              type="number"
              min="0"
              defaultValue={dv(init.bedrooms ?? 0)}
              className={inputCls}
            />
            {renderError("bedrooms")}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="suites" className="text-sm font-medium">
              Suítes
            </label>
            <input
              id="suites"
              name="suites"
              type="number"
              min="0"
              defaultValue={dv(init.suites ?? 0)}
              className={inputCls}
            />
            {renderError("suites")}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="bathrooms" className="text-sm font-medium">
              Banheiros
            </label>
            <input
              id="bathrooms"
              name="bathrooms"
              type="number"
              min="0"
              defaultValue={dv(init.bathrooms ?? 0)}
              className={inputCls}
            />
            {renderError("bathrooms")}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="parking_spaces" className="text-sm font-medium">
              Vagas
            </label>
            <input
              id="parking_spaces"
              name="parking_spaces"
              type="number"
              min="0"
              defaultValue={dv(init.parking_spaces ?? 0)}
              className={inputCls}
            />
            {renderError("parking_spaces")}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="floor" className="text-sm font-medium">
              Andar
            </label>
            <input
              id="floor"
              name="floor"
              type="number"
              defaultValue={dv(init.floor)}
              className={inputCls}
            />
            {renderError("floor")}
          </div>
        </div>
      </fieldset>

      {/* Orientação */}
      <fieldset className={fieldsetCls}>
        <legend className={legendCls}>Orientação</legend>
        <div className="flex flex-col gap-1 sm:max-w-xs">
          <label htmlFor="solar_position" className="text-sm font-medium">
            Posição solar
          </label>
          <select
            id="solar_position"
            name="solar_position"
            defaultValue={dv(init.solar_position)}
            className={inputCls}
          >
            <option value="">Não informada</option>
            {SOLAR_POSITIONS.map((s) => (
              <option key={s} value={s}>
                {SOLAR_LABELS[s]}
              </option>
            ))}
          </select>
          {renderError("solar_position")}
        </div>
      </fieldset>

      {/* Descrição */}
      <fieldset className={fieldsetCls}>
        <legend className={legendCls}>Descrição</legend>
        <textarea
          id="description"
          name="description"
          rows={5}
          defaultValue={dv(init.description)}
          className={inputCls}
        />
      </fieldset>

      {/* Vídeos */}
      <fieldset className={fieldsetCls}>
        <legend className={legendCls}>Vídeos</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="youtube_url" className="text-sm font-medium">
              YouTube
            </label>
            <input
              id="youtube_url"
              name="youtube_url"
              defaultValue={dv(init.youtube_url)}
              className={inputCls}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="instagram_url" className="text-sm font-medium">
              Instagram
            </label>
            <input
              id="instagram_url"
              name="instagram_url"
              defaultValue={dv(init.instagram_url)}
              className={inputCls}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="virtual_tour_url" className="text-sm font-medium">
              Tour virtual
            </label>
            <input
              id="virtual_tour_url"
              name="virtual_tour_url"
              defaultValue={dv(init.virtual_tour_url)}
              className={inputCls}
            />
          </div>
        </div>
      </fieldset>

      {/* Parceiro/captador */}
      <fieldset className={fieldsetCls}>
        <legend className={legendCls}>Parceiro/captador</legend>
        <div className="flex flex-col gap-1 sm:max-w-md">
          <label htmlFor="partner_id" className="text-sm font-medium">
            Parceiro
          </label>
          <select
            id="partner_id"
            name="partner_id"
            defaultValue={dv(init.partner_id)}
            className={inputCls}
          >
            <option value="">Nenhum</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      {/* Características */}
      <fieldset className={fieldsetCls}>
        <legend className={legendCls}>Características</legend>
        {features.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Nenhuma característica cadastrada.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-3">
            {features.map((f) => (
              <label key={f.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="features"
                  value={f.id}
                  defaultChecked={selected.has(f.id)}
                />
                {f.name}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-zinc-900"
        >
          {pending ? "Salvando..." : submitLabel}
        </button>
        <a
          href="/admin/imoveis"
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
        >
          Cancelar
        </a>
      </div>
    </form>
  );
}
