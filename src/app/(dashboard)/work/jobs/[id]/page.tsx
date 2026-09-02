import { notFound } from "next/navigation";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { getProfileByUser } from "@/lib/db/repositories/profiles";
import { getVerifiedJobForUser, listVerifiedJobsForUser, verifiedJobsEnabled } from "@/lib/jobs/repository";
import { VerifiedJobDetailView } from "@/features/work";

export const dynamic = "force-dynamic";

const idSchema = z.string().uuid();

export default async function VerifiedJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!verifiedJobsEnabled()) notFound();
  const id = idSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const userId = await getCurrentUserId();
  const profile = await getProfileByUser(userId);
  if (!profile?.cycle_code) notFound();
  const [job, activeJobs] = await Promise.all([
    getVerifiedJobForUser(userId, profile.cycle_code, id.data),
    listVerifiedJobsForUser(userId, profile.cycle_code, 200),
  ]);
  if (!job) notFound();
  const currentIndex = activeJobs.findIndex((candidate) => candidate.id === job.id);
  const nextJob = currentIndex >= 0
    ? activeJobs[(currentIndex + 1) % activeJobs.length]
    : activeJobs[0];

  return <VerifiedJobDetailView job={job} nextJob={nextJob ?? null} />;
}
