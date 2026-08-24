import "server-only";

import { oruloPut } from "./client";

/**
 * publication_links da Órulo (token da imobiliária). Contrato confirmado:
 * PUT /api/v2/buildings/{id}/publication_links
 * body: { publication_links: [{ url, active: true }] }  (substitui a lista)
 * Para remover, envia lista vazia.
 */
export async function setPublicationLinks(
  buildingId: string,
  urls: string[],
): Promise<void> {
  await oruloPut(`/api/v2/buildings/${buildingId}/publication_links`, {
    publication_links: urls.map((url) => ({ url, active: true })),
  });
}

export async function clearPublicationLinks(buildingId: string): Promise<void> {
  await oruloPut(`/api/v2/buildings/${buildingId}/publication_links`, {
    publication_links: [],
  });
}
