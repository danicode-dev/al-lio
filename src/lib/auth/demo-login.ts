"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isDemoAccessEnabled } from "@/lib/auth/demo-access";
import { getDemoProfile } from "@/lib/auth/demo-profiles";
import { createSession } from "@/lib/auth/session";
import { consumeAuthRateLimit } from "@/lib/auth/login-rate-limit";
import { getUserByEmail } from "@/lib/db/repositories/users";

const demoLoginSchema = z.object({
  profile: z.string().trim().min(1).max(32),
});

export async function loginAsDemoAction(formData: FormData): Promise<void> {
  if (!isDemoAccessEnabled()) {
    redirect("/login?error=demo_disabled");
  }

  const parsed = demoLoginSchema.safeParse({
    profile: formData.get("profile"),
  });
  const profile = parsed.success ? getDemoProfile(parsed.data.profile) : null;

  if (!profile) {
    redirect("/login?error=demo_unavailable");
  }

  const rateLimit = await consumeAuthRateLimit("demo", profile.key, 30, 10 * 60 * 1_000);
  if (!rateLimit.allowed) {
    redirect("/login?error=rate_limited");
  }

  let user = null;
  try {
    user = await getUserByEmail(profile.email);
  } catch {
    redirect("/login?error=demo_unavailable");
  }

  const isSeededDemoUser =
    user?.id === profile.userId &&
    user.email.toLowerCase() === profile.email &&
    user.role === "user";

  if (!user || !isSeededDemoUser) {
    redirect("/login?error=demo_unavailable");
  }

  await createSession({
    id: user.id,
    email: user.email,
    name: user.display_name,
    securityStamp: user.security_stamp,
  });
  redirect("/dashboard");
}
