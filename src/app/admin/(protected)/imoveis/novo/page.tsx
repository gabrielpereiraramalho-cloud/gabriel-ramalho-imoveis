import { createProperty } from "../actions";
import { loadPropertyFormRefs } from "../data";
import { PropertyForm } from "../property-form";

export default async function NovoImovelPage() {
  const { cities, neighborhoods, features, partners } =
    await loadPropertyFormRefs();

  return (
    <main className="flex flex-1 flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Novo imóvel</h1>
      <PropertyForm
        action={createProperty}
        submitLabel="Criar imóvel"
        cities={cities}
        neighborhoods={neighborhoods}
        features={features}
        partners={partners}
      />
      <p className="rounded border border-zinc-200 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
        Salve o imóvel primeiro para adicionar fotos.
      </p>
    </main>
  );
}
