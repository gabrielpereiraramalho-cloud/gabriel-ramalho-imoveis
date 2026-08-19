"use client";

import { trackWhatsAppClick, type WhatsAppSource } from "@/lib/analytics/events";

/** Link de WhatsApp para CTAs gerais; dispara `whatsapp_click` + `Contact`. */
export function WhatsAppLink({
  href,
  source,
  className,
  children,
}: {
  href: string;
  source: WhatsAppSource;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackWhatsAppClick(source)}
      className={className}
    >
      {children}
    </a>
  );
}
