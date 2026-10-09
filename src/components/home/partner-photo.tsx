"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Foto de sócio com fallback elegante (iniciais sobre fundo da marca) caso o
 * arquivo não exista. Usado enquanto a foto definitiva não está em /public.
 */
export function PartnerPhoto({
  src,
  alt,
  initials,
}: {
  src: string;
  alt: string;
  initials: string;
}) {
  const [ok, setOk] = useState(true);
  return (
    <>
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-brand-navy/5 to-brand-navy/15">
        <span className="font-serif text-5xl font-semibold tracking-wide text-brand-navy/25">
          {initials}
        </span>
      </div>
      {ok ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 1024px) 100vw, 320px"
          className="object-cover object-top"
          onError={() => setOk(false)}
        />
      ) : null}
    </>
  );
}
