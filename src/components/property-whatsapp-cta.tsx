import { siteConfig, whatsappUrl } from "@/lib/site";

/**
 * CTA de WhatsApp da página do imóvel. Usa NEXT_PUBLIC_WHATSAPP_NUMBER via
 * siteConfig. Se ausente, o CTA é ocultado (não quebra a página).
 */
export function PropertyWhatsappCta({
  title,
  code,
}: {
  title: string;
  code: string;
}) {
  const href = whatsappUrl(
    `Olá, ${siteConfig.brand}! Vi o imóvel ${title} - código ${code} no seu site e gostaria de mais informações.`,
  );
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center rounded-lg bg-brand-navy px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-navy-dark"
    >
      Tenho interesse neste imóvel
    </a>
  );
}
