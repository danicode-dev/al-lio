import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { getProfileByUser } from "@/lib/db/repositories/profiles";
import { getSession, requireValidSessionUser } from "@/lib/auth/session";

export const getAuthenticatedStudentContext = cache(async () => {
  const session = await getSession();
  if (!session) redirect("/login");

  // Keep the database-backed revocation check and profile read in one shared
  // request-scoped operation. The private layout and its global store both
  // consume this context, so neither query is repeated during the render.
  const [user, profile] = await Promise.all([
    requireValidSessionUser(session),
    getProfileByUser(session.uid),
  ]);

  if (!profile || !profile.onboarding_completed_at) redirect("/onboarding");

  return { session, user, profile };
});
