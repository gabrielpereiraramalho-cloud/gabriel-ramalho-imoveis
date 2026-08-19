import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { IMAGE_BUCKET, type ManagedImage } from "./image-config";

type Supabase = SupabaseClient<Database>;

/**
 * Retorna as imagens de um imóvel ordenadas por `sort_order`, já com a URL
 * pública gerada a partir do `storage_path`.
 */
export async function getOrderedImages(
  supabase: Supabase,
  propertyId: string,
): Promise<ManagedImage[]> {
  const { data } = await supabase
    .from("property_images")
    .select("id, storage_path, alt_text, sort_order, is_cover")
    .eq("property_id", propertyId)
    .order("sort_order", { ascending: true });

  return (data ?? []).map((row) => ({
    id: row.id,
    storage_path: row.storage_path,
    alt_text: row.alt_text,
    sort_order: row.sort_order,
    is_cover: row.is_cover,
    url: supabase.storage.from(IMAGE_BUCKET).getPublicUrl(row.storage_path).data
      .publicUrl,
  }));
}
