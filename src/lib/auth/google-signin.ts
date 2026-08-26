import "server-only";

import type { GoogleIdentity } from "@/lib/google/identity";
import { findExternalIdentity, linkExternalIdentity } from "@/lib/db/repositories/external_identities";
import { ensureUserByEmail, getUserByEmail } from "@/lib/db/repositories/users";
import type { DbUser } from "@/lib/db/types";

// Resolves a verified Google identity to an AL-LÍO user, in priority order:
// 1. Already linked (fast path for a returning Google user).
// 2. An existing account with a matching, already-verified-by-Google email
//    - safe to link automatically, since Google itself vouches for the
//      email, not an unverified user-supplied claim.
// 3. Neither - provision a brand-new account (just-in-time, per the
//    decided account policy in issue #132).
// Never links from an identity whose email Google has not verified -
// callers must only pass a GoogleIdentity that already passed that check
// (see exchangeGoogleIdentityCode).
export async function resolveOrProvisionGoogleUser(identity: GoogleIdentity): Promise<DbUser> {
  const linked = await findExternalIdentity("google", identity.providerUserId);
  if (linked) {
    const user = await getUserByEmail(linked.email);
    if (user) return user;
  }

  const existingByEmail = await getUserByEmail(identity.email.toLowerCase());
  const user = existingByEmail ?? (await ensureUserByEmail(identity.email, identity.displayName));

  await linkExternalIdentity({
    user_id: user.id,
    provider: "google",
    provider_user_id: identity.providerUserId,
    email: identity.email.toLowerCase(),
  });

  return user;
}
