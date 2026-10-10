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
  "Ramalho Nexo · Negócios Imobiliários — imóveis selecionados para comprar, morar ou investir em João Pessoa e região. Apartamentos, casas e lançamentos com atendimento próximo. Corretor responsável: Gabriel Ramalho (CRECI-PB 19875).";

const TITLE = "Ramalho Nexo | Imóveis em João Pessoa";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Ramalho Nexo",
  title: {
    default: TITLE,
    template: "%s | Ramalho Nexo",
  },
  description: DESCRIPTION,
  authors: [{ name: siteConfig.brand }],
  creator: siteConfig.brand,
  publisher: siteConfig.brand,
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Ramalho Nexo",
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
