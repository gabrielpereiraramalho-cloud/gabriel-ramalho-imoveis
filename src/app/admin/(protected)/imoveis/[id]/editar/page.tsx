import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { updateProperty } from "../../actions";
import { loadPropertyFormRefs } from "../../data";
import { PropertyForm } from "../../property-form";
import { getOrderedImages } from "./image-data";
import { PropertyImagesManager } from "./property-images-manager";

export default async function EditarImovelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .single();

  if (!property) {
    notFound();
  }

  const { data: propertyFeatures } = await supabase
    .from("property_features")
    .select("feature_id")
    .eq("property_id", id);

  const selectedFeatureIds = (propertyFeatures ?? []).map((r) => r.feature_id);

  const { features, partners } = await loadPropertyFormRefs();

  // Cidade/bairro são texto livre no formulário: carrega os nomes atuais.
  const [cityRes, neighborhoodRes] = await Promise.all([
    property.city_id
      ? supabase.from("cities").select("name").eq("id", property.city_id).maybeSingle()
      : Promise.resolve({ data: null }),
    property.neighborhood_id
      ? supabase
          .from("neighborhoods")
          .select("name")
          .eq("id", property.neighborhood_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const initialCity = cityRes.data?.name ?? "";
  const initialNeighborhood = neighborhoodRes.data?.name ?? "";

  const images = await getOrderedImages(supabase, id);

  const action = updateProperty.bind(null, id);

  return (
    <main className="flex flex-1 flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        Editar imóvel — {property.code}
      </h1>
      <PropertyForm
        action={action}
        submitLabel="Salvar alterações"
        features={features}
        partners={partners}
        initial={property}
        initialCity={initialCity}
        initialNeighborhood={initialNeighborhood}
        selectedFeatureIds={selectedFeatureIds}
      />
      <PropertyImagesManager propertyId={id} initialImages={images} />
    </main>
  );
}
