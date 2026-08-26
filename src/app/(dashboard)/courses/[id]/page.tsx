import { notFound } from "next/navigation";
import { getGlobalStore } from "@/lib/data";
import { resolveCourseById } from "@/lib/courses/course-presentation";
import { CourseDetailView } from "@/components/guest-app";
import type { Store } from "@/components/store/types";

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // getGlobalStore() is React cache()-deduped with the (dashboard) layout's
  // own call in the same request - this costs no extra queries. Its
  // courses/techOpportunities/fpContent are already scoped to the current
  // user/cycle by their respective repository queries, so an id that
  // doesn't resolve here was never authorized for this user in the first
  // place - "not found" and "not yours" are indistinguishable by
  // construction, mirroring the hackathons detail route (issue #135).
  const store = (await getGlobalStore()) as unknown as Store;
  const item = resolveCourseById(id, store.courses, store.techOpportunities, store.fpContent);
  if (!item) notFound();

  return <CourseDetailView id={item.id} />;
}
