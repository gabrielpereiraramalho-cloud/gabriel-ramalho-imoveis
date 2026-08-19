import { createClient } from "@/lib/supabase/server";

/**
 * Carrega os dados de referência usados pelo formulário de imóvel
 * (características ativas e parceiros). Cidade e bairro agora são texto livre.
 */
export async function loadPropertyFormRefs() {
  const supabase = await createClient();

  const [features, partners] = await Promise.all([
    supabase
      .from("features")
      .select("id, name, category")
      .eq("active", true)
      .order("name"),
    supabase.from("partners").select("id, name").order("name"),
  ]);

  return {
    features: features.data ?? [],
    partners: partners.data ?? [],
  };
}
