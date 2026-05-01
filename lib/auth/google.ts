import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type GoogleIdentity = {
  email?: string | null;
  emailVerified?: boolean | null;
  name?: string | null;
  picture?: string | null;
};

function displayNameFromIdentity(identity: GoogleIdentity) {
  return identity.name?.trim() || identity.email?.split("@")[0] || "Usuario";
}

export async function ensureSupabaseSessionFromGoogle(identity: GoogleIdentity) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) return user;

  if (!identity.email || identity.emailVerified === false) {
    throw new Error("Google account email is not verified");
  }

  const admin = createAdminClient();
  const displayName = displayNameFromIdentity(identity);
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: identity.email,
    options: {
      data: {
        avatar_url: identity.picture,
        display_name: displayName,
        full_name: identity.name ?? displayName,
      },
    },
  });

  const tokenHash = linkData.properties?.hashed_token;
  if (linkError || !tokenHash) {
    throw new Error(linkError?.message ?? "Could not generate Supabase login link");
  }

  const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "magiclink",
  });

  if (verifyError || !sessionData.user) {
    throw new Error(verifyError?.message ?? "Could not verify Supabase login");
  }

  await admin.from("profiles").upsert(
    {
      user_id: sessionData.user.id,
      display_name: displayName,
      full_name: identity.name ?? displayName,
      target_role: "Usuario D1OS",
      main_location: "Granada",
    },
    { onConflict: "user_id", ignoreDuplicates: true },
  );

  return sessionData.user;
}
