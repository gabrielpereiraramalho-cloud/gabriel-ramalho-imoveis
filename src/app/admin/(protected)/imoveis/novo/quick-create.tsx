"use client";

import { useState, useTransition } from "react";
import type { Tables } from "@/types/database";

import { createProperty } from "../actions";
import { PropertyForm } from "../property-form";
import { suggestPropertyDraft } from "./suggest-actions";
import {
  aiFieldsFromValues,
  applyRegenerate,
  draftToFormValues,
  formValuesToInitial,
  type FormValues,
} from "./quick-create-logic";

type Option = { id: string; name: string };
type FeatureOption = { id: string; name: string; slug: string; category: string | null };

type Field = { name: string; label: string; kind?: "text" | "number" | "textarea" | "checkbox" | "purpose" | "solar" };

const FIELDS: Field[] = [
  { name: "title", label: "Título" },
  { name: "property_type", label: "Tipo" },
  { name: "purpose", label: "Finalidade", kind: "purpose" },
  { name: "tag", label: "Tag" },
  { name: "sale_price", label: "Venda (R$)", kind: "number" },
  { name: "rent_price", label: "Aluguel (R$)", kind: "number" },
  { name: "condominium_fee", label: "Condomínio (R$)", kind: "number" },
  { name: "iptu", label: "IPTU (R$)", kind: "number" },
  { name: "city", label: "Cidade" },
  { name: "neighborhood", label: "Bairro" },
  { name: "address", label: "Endereço" },
  { name: "private_area", label: "Área privativa (m²)", kind: "number" },
  { name: "total_area", label: "Área total (m²)", kind: "number" },
  { name: "external_area", label: "Área externa (m²)", kind: "number" },
  { name: "bedrooms", label: "Quartos", kind: "number" },
  { name: "suites", label: "Suítes", kind: "number" },
  { name: "bathrooms", label: "Banheiros", kind: "number" },
  { name: "parking_spaces", label: "Vagas", kind: "number" },
  { name: "floor", label: "Andar", kind: "number" },
  { name: "solar_position", label: "Posição solar", kind: "solar" },
  { name: "accepts_financing", label: "Aceita financiamento", kind: "checkbox" },
  { name: "description", label: "Descrição", kind: "textarea" },
];

