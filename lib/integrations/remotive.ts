import type { NormalizedOpportunity } from "@/lib/db/types";
import { emptyOnError } from "./common";

export async function collect(): Promise<NormalizedOpportunity[]> {
  try {
    const response = await fetch("https://remotive.com/api/remote-jobs?search=junior%20developer", {
      next: { revalidate: 3600 },
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as { jobs?: Array<Record<string, unknown>> };
    return (payload.jobs ?? []).slice(0, 20).map((job) => ({
      source: "Remotive",
      source_type: "api",
      title: String(job.title ?? ""),
      company: String(job.company_name ?? ""),
      location: String(job.candidate_required_location ?? "Remote"),
      remote: true,
      url: String(job.url ?? ""),
      published_at: String(job.publication_date ?? ""),
      external_id: String(job.id ?? ""),
    }));
  } catch (error) {
    return emptyOnError(error, "remotive");
  }
}
