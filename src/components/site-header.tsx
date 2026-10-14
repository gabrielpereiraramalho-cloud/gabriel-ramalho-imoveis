"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { brandSymbol, siteConfig, whatsappUrl } from "@/lib/site";
import { trackWhatsAppClick } from "@/lib/analytics/events";

const NAV_LINKS: { label: string; href: string }[] = [
  { label: "Início", href: "/" },
  { label: "Imóveis", href: "/imoveis" },
  { label: "Comprar", href: "/imoveis?finalidade=sale" },
  { label: "Alugar", href: "/imoveis?finalidade=rent" },
  { label: "Bairros", href: "/#bairros" },
  { label: "Sobre", href: "/#sobre" },
];

function BrandLogo() {
  const [imgOk, setImgOk] = useState(true);
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 sm:gap-3"
      aria-label={`${siteConfig.responsibleBroker} — ${siteConfig.brokerRole} — página inicial`}
    >
      {/* Símbolo RN isolado (fundo transparente) — mantém a identidade visual
          sem exibir a marca como imobiliária responsável. */}
      {imgOk ? (
        <Image
          src={brandSymbol}
          alt="Símbolo RN"
          width={1536}
          height={1024}
          priority
          sizes="60px"
          onError={() => setImgOk(false)}
          className="h-10 w-auto sm:h-11 lg:h-12"
        />
      ) : null}
      {/* Identificação pública: quem exerce a atividade imobiliária (PF). */}
      <span className="flex flex-col leading-tight">
        <span className="font-serif text-base font-semibold tracking-tight text-brand-navy sm:text-lg">
          {siteConfig.responsibleBroker}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-brand-navy/60 sm:text-[11px]">
          {siteConfig.brokerRole}{" "}
          <span className="text-brand-gold">|</span> {siteConfig.creci}
        </span>
      </span>
    </Link>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const wa = whatsappUrl(
    "Olá! Gostaria de mais informações sobre os imóveis.",
  );

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/70 bg-offwhite/85 backdrop-blur supports-[backdrop-filter]:bg-offwhite/70">
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8 lg:py-4">
        <BrandLogo />

        <nav className="hidden items-center gap-8 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[15px] font-medium text-brand-navy/80 transition-colors hover:text-brand-navy"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackWhatsAppClick("header")}
              className="hidden rounded-full bg-brand-navy px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-navy-dark sm:inline-flex"
            >
              Falar no WhatsApp
            </a>
          ) : null}

          <button
            type="button"
            aria-label="Abrir menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center justify-center rounded p-2 text-brand-navy lg:hidden"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              {open ? (
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open ? (
        <nav className="border-t border-zinc-200/70 bg-offwhite lg:hidden">
          <ul className="mx-auto flex w-full max-w-[1440px] flex-col px-4 py-2">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block py-2 text-sm font-medium text-brand-navy"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            {wa ? (
              <li>
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    trackWhatsAppClick("header");
                    setOpen(false);
                  }}
                  className="mt-2 inline-flex rounded-full bg-brand-navy px-4 py-2 text-sm font-medium text-white"
                >
                  Falar no WhatsApp
                </a>
              </li>
            ) : null}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
