import "server-only";
import { upsertUser } from "@/lib/db/repositories/users";
import { upsertProfile } from "@/lib/db/repositories/profiles";

// Called after every Supabase Auth sign-in or sign-up to guarantee the user
// exists in public.users and public.profiles before any data write. Idempotent.
// Removed in Fase 6 when auth is fully migrated to PostgreSQL.
export async function ensurePostgresUserForSupabaseUser(input: {
  id: string;
  email: string;
  displayName?: string | null;
}): Promise<void> {
  await upsertUser(input.id, input.email);
  await upsertProfile(input.id, {
    display_name: input.displayName ?? input.email.split("@")[0],
    full_name: input.displayName ?? null,
    target_role: "Usuario D1OS",
    main_location: "Granada",
  });
}
