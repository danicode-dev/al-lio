import { notFound } from "next/navigation";
import { getGlobalStore } from "@/lib/data";
import { resolveHackathonById } from "@/features/events/presentation";
import { HackathonDetailView } from "@/features/events";
import type { Store } from "@/components/store/types";

export default async function HackathonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // getGlobalStore() is React cache()-deduped with the (dashboard) layout's
  // own call in the same request - this costs no extra queries. Its
  // hackathons/techOpportunities/fpContent are already scoped to the
  // current user/cycle by their respective repository queries, so an id
  // that doesn't resolve here was never authorized for this user in the
  // first place - "not found" and "not yours" are indistinguishable by
  // construction, matching getRadarItemDetailForUser's boundary for News.
  const store = (await getGlobalStore()) as unknown as Store;
  const item = resolveHackathonById(id, store.hackathons, store.techOpportunities, store.fpContent);
  if (!item) notFound();

  return <HackathonDetailView id={item.id} />;
}
