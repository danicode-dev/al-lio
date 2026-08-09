import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getProfileByUser } from "@/lib/db/repositories/profiles";
import { getRoadmapOverview } from "@/lib/fp/roadmap-overview";
import { RoadmapView } from "@/components/roadmap/roadmap-view";

export const dynamic = "force-dynamic";

export default async function RoadmapPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const profile = await getProfileByUser(session.uid);
  if (!profile?.cycle_code || !profile.cycle_group) notFound();

  const roadmap = await getRoadmapOverview(session.uid, profile);
  if (!roadmap) notFound();

  return <RoadmapView cycleName={roadmap.overview.cycleName} modules={roadmap.modules} />;
}
