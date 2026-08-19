import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { GoogleAnalytics } from "@/components/google-analytics";
import { MetaPixel } from "@/components/meta-pixel";
import { siteConfig } from "@/lib/site";

export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col bg-offwhite text-zinc-900">
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
      <GoogleAnalytics measurementId={siteConfig.gaMeasurementId} />
      <MetaPixel pixelId={siteConfig.metaPixelId} />
    </div>
  );
}
