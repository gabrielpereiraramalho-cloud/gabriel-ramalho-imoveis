import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site";
import { listPublicPropertySlugs } from "@/lib/properties/queries";

// Gerado sob demanda (consulta o Supabase); evita dependência de rede no build.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    {
      url: absoluteUrl("/imoveis"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/politica-de-privacidade"),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  const properties = await listPublicPropertySlugs();
  const propertyRoutes: MetadataRoute.Sitemap = properties.map((p) => ({
    url: absoluteUrl(`/imovel/${p.slug}`),
    lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...propertyRoutes];
}
