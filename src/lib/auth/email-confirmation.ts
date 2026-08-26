import "server-only";

import { consumeAuthToken } from "@/lib/auth/tokens";
import { confirmUserEmail } from "@/lib/db/repositories/users";
import { getUserById } from "@/lib/db/repositories/users";
import { createSession } from "@/lib/auth/session";

export type ConfirmEmailResult = "confirmed" | "invalid" | "expired" | "already_used";

// Called directly from the /confirmar Server Component (a link click, not a
// form submission) - confirming and establishing the session happen in one
// step so clicking the emailed link is enough to land the user in the app.
export async function confirmEmailToken(rawToken: string | undefined): Promise<ConfirmEmailResult> {
  if (!rawToken) return "invalid";

  const result = await consumeAuthToken(rawToken, "email_confirm");
  if (!result.ok) {
    if (result.reason === "expired") return "expired";
    if (result.reason === "already_used") return "already_used";
    return "invalid";
  }

  await confirmUserEmail(result.userId);
  const user = await getUserById(result.userId);
  if (!user) return "invalid";

  await createSession({
    id: user.id,
    email: user.email,
    name: user.display_name,
    securityStamp: user.security_stamp,
  });
  return "confirmed";
}
