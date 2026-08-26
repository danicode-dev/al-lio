import { notFound, redirect } from "next/navigation";
import { getValidatedSession } from "@/lib/auth/session";
import { getProfileByUser } from "@/lib/db/repositories/profiles";
import { getLearningNotes, getLearningResourceForCycle } from "@/lib/db/repositories/learning";
import { LearningPlayer } from "@/components/learning/learning-player";

export const dynamic = "force-dynamic";

function parseInitialSeek(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || !/^\d+$/.test(candidate)) return null;
  const seconds = Number(candidate);
  return Number.isSafeInteger(seconds) && seconds >= 0 && seconds <= 60 * 60 * 48 ? seconds : null;
}

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
  return <LearningPlayer resource={resource} initialNotes={notes} initialSeekSeconds={parseInitialSeek(at)} />;
}
