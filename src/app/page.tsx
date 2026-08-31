import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { MarketingLanding } from "@/components/landing/marketing-landing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/", languages: { es: "/", en: "/en" } },
};

// "/" is the public landing for signed-out visitors. Anyone already
// carrying a session cookie goes straight to the app - the dashboard
// layout runs the full stamp validation, so a signature-only check is
// enough here.
export default async function HomePage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return <MarketingLanding lang="es" altHref="/en" />;
}
