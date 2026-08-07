import type { NormalizedOpportunity } from "@/lib/db/types";
import { isGranadaCandidateJobText } from "@/lib/news/job-filters";

export type Collector = () => Promise<NormalizedOpportunity[]>;

export function emptyOnError(error: unknown, source: string): NormalizedOpportunity[] {
  console.error(`[collector:${source}]`, error);
  return [];
}

export function isGranadaCandidateOpportunity(job: NormalizedOpportunity): boolean {
  if (job.remote) return false;
  return isGranadaCandidateJobText(
    [
      job.title,
      job.company ?? "",
      job.description ?? "",
      job.location ?? "",
      job.province ?? "",
      job.source,
      job.url,
      ...(job.tags ?? []),
    ].join(" "),
  );
}
