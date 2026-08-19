"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { LEAD_STATUSES } from "@/lib/leads";

export async function setLeadStatus(id: string, status: string): Promise<void> {
  if (!(LEAD_STATUSES as readonly string[]).includes(status)) return;
  const supabase = await createClient();
  await supabase.from("leads").update({ status }).eq("id", id);
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${id}`);
}
