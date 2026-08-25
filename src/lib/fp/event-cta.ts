// Pure decision logic for Eventos/Hackathons CTAs: which video (if any) is
// "the" exact resource for a competency, and where a legacy /ruta/[slug]
// deep link should now redirect to. No React/Next/DB imports, so the
// aptitude modal and the ruta/[slug] redirect page share one definition
// instead of each picking a "first" resource independently (issue #112).

export function selectAptitudeVideo<T extends { id_slug: string; video_url: string | null }>(
  learningItems: readonly T[]
): (T & { video_url: string }) | null {
  const withVideo = learningItems.filter((item): item is T & { video_url: string } => Boolean(item.video_url));
  // Deterministic regardless of the order the caller's data arrived in - the
  // underlying query only orders by skill_id, so two resources tied to the
  // same competency have no defined order of their own otherwise.
  const [exact] = [...withVideo].sort((a, b) => a.id_slug.localeCompare(b.id_slug));
  return exact ?? null;
}

export function resolveLegacyRutaTarget(input: { itemSourceUrl: string | null; exactVideoUrl: string | null }): string {
  return input.exactVideoUrl ?? input.itemSourceUrl ?? "/hackathons";
}
