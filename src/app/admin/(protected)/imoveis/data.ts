import { createClient } from "@/lib/supabase/server";

/**
 * Carrega os dados de referência usados pelo formulário de imóvel
 * (cidades, bairros, características ativas e parceiros).
 */
export async function loadPropertyFormRefs() {
  const supabase = await createClient();

  const [cities, neighborhoods, features, partners] = await Promise.all([
    supabase.from("cities").select("id, name").order("name"),
    supabase.from("neighborhoods").select("id, name, city_id").order("name"),
    supabase
      .from("features")
      .select("id, name, category")
      .eq("active", true)
      .order("name"),
    supabase.from("partners").select("id, name").order("name"),
  ]);

  return {
    cities: cities.data ?? [],
    neighborhoods: neighborhoods.data ?? [],
    features: features.data ?? [],
    partners: partners.data ?? [],
  };
}
