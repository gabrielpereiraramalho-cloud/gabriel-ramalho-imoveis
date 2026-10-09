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
  objectPosition = "50% 20%",
}: {
  src: string;
  alt: string;
  initials: string;
  /** Enquadramento do rosto (object-position) p/ alinhar as duas fotos. */
  objectPosition?: string;
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
          sizes="(max-width: 640px) 200px, 160px"
          className="object-cover"
          style={{ objectPosition }}
          onError={() => setOk(false)}
        />
      ) : null}
    </>
  );
}
