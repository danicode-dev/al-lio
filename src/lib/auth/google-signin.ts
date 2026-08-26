import "server-only";

import type { GoogleIdentity } from "@/lib/google/identity";
import { findExternalIdentity, linkExternalIdentity } from "@/lib/db/repositories/external_identities";
import { confirmUserEmail, ensureUserByEmail, getUserByEmail, getUserById } from "@/lib/db/repositories/users";
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
//
// Every path ends in confirmUserEmail (a no-op if already confirmed):
// caught live while testing this - linking Google to a password account
// that registered but never clicked its confirmation email left
// email_confirmed_at null even though Google had just verified the same
// address, silently blocking that account's own password login forever.
export async function resolveOrProvisionGoogleUser(identity: GoogleIdentity): Promise<DbUser> {
  const linked = await findExternalIdentity("google", identity.providerUserId);
  if (linked) {
    // The immutable foreign key is authoritative. Looking the account up by
    // the email copied at link time would break a valid identity if either
    // side later changed its email address.
    const user = await getUserById(linked.user_id);
    if (user) {
      await confirmUserEmail(user.id);
      return user;
    }
  }

  const existingByEmail = await getUserByEmail(identity.email.toLowerCase());
  const user = existingByEmail ?? (await ensureUserByEmail(identity.email, identity.displayName));
  await confirmUserEmail(user.id);

  await linkExternalIdentity({
    user_id: user.id,
    provider: "google",
    provider_user_id: identity.providerUserId,
    email: identity.email.toLowerCase(),
  });

  return user;
}
