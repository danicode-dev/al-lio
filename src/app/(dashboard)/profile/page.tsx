import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getProfileByUser } from "@/lib/db/repositories/profiles";
import { getActiveFpCycles, getFpUserContentStateCounts } from "@/lib/db/repositories/fp_catalog";
import { getCoursesByUser } from "@/lib/db/repositories/courses";
import { getHackathonsByUser } from "@/lib/db/repositories/hackathons";
import { ProfileForm } from "@/components/profile/profile-form";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [cycles, profile, courses, hackathons, fpCounts] = await Promise.all([
    getActiveFpCycles(),
    getProfileByUser(session.uid),
    getCoursesByUser(session.uid),
    getHackathonsByUser(session.uid),
    getFpUserContentStateCounts(session.uid),
  ]);

  if (!profile || !profile.onboarding_completed_at) redirect("/onboarding");

  const stats = {
    coursesTotal: courses.length,
    coursesDone: courses.filter((course) => course.status === "terminado").length,
    hackathonsTotal: hackathons.length,
    hackathonsDone: hackathons.filter((hackathon) => hackathon.status === "realizado").length,
    fpSaved: (fpCounts.saved ?? 0) + (fpCounts.started ?? 0),
    fpCompleted: fpCounts.completed ?? 0,
  };

  return <ProfileForm cycles={cycles} profile={profile} stats={stats} />;
}
