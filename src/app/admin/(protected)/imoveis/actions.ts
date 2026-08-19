"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { parsePropertyForm, type PropertyFormState } from "./schema";
import type { Database } from "@/types/database";

type Supabase = SupabaseClient<Database>;

/** Verifica duplicidade de código/slug (opcionalmente ignorando um id). */
async function findDuplicates(
  supabase: Supabase,
  code: string,
  slug: string,
  excludeId?: string,
): Promise<Record<string, string> | null> {
  const fieldErrors: Record<string, string> = {};

  let codeQuery = supabase.from("properties").select("id").eq("code", code);
  if (excludeId) codeQuery = codeQuery.neq("id", excludeId);
  const { data: byCode } = await codeQuery.limit(1);
  if (byCode && byCode.length > 0) {
    fieldErrors.code = "Já existe um imóvel com este código.";
  }

  let slugQuery = supabase.from("properties").select("id").eq("slug", slug);
  if (excludeId) slugQuery = slugQuery.neq("id", excludeId);
  const { data: bySlug } = await slugQuery.limit(1);
  if (bySlug && bySlug.length > 0) {
    fieldErrors.slug = "Já existe um imóvel com este slug.";
  }

  return Object.keys(fieldErrors).length > 0 ? fieldErrors : null;
}

function mapDbError(message: string, code?: string): string {
  if (code === "23505") return "Código ou slug já existente.";
  return `Erro ao salvar: ${message}`;
}

/** Substitui as características associadas a um imóvel. */
async function replaceFeatures(
  supabase: Supabase,
  propertyId: string,
  featureIds: string[],
): Promise<string | null> {
  const { error: delError } = await supabase
    .from("property_features")
    .delete()
    .eq("property_id", propertyId);
  if (delError) return delError.message;

  if (featureIds.length === 0) return null;

  const rows = featureIds.map((feature_id) => ({
    property_id: propertyId,
    feature_id,
  }));
  const { error: insError } = await supabase
    .from("property_features")
    .insert(rows);
  return insError ? insError.message : null;
}

export async function createProperty(
  _prevState: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const { values, featureIds, fieldErrors } = parsePropertyForm(formData);
  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Corrija os campos destacados.", fieldErrors };
  }

  const supabase = await createClient();

  const duplicates = await findDuplicates(supabase, values.code, values.slug);
  if (duplicates) {
    return { error: "Corrija os campos destacados.", fieldErrors: duplicates };
  }

  // Publicação: marcado define published_at = now(); desmarcado mantém null.
  values.published_at =
    formData.get("published") === "on" ? new Date().toISOString() : null;

  const { data, error } = await supabase
    .from("properties")
    .insert(values)
    .select("id")
    .single();

  if (error || !data) {
    return { error: mapDbError(error?.message ?? "desconhecido", error?.code) };
  }

  const featError = await replaceFeatures(supabase, data.id, featureIds);
  if (featError) {
    return {
      error: `Imóvel criado, mas houve erro ao salvar características: ${featError}`,
    };
  }

  revalidatePath("/admin/imoveis");
  redirect("/admin/imoveis");
}

export async function updateProperty(
  id: string,
  _prevState: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const { values, featureIds, fieldErrors } = parsePropertyForm(formData);
  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Corrija os campos destacados.", fieldErrors };
  }

  const supabase = await createClient();

  const duplicates = await findDuplicates(
    supabase,
    values.code,
    values.slug,
    id,
  );
  if (duplicates) {
    return { error: "Corrija os campos destacados.", fieldErrors: duplicates };
  }

  // Publicação: preserva o timestamp original quando já publicado.
  if (formData.get("published") === "on") {
    const { data: current } = await supabase
      .from("properties")
      .select("published_at")
      .eq("id", id)
      .single();
    values.published_at = current?.published_at ?? new Date().toISOString();
  } else {
    values.published_at = null;
  }

  const { error } = await supabase
    .from("properties")
    .update(values)
    .eq("id", id);

  if (error) {
    return { error: mapDbError(error.message, error.code) };
  }

  const featError = await replaceFeatures(supabase, id, featureIds);
  if (featError) {
    return {
      error: `Imóvel salvo, mas houve erro ao atualizar características: ${featError}`,
    };
  }

  revalidatePath("/admin/imoveis");
  redirect("/admin/imoveis");
}

export async function deleteProperty(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("properties").delete().eq("id", id);
  revalidatePath("/admin/imoveis");
}

export async function setFeatured(id: string, next: boolean): Promise<void> {
  const supabase = await createClient();
  await supabase.from("properties").update({ featured: next }).eq("id", id);
  revalidatePath("/admin/imoveis");
}

export async function setActive(id: string, next: boolean): Promise<void> {
  const supabase = await createClient();
  await supabase.from("properties").update({ active: next }).eq("id", id);
  revalidatePath("/admin/imoveis");
}

export async function setPublished(id: string, next: boolean): Promise<void> {
  const supabase = await createClient();
  if (next) {
    const { data: current } = await supabase
      .from("properties")
      .select("published_at")
      .eq("id", id)
      .single();
    const published_at = current?.published_at ?? new Date().toISOString();
    await supabase.from("properties").update({ published_at }).eq("id", id);
  } else {
    await supabase.from("properties").update({ published_at: null }).eq("id", id);
  }
  revalidatePath("/admin/imoveis");
}
