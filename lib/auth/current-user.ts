import "server-only";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// Temporary dependency on Supabase Auth — replaced in Fase 6 (auth propia).
// The UUID returned here matches public.users.id (preserved from Fase 3B import).

export async function getCurrentUserId(): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return data.user.id;
}

export async function tryGetCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}
