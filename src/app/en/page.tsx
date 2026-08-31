import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { MarketingLanding } from "@/features/marketing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "AL-LÍO" },
  description: "One panel for tasks, calendar, courses, events, challenges, jobs and news for your vocational-training programme.",
  alternates: { canonical: "/en", languages: { es: "/", en: "/en" } },
};

// English landing at "/en". Same session guard as "/".
export default async function HomePageEn() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return <MarketingLanding lang="en" altHref="/" />;
}
