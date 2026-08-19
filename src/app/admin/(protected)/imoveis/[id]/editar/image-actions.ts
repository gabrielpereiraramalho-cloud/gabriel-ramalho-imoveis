"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { getOrderedImages } from "./image-data";
import {
  EXT_BY_MIME,
  IMAGE_BUCKET,
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGES_PER_PROPERTY,
  isAllowedType,
  type ImageActionResult,
} from "./image-config";

type Supabase = SupabaseClient<Database>;

function revalidateEdit(propertyId: string) {
  revalidatePath(`/admin/imoveis/${propertyId}/editar`);
}

async function result(
  supabase: Supabase,
  propertyId: string,
  error?: string,
): Promise<ImageActionResult> {
  const images = await getOrderedImages(supabase, propertyId);
  return { images, error };
}

/** Reindexa `sort_order` das imagens (0..n) na ordem informada. */
async function reindex(
  supabase: Supabase,
  images: { id: string; sort_order: number }[],
): Promise<void> {
  await Promise.all(
    images.map((img, index) =>
      img.sort_order === index
        ? Promise.resolve()
        : supabase
            .from("property_images")
            .update({ sort_order: index })
            .eq("id", img.id),
    ),
  );
}

/**
 * Faz upload de UM arquivo para o Storage e cria o registro correspondente.
 * Validações (tipo/tamanho/quantidade/imóvel) são feitas no servidor.
 */
export async function uploadImage(
  propertyId: string,
  formData: FormData,
): Promise<ImageActionResult> {
  const supabase = await createClient();

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return result(supabase, propertyId, "Arquivo inválido.");
  }
  if (!isAllowedType(file.type)) {
    return result(
      supabase,
      propertyId,
      `Tipo não permitido (${file.type || "desconhecido"}). Use JPEG, PNG, WEBP ou AVIF.`,
    );
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return result(
      supabase,
      propertyId,
      `Arquivo acima do limite de ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)} MB.`,
    );
  }

  // Imóvel precisa existir.
  const { data: property } = await supabase
    .from("properties")
    .select("id, title")
    .eq("id", propertyId)
    .single();
  if (!property) {
    return result(supabase, propertyId, "Imóvel não encontrado.");
  }

  // Estado atual (para limite, sort_order e capa automática).
  const { data: existing } = await supabase
    .from("property_images")
    .select("sort_order")
    .eq("property_id", propertyId)
    .order("sort_order", { ascending: false });

  const currentCount = existing?.length ?? 0;
  if (currentCount >= MAX_IMAGES_PER_PROPERTY) {
    return result(
      supabase,
      propertyId,
      `Limite de ${MAX_IMAGES_PER_PROPERTY} imagens por imóvel atingido.`,
    );
  }

  const nextSort = currentCount === 0 ? 0 : (existing![0].sort_order ?? -1) + 1;
  const isCover = currentCount === 0;
  const ext = EXT_BY_MIME[file.type] ?? "bin";
  const storagePath = `properties/${propertyId}/${crypto.randomUUID()}.${ext}`;
  const altText = `${property.title} - foto ${nextSort + 1}`;

  const { error: uploadError } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    return result(
      supabase,
      propertyId,
      `Falha no upload: ${uploadError.message}`,
    );
  }

  const { error: insertError } = await supabase.from("property_images").insert({
    property_id: propertyId,
    storage_path: storagePath,
    alt_text: altText,
    sort_order: nextSort,
    is_cover: isCover,
  });

  if (insertError) {
    // Evita órfão: remove o arquivo recém-enviado.
    await supabase.storage.from(IMAGE_BUCKET).remove([storagePath]);
    return result(
      supabase,
      propertyId,
      `Falha ao registrar imagem: ${insertError.message}`,
    );
  }

  revalidateEdit(propertyId);
  return result(supabase, propertyId);
}

/** Define a imagem como capa (garantindo capa única). */
export async function setCoverImage(
  propertyId: string,
  imageId: string,
): Promise<ImageActionResult> {
  const supabase = await createClient();

  // Primeiro zera todas para não violar o índice único parcial.
  const { error: clearError } = await supabase
    .from("property_images")
    .update({ is_cover: false })
    .eq("property_id", propertyId);
  if (clearError) {
    return result(supabase, propertyId, `Erro ao trocar capa: ${clearError.message}`);
  }

  const { error: setError } = await supabase
    .from("property_images")
    .update({ is_cover: true })
    .eq("id", imageId)
    .eq("property_id", propertyId);
  if (setError) {
    return result(supabase, propertyId, `Erro ao definir capa: ${setError.message}`);
  }

  revalidateEdit(propertyId);
  return result(supabase, propertyId);
}

/** Persiste a nova ordem das imagens conforme a lista de ids. */
export async function reorderImages(
  propertyId: string,
  orderedIds: string[],
): Promise<ImageActionResult> {
  const supabase = await createClient();

  // `sort_order` não é único; atualiza direto para o índice final.
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("property_images")
        .update({ sort_order: index })
        .eq("id", id)
        .eq("property_id", propertyId),
    ),
  );

  revalidateEdit(propertyId);
  return result(supabase, propertyId);
}

/** Exclui uma imagem (Storage + banco), reindexa e reatribui capa se preciso. */
export async function deleteImage(
  propertyId: string,
  imageId: string,
): Promise<ImageActionResult> {
  const supabase = await createClient();

  const { data: image } = await supabase
    .from("property_images")
    .select("storage_path, is_cover")
    .eq("id", imageId)
    .eq("property_id", propertyId)
    .single();

  if (!image) {
    return result(supabase, propertyId, "Imagem não encontrada.");
  }

  await supabase.storage.from(IMAGE_BUCKET).remove([image.storage_path]);

  const { error: delError } = await supabase
    .from("property_images")
    .delete()
    .eq("id", imageId)
    .eq("property_id", propertyId);
  if (delError) {
    return result(supabase, propertyId, `Erro ao excluir: ${delError.message}`);
  }

  // Reindexa as restantes.
  const { data: remaining } = await supabase
    .from("property_images")
    .select("id, sort_order, is_cover")
    .eq("property_id", propertyId)
    .order("sort_order", { ascending: true });

  const rows = remaining ?? [];
  await reindex(
    supabase,
    rows.map((r) => ({ id: r.id, sort_order: r.sort_order })),
  );

  // Se a capa foi removida, promove a primeira restante.
  if (image.is_cover && rows.length > 0) {
    await supabase
      .from("property_images")
      .update({ is_cover: true })
      .eq("id", rows[0].id);
  }

  revalidateEdit(propertyId);
  return result(supabase, propertyId);
}
