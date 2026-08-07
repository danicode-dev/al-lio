import type { NormalizedOpportunity } from "@/lib/db/types";
import { emptyOnError, isGranadaCandidateOpportunity } from "./common";

export async function collect(): Promise<NormalizedOpportunity[]> {
  if (!process.env.JOOBLE_API_KEY) return [];

  try {
    const response = await fetch(
      `https://jooble.org/api/${process.env.JOOBLE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: "desarrollador junior programador junior practicas DAW",
          location: "Granada",
          resultonpage: 20,
        }),
        next: { revalidate: 3600 },
      },
    );
    if (!response.ok) return [];

    const payload = (await response.json()) as {
      jobs?: Array<{
        id?: string;
        title?: string;
        company?: string;
        location?: string;
        link?: string;
        updated?: string;
        snippet?: string;
        salary?: string;
      }>;
    };

    return (payload.jobs ?? []).map((job) => ({
      source: "Jooble",
      source_type: "api" as const,
      title: String(job.title ?? ""),
      company: job.company ? String(job.company) : undefined,
      location: job.location ? String(job.location) : undefined,
      remote: false,
      url: String(job.link ?? ""),
      published_at: job.updated ? String(job.updated) : undefined,
      description: job.snippet ? String(job.snippet).slice(0, 500) : undefined,
      external_id: job.id ? String(job.id) : undefined,
    })).filter(isGranadaCandidateOpportunity);
  } catch (error) {
    return emptyOnError(error, "jooble");
  }
}
