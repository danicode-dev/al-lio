import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getFpContentItemBySlug, getUserContentState } from "@/lib/db/repositories/fp_catalog";
import { getResourceNotes } from "@/lib/db/repositories/fp_resource_notes";
import { RutaView } from "@/components/ruta/ruta-view";

export const dynamic = "force-dynamic";

export default async function RutaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const item = await getFpContentItemBySlug(slug);
  if (!item || !item.video_url) notFound();

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
