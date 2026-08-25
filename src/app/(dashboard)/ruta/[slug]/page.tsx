import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getProfileByUser } from "@/lib/db/repositories/profiles";
import { getActiveVideoResourcesForCompetency, getFpContentItemBySlugForCycle, getRequiredCompetenciesForItems } from "@/lib/db/repositories/fp_catalog";
import { isSafeHttpUrl, resolveLegacyRutaTarget } from "@/lib/fp/event-cta";
import { FP_APTITUDE_GATED_TYPES } from "@/lib/data";

export const dynamic = "force-dynamic";

// issue #112: /ruta/[slug] is a legacy deep link resolver only - it never
// renders a page of its own any more, for any content type. It always
// redirects, either to the exact destination a link promised or to a safe
// fallback, and never to the old "Todavia no hay video curado" dead end.
export default async function LegacyRutaRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ paso?: string }>;
}) {
  const { slug } = await params;
  const { paso } = await searchParams;
  const session = await getSession();
  if (!session) redirect("/login");

  const profile = await getProfileByUser(session.uid);
  if (!profile?.cycle_code || !profile.cycle_group) notFound();

  const item = await getFpContentItemBySlugForCycle(slug, profile.cycle_code);
  if (!item) notFound();

  if (FP_APTITUDE_GATED_TYPES.has(item.type)) {
    // A single, unambiguous, active, safe video wins. Zero or more than one
    // candidate (there is then no way to know which one an old link meant)
    // falls back to the event's own official page, then to /hackathons.
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
    redirect(resolveLegacyRutaTarget({ itemSourceUrl: item.source_url, exactVideoCandidates }));
  }

  // Non-Eventos content item (e.g. a course) with its own video: redirect
  // straight to it. No safe video: nothing to send the user to any more.
  if (isSafeHttpUrl(item.video_url)) {
    redirect(item.video_url);
  }
  notFound();
}
