"use client";

import { useActionState, useEffect, useRef } from "react";

import { whatsappUrl } from "@/lib/site";
import { OWNER_PROPERTY_TYPES } from "@/lib/leads";
import { trackOwnerLead } from "@/lib/analytics/events";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { submitOwnerLead, type OwnerLeadState } from "./actions";

const inputCls =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900";
const labelCls = "text-sm font-medium text-brand-navy";

function SuccessPanel({
  tracking,
}: {
  tracking: OwnerLeadState["tracking"];
}) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    if (tracking) trackOwnerLead(tracking);
  }, [tracking]);

  const wa = whatsappUrl(
    "Olá, Gabriel Ramalho! Acabei de enviar as informações do meu imóvel pelo site e gostaria de continuar o atendimento por aqui.",
  );

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6">
      <h2 className="font-serif text-2xl font-semibold text-brand-navy">
        Recebi as informações do seu imóvel.
      </h2>
      <p className="text-zinc-700">
        Entrarei em contato para entender os detalhes e avaliar a melhor
        estratégia de divulgação.
      </p>
      {wa ? (
        <WhatsAppLink
          href={wa}
          source="owner_lead_success"
          className="inline-flex w-fit rounded-md bg-brand-gold px-6 py-3 text-sm font-semibold text-brand-navy-dark transition-colors hover:bg-brand-gold-light"
        >
          Continuar pelo WhatsApp
        </WhatsAppLink>
      ) : null}
    </div>
  );
}

export function OwnerLeadForm() {
  const [state, formAction, pending] = useActionState<OwnerLeadState, FormData>(
    submitOwnerLead,
    {},
  );
  const fe = state.fieldErrors ?? {};

  if (state.ok) {
    return <SuccessPanel tracking={state.tracking} />;
  }

  const err = (name: string) =>
    fe[name] ? (
      <p className="text-xs text-red-600" role="alert">
        {fe[name]}
      </p>
    ) : null;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error ? (
        <p
          className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      {/* Honeypot invisível (não preencher) */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="company">Não preencha este campo</label>
        <input
          id="company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className={labelCls}>
            Nome *
          </label>
          <input id="name" name="name" maxLength={120} className={inputCls} />
          {err("name")}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="phone" className={labelCls}>
            WhatsApp *
          </label>
          <input
            id="phone"
            name="phone"
            inputMode="tel"
            maxLength={40}
            placeholder="(83) 90000-0000"
            className={inputCls}
          />
          {err("phone")}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="property_type" className={labelCls}>
            Tipo do imóvel *
          </label>
          <select
            id="property_type"
            name="property_type"
            defaultValue=""
            className={inputCls}
          >
            <option value="">Selecione...</option>
            {OWNER_PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {err("property_type")}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="city" className={labelCls}>
            Cidade *
          </label>
          <input id="city" name="city" maxLength={120} className={inputCls} />
          {err("city")}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="neighborhood" className={labelCls}>
            Bairro *
          </label>
          <input
            id="neighborhood"
            name="neighborhood"
            maxLength={120}
            className={inputCls}
          />
          {err("neighborhood")}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="estimated_value" className={labelCls}>
            Valor aproximado
          </label>
          <input
            id="estimated_value"
            name="estimated_value"
            type="number"
            min="0"
            step="0.01"
            className={inputCls}
          />
          {err("estimated_value")}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="bedrooms" className={labelCls}>
            Quartos
          </label>
          <input
            id="bedrooms"
            name="bedrooms"
            type="number"
            min="0"
            className={inputCls}
          />
          {err("bedrooms")}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="area" className={labelCls}>
            Área aproximada (m²)
          </label>
          <input
            id="area"
            name="area"
            type="number"
            min="0"
            step="0.01"
            className={inputCls}
          />
          {err("area")}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="message" className={labelCls}>
          Mensagem / observações
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          maxLength={2000}
          className={inputCls}
        />
        {err("message")}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md bg-brand-navy px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-navy-dark disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Enviar informações"}
      </button>
    </form>
  );
}
