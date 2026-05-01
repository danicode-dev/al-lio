import type { NormalizedOpportunity } from "@/lib/db/types";
import { emptyOnError, isGranadaCandidateOpportunity } from "./common";

export async function collect(): Promise<NormalizedOpportunity[]> {
  if (!process.env.ADZUNA_APP_ID || !process.env.ADZUNA_APP_KEY) return [];

  const params = new URLSearchParams({
    app_id: process.env.ADZUNA_APP_ID,
    app_key: process.env.ADZUNA_APP_KEY,
    results_per_page: "20",
    what: "developer junior OR programador junior OR practicas daw",
    where: "Granada",
    sort_by: "date",
    content_type: "application/json",
  });

  try {
    const response = await fetch(
      `https://api.adzuna.com/v1/api/jobs/es/search/1?${params.toString()}`,
      { next: { revalidate: 3600 } },
    );
    if (!response.ok) return [];

    const payload = (await response.json()) as {
      results?: Array<{
        id?: number;
        title?: string;
        company?: { display_name?: string };
        location?: { display_name?: string };
        redirect_url?: string;
        created?: string;
        description?: string;
      }>;
    };

    return (payload.results ?? []).map((job) => ({
      source: "Adzuna",
      source_type: "api" as const,
      title: String(job.title ?? ""),
      company: job.company?.display_name ? String(job.company.display_name) : undefined,
      location: job.location?.display_name ? String(job.location.display_name) : undefined,
      remote: false,
      url: String(job.redirect_url ?? ""),
      published_at: job.created ? String(job.created) : undefined,
      description: job.description ? String(job.description).slice(0, 500) : undefined,
      external_id: job.id ? String(job.id) : undefined,
    })).filter(isGranadaCandidateOpportunity);
  } catch (error) {
    return emptyOnError(error, "adzuna");
  }
}
