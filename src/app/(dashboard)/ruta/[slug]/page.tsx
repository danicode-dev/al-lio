import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getProfileByUser } from "@/lib/db/repositories/profiles";
import {
  getFpContentItemBySlugForCycle,
  getLearningItemsForCompetencies,
  getRequiredCompetenciesForItems,
  getUserContentState,
} from "@/lib/db/repositories/fp_catalog";
import { getResourceNotes } from "@/lib/db/repositories/fp_resource_notes";
import { resolveLegacyRutaTarget, selectAptitudeVideo } from "@/lib/fp/event-cta";
import { FP_APTITUDE_GATED_TYPES } from "@/lib/data";
import { LearningResourceView } from "@/components/ruta/ruta-view";

export const dynamic = "force-dynamic";

export default async function LearningPathPage({
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
    // Eventos no longer has an internal "route" screen (issue #112) - every
    // legacy /ruta/{slug}?paso={skillId} link redirects straight to the
    // exact video for that aptitude when one exists, otherwise to the
    // event's own official page, and never renders content of its own.
    let exactVideoUrl: string | null = null;
    if (paso) {
      const requiredByItem = await getRequiredCompetenciesForItems([item.id]);
      const competency = (requiredByItem.get(item.id) ?? []).find((c) => c.id === paso);
      if (competency) {
        const learningItemsByCompetency = await getLearningItemsForCompetencies([competency.id], profile.cycle_code);
        const exact = selectAptitudeVideo(learningItemsByCompetency.get(competency.id) ?? []);
        exactVideoUrl = exact?.video_url ?? null;
      }
    }
    redirect(resolveLegacyRutaTarget({ itemSourceUrl: item.source_url, exactVideoUrl }));
  }

  if (!item.video_url) notFound();

  const [notes, userState] = await Promise.all([
    getResourceNotes(session.uid, item.id),
    getUserContentState(session.uid, item.id),
  ]);

  return (
    <LearningResourceView
      item={{
        idSlug: item.id_slug,
        title: item.title,
        type: item.type,
        description: item.description,
        entity: item.entity,
        sourceUrl: item.source_url,
        videoUrl: item.video_url,
      }}
      notes={notes.map((note) => ({
        id: note.id,
        timestampSeconds: note.timestamp_seconds,
        body: note.body,
        createdAt: note.created_at,
      }))}
      initialStatus={userState?.status ?? null}
    />
  );
}
