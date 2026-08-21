import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getProfileByUser } from "@/lib/db/repositories/profiles";
import { getLearningNotes, getLearningResourceForCycle } from "@/lib/db/repositories/learning";
import { LearningPlayer } from "@/components/learning/learning-player";

export const dynamic = "force-dynamic";

export default async function LearningResourcePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  const profile = await getProfileByUser(session.uid);
  if (!profile?.cycle_code) notFound();
  const resource = await getLearningResourceForCycle(session.uid, profile.cycle_code, slug);
  if (!resource) notFound();
  const notes = await getLearningNotes(session.uid, resource.id);
  return <LearningPlayer resource={resource} initialNotes={notes} />;
}
