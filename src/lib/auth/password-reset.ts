"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { consumeAuthRateLimit } from "@/lib/auth/login-rate-limit";
import { issueAuthToken, consumeAuthToken } from "@/lib/auth/tokens";
import { absoluteAppUrl } from "@/lib/auth/app-url";
import { sendTransactionalEmail } from "@/lib/email/send";
import { passwordResetTemplate } from "@/lib/email/templates";
import { getUserByEmail, getUserById, resetPasswordAndRevokeSessions } from "@/lib/db/repositories/users";
import { createSession } from "@/lib/auth/session";

const BCRYPT_COST = 12;
const PASSWORD_MIN_LENGTH = 10;

const requestSchema = z.object({ email: z.string().trim().email().max(254) });

export type PasswordResetRequestState = { submitted: boolean };
const GENERIC_REQUEST_SUCCESS: PasswordResetRequestState = { submitted: true };

export async function requestPasswordResetAction(
  _previousState: PasswordResetRequestState,
  formData: FormData
): Promise<PasswordResetRequestState> {
  const parsed = requestSchema.safeParse({ email: formData.get("email") });
  // Deliberately returns the generic success state even on a malformed
  // email - the only signal a malformed submission could leak is "your
  // input didn't parse," which is not account-existence information, but
  // treating it identically keeps this function trivially enumeration-safe
  // without a separate code path to reason about.
  if (!parsed.success) return GENERIC_REQUEST_SUCCESS;

  const email = parsed.data.email.toLowerCase();
  const rateLimit = await consumeAuthRateLimit("password_reset_request", email, 5, 60 * 60 * 1_000);
  if (!rateLimit.allowed) return GENERIC_REQUEST_SUCCESS;

  try {
    const user = await getUserByEmail(email);
    // Only a password account can meaningfully reset a password. Sending
    // nothing for a Google-only account is intentional - and safe, since
    // the response is identical either way.
    if (user?.password_hash) {
      const rawToken = await issueAuthToken(user.id, "password_reset");
      const resetUrl = absoluteAppUrl(`/restablecer?token=${encodeURIComponent(rawToken)}`);
      const { subject, html } = passwordResetTemplate(email, resetUrl);
      await sendTransactionalEmail({ to: email, subject, html });
    }
  } catch {
    // Fall through to the same generic response - never surface a
    // different state for an internal failure than for "no such account".
  }

  return GENERIC_REQUEST_SUCCESS;
}

const resetSchema = z
  .object({
    token: z.string().trim().min(1),
    password: z.string().min(PASSWORD_MIN_LENGTH, `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`).max(200),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export type PasswordResetState = { error: string | null };

export async function resetPasswordAction(
  _previousState: PasswordResetState,
  formData: FormData
): Promise<PasswordResetState> {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "reset_invalid" };
  }

  const consumed = await consumeAuthToken(parsed.data.token, "password_reset");
  if (!consumed.ok) {
    return { error: consumed.reason === "expired" ? "reset_token_expired" : "reset_token_invalid" };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, BCRYPT_COST);
  const newStamp = await resetPasswordAndRevokeSessions(consumed.userId, passwordHash);
  const user = await getUserById(consumed.userId);
  if (!user) return { error: "reset_failed" };

  await createSession({
    id: user.id,
    email: user.email,
    name: user.display_name,
    securityStamp: newStamp,
  });
  redirect("/dashboard");
}
