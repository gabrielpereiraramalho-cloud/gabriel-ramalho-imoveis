import type { Metadata, Viewport } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import "./globals.css";

import { defaultOgImage, siteConfig, siteUrl } from "@/lib/site";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const DESCRIPTION =
  "Gabriel Ramalho — Corretor de Imóveis, CRECI-PB 19875. Imóveis selecionados para comprar, morar ou investir em João Pessoa e região. Apartamentos, casas e lançamentos com atendimento próximo.";

const TITLE = "Gabriel Ramalho | Corretor de Imóveis em João Pessoa";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteConfig.responsibleBroker,
  title: {
    default: TITLE,
    template: "%s | Gabriel Ramalho",
  },
  description: DESCRIPTION,
  authors: [{ name: siteConfig.responsibleBroker }],
  creator: siteConfig.responsibleBroker,
  publisher: siteConfig.responsibleBroker,
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Gabriel Ramalho — Corretor de Imóveis",
    title: TITLE,
    description: DESCRIPTION,
    url: siteUrl,
    images: [{ url: defaultOgImage }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [defaultOgImage],
  },
};

export const viewport: Viewport = {
  themeColor: "#0b2e59",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${manrope.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
