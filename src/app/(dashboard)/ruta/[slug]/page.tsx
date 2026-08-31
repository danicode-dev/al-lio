import { notFound, redirect } from "next/navigation";
import { getValidatedSession } from "@/lib/auth/session";
import { getProfileByUser } from "@/lib/db/repositories/profiles";
import { getActiveVideoResourcesForCompetency, getFpContentItemBySlugForCycle, getInternalLearningTargetsForVideoUrls, getRequiredCompetenciesForItems } from "@/features/learning/server";
import { FP_APTITUDE_GATED_TYPES } from "@/lib/data";

export const dynamic = "force-dynamic";

// /ruta/[slug] remains a legacy deep-link resolver, but it only resolves to
// screens inside AL-LIO. YouTube and official event URLs are never returned.
export default async function LegacyRutaRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ paso?: string }>;
}) {
  const { slug } = await params;
  const { paso } = await searchParams;
  const session = await getValidatedSession();
  if (!session) redirect("/login");

  const profile = await getProfileByUser(session.uid);
  if (!profile?.cycle_code || !profile.cycle_group) notFound();

  const item = await getFpContentItemBySlugForCycle(slug, profile.cycle_code);
  if (!item) notFound();

  if (FP_APTITUDE_GATED_TYPES.has(item.type)) {
    // A single, unambiguous video that also exists in AL-LIO's learning
    // catalogue wins. Missing or ambiguous internal matches return to Events.
    let exactVideoCandidates: string[] = [];
    if (paso) {
      // The competency must genuinely belong to this event - a paso value
      // for an unrelated event/skill must never resolve to a video.
      const requiredByItem = await getRequiredCompetenciesForItems([item.id]);
      const competency = (requiredByItem.get(item.id) ?? []).find((c) => c.id === paso);
      if (competency) {
        const candidates = await getActiveVideoResourcesForCompetency(competency.id, profile.cycle_code);
        exactVideoCandidates = candidates.map((c) => c.video_url);
      }
    }
    const targets = await getInternalLearningTargetsForVideoUrls(exactVideoCandidates, profile.cycle_code);
    const internalSlugs = [...new Set(targets.values())];
    if (internalSlugs.length === 1) {
      redirect(`/aprende/${encodeURIComponent(internalSlugs[0])}`);
    }
    redirect("/hackathons");
  }

  if (item.video_url) {
    const targets = await getInternalLearningTargetsForVideoUrls([item.video_url], profile.cycle_code);
    const internalSlug = targets.get(item.video_url);
    if (internalSlug) redirect(`/aprende/${encodeURIComponent(internalSlug)}`);
  }
  redirect("/roadmap");
}
