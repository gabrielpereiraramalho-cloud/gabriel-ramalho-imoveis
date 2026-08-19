import type { Metadata } from "next";

import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Política de Privacidade | Gabriel Ramalho Imóveis",
};

export default function PoliticaDePrivacidadePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-16">
      <h1 className="font-serif text-3xl font-semibold text-brand-navy">
        Política de Privacidade
      </h1>
      <p className="text-zinc-700">
        Os dados eventualmente informados neste site (como nome, telefone e
        e-mail em contatos) são utilizados exclusivamente para o atendimento
        relacionado a imóveis e não são compartilhados com terceiros para fins
        de marketing.
      </p>
      <p className="text-zinc-700">
        Para dúvidas sobre o tratamento das suas informações, entre em contato
        com {siteConfig.brand}
        {siteConfig.contactEmail ? ` pelo e-mail ${siteConfig.contactEmail}` : ""}.
      </p>
    </main>
  );
}