const inputCls =
  "rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export function QuickCreate({
  features,
  partners,
  aiConfigured,
}: {
  features: FeatureOption[];
  partners: Option[];
  aiConfigured: boolean;
}) {
  const [text, setText] = useState("");
  const [loading, startLoading] = useTransition();
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState(false);
  const [values, setValues] = useState<FormValues>({});
  const [featureSlugs, setFeatureSlugs] = useState<string[]>([]);
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());
  const [manualEdited, setManualEdited] = useState<Set<string>>(new Set());
  const [confirmations, setConfirmations] = useState<string[]>([]);

  // Chave para remontar o PropertyForm quando "Aplicar" injeta valores.
  const [formKey, setFormKey] = useState(0);
  const [applied, setApplied] = useState<{
    initial: Partial<Tables<"properties">>;
    city: string;
    neighborhood: string;
    featureIds: string[];
  } | null>(null);
  const slugToId = new Map(features.map((f) => [f.slug, f.id]));

  function runGenerate(regenerate: boolean) {
    setError("");
    startLoading(async () => {
      const res = await suggestPropertyDraft(text);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (regenerate && generated) {
        const r = applyRegenerate(values, featureSlugs, res.draft, manualEdited);
        setValues(r.values);
        setFeatureSlugs(r.features);
        setAiFields(r.aiFields);
      } else {
        const v = draftToFormValues(res.draft);
        setValues(v);
        setFeatureSlugs(res.draft.features);
        setAiFields(aiFieldsFromValues(v, res.draft.features));
        setManualEdited(new Set());
      }
      setConfirmations(res.confirmations);
      setGenerated(true);
    });
  }

  function editField(name: string, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
    setManualEdited((prev) => new Set(prev).add(name));
    setAiFields((prev) => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  }

  function applyToForm() {
    const { initial, city, neighborhood } = formValuesToInitial(values);
    const featureIds = featureSlugs
      .map((s) => slugToId.get(s))
      .filter((id): id is string => Boolean(id));
    setApplied({
      initial: initial as Partial<Tables<"properties">>,
      city,
      neighborhood,
      featureIds,
    });
    setFormKey((k) => k + 1);
  }

  const aiChip = (name: string) =>
    aiFields.has(name) ? (
      <span className="rounded bg-brand-gold/20 px-1 text-[10px] font-semibold uppercase tracking-wide text-brand-navy">
        IA
      </span>
    ) : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Painel do assistente */}
      <section className="flex flex-col gap-3 rounded border border-brand-navy/15 bg-offwhite/40 p-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold tracking-tight">
            Cadastro rápido por IA
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Escreva o imóvel com suas palavras. A IA sugere um rascunho para você
            revisar e aplicar — nada é salvo ou publicado automaticamente.
          </p>
        </div>

        {!aiConfigured ? (
          <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Assistente de IA indisponível: configuração ausente. O cadastro
            manual abaixo funciona normalmente.
          </p>
        ) : (
          <>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder="Ex.: Apartamento no Bessa, 65m², 2 quartos sendo 1 suíte, 1 vaga, aluguel 2600 e venda 360 mil."
              className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              disabled={loading}
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => runGenerate(false)}
                disabled={loading || text.trim() === ""}
                className="rounded bg-brand-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {loading ? "Gerando rascunho..." : "Gerar rascunho"}
              </button>
              {generated ? (
                <button
                  type="button"
                  onClick={() => runGenerate(true)}
                  disabled={loading}
                  className="rounded border border-brand-navy/30 px-4 py-2 text-sm font-medium text-brand-navy disabled:opacity-50"
                >
                  Gerar novamente
                </button>
              ) : null}
            </div>
            {error ? (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}

            {generated ? (
              <div className="flex flex-col gap-3">
                {confirmations.length > 0 ? (
                  <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                    <p className="font-semibold">Informações a confirmar</p>
                    <ul className="ml-4 list-disc">
                      {confirmations.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <p className="text-xs text-zinc-500">
                  Revise os campos. O marcador{" "}
                  <span className="rounded bg-brand-gold/20 px-1 text-[10px] font-semibold uppercase text-brand-navy">
                    IA
                  </span>{" "}
                  some quando você edita o campo. Depois clique em “Aplicar ao
                  formulário”.
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  {FIELDS.map((f) => (
                    <div key={f.name} className="flex flex-col gap-1">
                      <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-600">
                        {f.label}
                        {aiChip(f.name)}
                      </label>
                      {f.kind === "textarea" ? (
                        <textarea
                          value={values[f.name] ?? ""}
                          onChange={(e) => editField(f.name, e.target.value)}
                          rows={3}
                          className={inputCls}
                        />
                      ) : f.kind === "checkbox" ? (
                        <input
                          type="checkbox"
                          checked={values[f.name] === "on"}
                          onChange={(e) =>
                            editField(f.name, e.target.checked ? "on" : "")
                          }
                        />
                      ) : f.kind === "purpose" ? (
                        <select
                          value={values[f.name] ?? ""}
                          onChange={(e) => editField(f.name, e.target.value)}
                          className={inputCls}
                        >
                          <option value="">—</option>
                          <option value="sale">Venda</option>
                          <option value="rent">Aluguel</option>
                        </select>
                      ) : f.kind === "solar" ? (
                        <select
                          value={values[f.name] ?? ""}
                          onChange={(e) => editField(f.name, e.target.value)}
                          className={inputCls}
                        >
                          <option value="">—</option>
                          <option value="nascente">Nascente</option>
                          <option value="sul">Sul</option>
                          <option value="norte">Norte</option>
                          <option value="poente">Poente</option>
                          <option value="nascente_sul">Nascente/Sul</option>
                          <option value="other">Outro</option>
                        </select>
                      ) : (
                        <input
                          value={values[f.name] ?? ""}
                          onChange={(e) => editField(f.name, e.target.value)}
                          className={inputCls}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-600">
                    Características {aiChip("features")}
                  </span>
                  <p className="text-sm text-zinc-700">
                    {featureSlugs.length > 0
                      ? featureSlugs.join(", ")
                      : "nenhuma identificada"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={applyToForm}
                  className="w-fit rounded bg-brand-gold px-4 py-2 text-sm font-semibold text-brand-navy-dark"
                >
                  Aplicar ao formulário
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>

      {/* Formulário manual existente (pré-preenchido após "Aplicar"). */}
      <PropertyForm
        key={formKey}
        action={createProperty}
        submitLabel="Criar imóvel"
        features={features}
        partners={partners}
        initial={applied?.initial}
        initialCity={applied?.city}
        initialNeighborhood={applied?.neighborhood}
        selectedFeatureIds={applied?.featureIds}
      />
      <p className="rounded border border-zinc-200 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
        Salve o imóvel primeiro para adicionar fotos.
      </p>
    </div>
  );
}
