"use client";

import Image from "next/image";
import { useState } from "react";

import type { PropertyImage } from "@/lib/properties/queries";

export function PropertyGallery({ images }: { images: PropertyImage[] }) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[16/9] w-full items-center justify-center rounded-xl bg-offwhite text-sm text-zinc-400">
        Sem fotos disponíveis
      </div>
    );
  }

  const currentIndex = Math.min(active, images.length - 1);
  const current = images[currentIndex];

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-offwhite">
        <Image
          src={current.url}
          alt={current.alt}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 66vw"
          className="object-contain"
        />
        {images.length > 1 ? (
          <span className="absolute bottom-2 right-2 rounded-full bg-brand-navy/80 px-2.5 py-0.5 text-xs font-medium text-white lg:hidden">
            {currentIndex + 1} de {images.length}
          </span>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, index) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Ver foto ${index + 1}`}
              className={`relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-md border-2 ${
                index === active ? "border-brand-navy" : "border-transparent"
              }`}
            >
              <Image
                src={img.url}
                alt={img.alt}
                fill
                sizes="96px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
