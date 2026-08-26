"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { consumeAuthRateLimit } from "@/lib/auth/login-rate-limit";
import { issueAuthToken } from "@/lib/auth/tokens";
import { absoluteAppUrl } from "@/lib/auth/app-url";
import { sendTransactionalEmail } from "@/lib/email/send";
import { alreadyRegisteredTemplate, confirmEmailTemplate } from "@/lib/email/templates";
import { createUnconfirmedUser, getUserByEmail } from "@/lib/db/repositories/users";

const BCRYPT_COST = 12;
const PASSWORD_MIN_LENGTH = 10;

const registerSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(PASSWORD_MIN_LENGTH, `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`).max(200),
});

export type RegisterState = {
  error: string | null;
  // Same shape regardless of whether the email was new, already registered,
  // or previously abandoned mid-registration - see the enumeration-safety
  // comment below. The UI shows one generic "check your email" panel.
  submitted: boolean;
};

const GENERIC_SUCCESS: RegisterState = { error: null, submitted: true };

async function sendConfirmationEmail(userId: string, email: string): Promise<void> {
  const rawToken = await issueAuthToken(userId, "email_confirm");
  const confirmUrl = absoluteAppUrl(`/confirmar?token=${encodeURIComponent(rawToken)}`);
  const { subject, html, text } = confirmEmailTemplate(email, confirmUrl);
  await sendTransactionalEmail({ to: email, subject, html, text });
}

async function sendAlreadyRegisteredNotice(email: string): Promise<void> {
  const loginUrl = absoluteAppUrl("/login");
  const resetUrl = absoluteAppUrl("/recuperar");
  const { subject, html, text } = alreadyRegisteredTemplate(loginUrl, resetUrl);
  await sendTransactionalEmail({ to: email, subject, html, text });
}

export async function registerAction(
  _previousState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "register_invalid", submitted: false };
  }

  const email = parsed.data.email.toLowerCase();

  const rateLimit = await consumeAuthRateLimit("register", email, 5, 60 * 60 * 1_000);
  if (!rateLimit.allowed) {
    return { error: "rate_limited", submitted: false };
  }

  try {
    const passwordHash = await bcrypt.hash(parsed.data.password, BCRYPT_COST);
    const created = await createUnconfirmedUser(email, passwordHash);

    if (created) {
      await sendConfirmationEmail(created.id, email);
      return GENERIC_SUCCESS;
    }

    // Email already taken. Never reveal that here - the returned state is
    // identical to the fresh-registration path. What happens server-side
    // differs by the existing account's own state, and only ever reaches
    // that account's own inbox, never the requester's response.
    const existing = await getUserByEmail(email);
    if (existing && !existing.email_confirmed_at) {
      await sendConfirmationEmail(existing.id, email);
    } else if (existing) {
      await sendAlreadyRegisteredNotice(email);
    }
    return GENERIC_SUCCESS;
  } catch {
    return { error: "register_failed", submitted: false };
  }
}
