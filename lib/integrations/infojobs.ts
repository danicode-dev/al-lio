import type { NormalizedOpportunity } from "@/lib/db/types";
import { emptyOnError, isGranadaCandidateOpportunity } from "./common";

export async function collect(): Promise<NormalizedOpportunity[]> {
  if (!process.env.INFOJOBS_CLIENT_ID || !process.env.INFOJOBS_CLIENT_SECRET) return [];

  try {
    const credentials = Buffer.from(
      `${process.env.INFOJOBS_CLIENT_ID}:${process.env.INFOJOBS_CLIENT_SECRET}`,
    ).toString("base64");

    const tokenRes = await fetch("https://www.infojobs.net/api/oauth/user-authorize/index.xhtml", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ grant_type: "client_credentials" }),
    });
    if (!tokenRes.ok) return [];

    const { access_token } = (await tokenRes.json()) as { access_token?: string };
    if (!access_token) return [];

    const params = new URLSearchParams({
      q: "desarrollador junior",
      province: "granada",
      maxResults: "20",
      order: "updated-desc",
    });

    const offersRes = await fetch(
      `https://api.infojobs.net/api/7/offer?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
        next: { revalidate: 3600 },
      },
    );
    if (!offersRes.ok) return [];

    const payload = (await offersRes.json()) as {
      items?: Array<{
        id?: string;
        title?: string;
        author?: { name?: string };
        province?: { value?: string };
        link?: string;
        updated?: string;
        requirementMin?: string;
      }>;
    };

    return (payload.items ?? []).map((job) => ({
      source: "InfoJobs",
      source_type: "api" as const,
      title: String(job.title ?? ""),
      company: job.author?.name ? String(job.author.name) : undefined,
      location: job.province?.value ? String(job.province.value) : "Granada",
      remote: false,
      url: String(job.link ?? ""),
      published_at: job.updated ? String(job.updated) : undefined,
      description: job.requirementMin ? String(job.requirementMin).slice(0, 500) : undefined,
      external_id: job.id ? String(job.id) : undefined,
    })).filter(isGranadaCandidateOpportunity);
  } catch (error) {
    return emptyOnError(error, "infojobs");
  }
}
