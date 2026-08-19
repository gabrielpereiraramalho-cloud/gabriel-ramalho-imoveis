import type { PropertyPurpose } from "@/types/database";
import { siteConfig, whatsappUrl } from "@/lib/site";
import { PropertyPrice } from "./property-price";

/**
 * Barra fixa no rodapé da viewport (somente mobile) com preço + CTA WhatsApp.
 * Renderiza apenas se NEXT_PUBLIC_WHATSAPP_NUMBER estiver configurado.
 * O padding-bottom respeita a área segura do navegador.
 */
export function PropertyMobileCta({
  title,
  code,
  purpose,
  salePrice,
  rentPrice,
}: {
  title: string;
  code: string;
  purpose: PropertyPurpose;
  salePrice: number | null;
  rentPrice: number | null;
}) {
  const href = whatsappUrl(
    `Olá, ${siteConfig.brand}! Vi o imóvel ${title} - código ${code} no seu site e gostaria de mais informações.`,
  );
  if (!href) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-navy/10 bg-white/95 backdrop-blur lg:hidden"
      style={{
        paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom))",
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 pt-2.5">
        <PropertyPrice
          purpose={purpose}
          salePrice={salePrice}
          rentPrice={rentPrice}
          className="text-lg font-semibold text-brand-navy"
        />
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-md bg-brand-gold px-5 py-2.5 text-sm font-semibold text-brand-navy-dark transition-colors hover:bg-brand-gold-light"
        >
          Tenho interesse
        </a>
      </div>
    </div>
  );
}
