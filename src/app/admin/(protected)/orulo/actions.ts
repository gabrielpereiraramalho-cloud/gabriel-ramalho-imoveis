"use server";

import { revalidatePath } from "next/cache";

import { syncOrulo } from "@/lib/orulo/sync";

/** Dispara a sincronização manual da Órulo (resultado gravado em sync_runs). */
export async function runOruloSync(): Promise<void> {
  await syncOrulo();
  revalidatePath("/admin/orulo");
}
