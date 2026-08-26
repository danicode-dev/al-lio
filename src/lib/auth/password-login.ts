"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession } from "@/lib/auth/session";
import { clearAuthRateLimit, consumeAuthRateLimit } from "@/lib/auth/login-rate-limit";
import { getUserByEmail } from "@/lib/db/repositories/users";
import type { DbUser } from "@/lib/db/types";

const DUMMY_PASSWORD_HASH = "$2b$12$7msVBJRULOsnRx4aSwL4Hu14N5poXnX092fUbgPJcp7rSfvuXd52y";

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(200),
});

export type PasswordLoginState = {
  error: string | null;
};

export async function loginWithPasswordAction(
  _previousState: PasswordLoginState,
  formData: FormData
): Promise<PasswordLoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "credentials_invalid" };
  }

  const email = parsed.data.email.toLowerCase();
  const password = parsed.data.password;
  const rateLimit = await consumeAuthRateLimit("password", email, 6, 15 * 60 * 1_000);
  if (!rateLimit.allowed) {
    return { error: "rate_limited" };
  }
  let authenticatedUser: DbUser | null = null;

  try {
    const user = await getUserByEmail(email);
    const hashToCheck = user?.password_hash ?? DUMMY_PASSWORD_HASH;
    const validPassword = await bcrypt.compare(password, hashToCheck);

    if (user?.password_hash && validPassword) {
      authenticatedUser = user;
    }
  } catch {
    return { error: "credentials_unavailable" };
  }

  if (!authenticatedUser) {
    return { error: "credentials_invalid" };
  }

  if (!authenticatedUser.email_confirmed_at) {
    return { error: "email_not_confirmed" };
  }

  await clearAuthRateLimit("password", email);
  await createSession({
    id: authenticatedUser.id,
    email: authenticatedUser.email,
    name: authenticatedUser.display_name,
    securityStamp: authenticatedUser.security_stamp,
  });
  redirect("/dashboard");
}
