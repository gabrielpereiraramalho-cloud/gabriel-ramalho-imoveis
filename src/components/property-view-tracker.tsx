"use client";

import { useEffect, useRef } from "react";

import { trackPropertyView, type TrackedProperty } from "@/lib/analytics/events";

/**
 * Dispara `view_property`/`ViewContent` uma vez por visualização do imóvel.
 *
 * Os scripts do GA/Meta carregam com `afterInteractive`, podendo não estar
 * prontos quando o efeito roda. Por isso aguardamos (poll curto) até que
 * `gtag`/`fbq` existam, evitando perder o evento por corrida de inicialização.
 */
export function PropertyViewTracker({
  property,
}: {
  property: TrackedProperty;
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;

    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;

    const tryFire = () => {
      if (fired.current) return;
      const gaReady = typeof window.gtag === "function";
      const fbReady = typeof window.fbq === "function";
      if ((gaReady && fbReady) || attempts >= 20) {
        fired.current = true;
        trackPropertyView(property);
        return;
      }
      attempts += 1;
      timer = setTimeout(tryFire, 150);
    };

    tryFire();
    return () => clearTimeout(timer);
    // Dispara apenas na troca de imóvel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property.id]);

  return null;
}
