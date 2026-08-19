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
  "Imóveis selecionados para comprar, morar ou investir em João Pessoa e região. Atendimento personalizado com Gabriel Ramalho, CRECI-PB 19875.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Gabriel Ramalho Imóveis",
  title: {
    default: "Gabriel Ramalho Imóveis | Imóveis em João Pessoa",
    template: "%s | Gabriel Ramalho Imóveis",
  },
  description: DESCRIPTION,
  authors: [{ name: siteConfig.brand }],
  creator: siteConfig.brand,
  publisher: siteConfig.brand,
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Gabriel Ramalho Imóveis",
    title: "Gabriel Ramalho Imóveis | Imóveis em João Pessoa",
    description: DESCRIPTION,
    url: siteUrl,
    images: [{ url: defaultOgImage }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Gabriel Ramalho Imóveis | Imóveis em João Pessoa",
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
