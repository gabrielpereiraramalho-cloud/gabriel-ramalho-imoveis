import Script from "next/script";

/**
 * Google Analytics 4 (gtag.js) — carregado apenas no site público.
 * Não renderiza nada se o Measurement ID estiver ausente.
 * Usa strategy "afterInteractive" para não bloquear a renderização.
 */
export function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  if (!measurementId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}');
        `}
      </Script>
    </>
  );
}
