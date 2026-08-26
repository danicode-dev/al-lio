import "server-only";

import { Resend } from "resend";

// Never throws with provider-internal detail to a caller that might
// surface it to the client - callers get a plain boolean and log the
// specifics themselves if needed. Never logs the email body (it carries a
// one-time confirmation/reset link).
export async function sendTransactionalEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    console.error("Email sending is not configured: missing RESEND_API_KEY or RESEND_FROM_EMAIL");
    return { ok: false };
  }

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    if (result.error) {
      console.error("Resend rejected an email send", result.error.name);
      return { ok: false };
    }
    return { ok: true };
  } catch {
    console.error("Email send threw unexpectedly");
    return { ok: false };
  }
}
