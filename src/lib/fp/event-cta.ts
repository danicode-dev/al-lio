// Pure decision logic for Eventos/Hackathons CTAs (issue #112): which video
// resources are exactly associated with a competency, and where a legacy
// /ruta/[slug] deep link should redirect to. No React/Next/DB imports, so
// the aptitude modal and the ruta/[slug] redirect page share one definition
// instead of each re-implementing the same rules independently.

// Every external destination this feature ever redirects to or renders as
// an <a href> goes through this first - fp_content_items.video_url and
// source_url are free-text DB columns with no scheme validation at write
// time, so a malformed or malicious value (javascript:, data:, a relative
// path) must never reach a redirect() call or a rendered link.
export function isSafeHttpUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// Every learning item exactly associated with the competency that has a
// safe video - never just one "primary" pick. A competency can legitimately
// have more than one genuine video resource; hiding all but an arbitrarily
// chosen one would misrepresent what's actually available. Sorted by
// id_slug purely for a stable, reproducible display order across requests.
export function selectAptitudeVideos<T extends { id_slug: string; video_url: string | null }>(
  learningItems: readonly T[]
): (T & { video_url: string })[] {
  const withSafeVideo = learningItems.filter(
    (item): item is T & { video_url: string } => isSafeHttpUrl(item.video_url),
  );
  return [...withSafeVideo].sort((a, b) => a.id_slug.localeCompare(b.id_slug));
}

// Legacy /ruta/{eventSlug}?paso={skillId} resolver. Unsafe candidates are
// filtered out first and never count toward ambiguity - a list containing
// one real video plus a javascript:/data:/malformed value must still
// resolve to that one real video, not fall back for looking "ambiguous".
// Only among the safe candidates: exactly one wins; zero or more than one
// (there is then no way to know which one the old link meant - duplicates
// of the same URL still count as more than one, deliberately not deduped)
// falls back to the event's own official page, and only to /hackathons if
// even that isn't a safe URL.
export function resolveLegacyRutaTarget(input: { itemSourceUrl: string | null; exactVideoCandidates: string[] }): string {
  const safeCandidates = input.exactVideoCandidates.filter((candidate) => isSafeHttpUrl(candidate));
  if (safeCandidates.length === 1) {
    return safeCandidates[0];
  }
  return isSafeHttpUrl(input.itemSourceUrl) ? input.itemSourceUrl : "/hackathons";
}
