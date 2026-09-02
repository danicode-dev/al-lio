import { notFound, redirect } from "next/navigation";
import { getValidatedSession } from "@/lib/auth/session";
import { getProfileByUser } from "@/lib/db/repositories/profiles";
import { getLearningNotes, getLearningResourceForCycle } from "@/features/learning/server";
import { parseLearningSeekParam } from "@/features/learning/domain";
import { LearningPlayer } from "@/components/learning/learning-player";

export const dynamic = "force-dynamic";

export default async function LearningResourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ at?: string | string[] }>;
}) {
  const { slug } = await params;
  const { at } = await searchParams;
  const session = await getValidatedSession();
  if (!session) redirect("/login");
  const profile = await getProfileByUser(session.uid);
  if (!profile?.cycle_code) notFound();
  const resource = await getLearningResourceForCycle(session.uid, profile.cycle_code, slug);
  if (!resource) notFound();
  const notes = await getLearningNotes(session.uid, resource.id);
  return <LearningPlayer resource={resource} initialNotes={notes} initialSeekSeconds={parseLearningSeekParam(at)} />;
}
