import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getProfileByUser } from "@/lib/db/repositories/profiles";
import {
  getFpContentItemBySlug,
  getRequiredCompetenciesForItems,
  getUserContentState,
} from "@/lib/db/repositories/fp_catalog";
import { getResourceNotes } from "@/lib/db/repositories/fp_resource_notes";
import { buildRutaPathSteps } from "@/lib/fp/ruta-path";
import { FP_APTITUDE_GATED_TYPES } from "@/lib/data";
import { RutaView } from "@/components/ruta/ruta-view";
import { RutaPathView } from "@/components/ruta/ruta-path-view";

export const dynamic = "force-dynamic";

export default async function RutaPage({
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

  const item = await getFpContentItemBySlug(slug);
  if (!item) notFound();

  if (FP_APTITUDE_GATED_TYPES.has(item.type)) {
    const profile = await getProfileByUser(session.uid);
    if (!profile?.cycle_group) notFound();

    const requiredByItem = await getRequiredCompetenciesForItems([item.id]);
    const competencies = requiredByItem.get(item.id) ?? [];
    if (competencies.length === 0) notFound();

    const orderedCompetencies = [...competencies].sort((a, b) => {
      const aObl = a.obligatoria_para_item ? 0 : 1;
      const bObl = b.obligatoria_para_item ? 0 : 1;
      if (aObl !== bObl) return aObl - bObl;
      return (a.orden_preparacion ?? 999) - (b.orden_preparacion ?? 999);
    });

    const steps = await buildRutaPathSteps(
      session.uid,
      orderedCompetencies.map((competency) => ({
        id: competency.id,
        titulo: competency.titulo,
        descripcion: competency.descripcion,
        obligatoria: competency.obligatoria_para_item,
      })),
      profile.cycle_group
    );

    const requestedIndex = paso ? steps.findIndex((step) => step.competencyId === paso) : 0;

    return <RutaPathView pageTitle={item.title} steps={steps} initialStepIndex={requestedIndex >= 0 ? requestedIndex : 0} />;
  }

  if (!item.video_url) notFound();

  const [notes, userState] = await Promise.all([
    getResourceNotes(session.uid, item.id),
    getUserContentState(session.uid, item.id),
  ]);

  return (
    <RutaView
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
