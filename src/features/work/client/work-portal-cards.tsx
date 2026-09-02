"use client";

import { memo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { jobPlatforms, type JobPlatform } from "@/lib/deeplinks/job-search-urls";

const PORTAL_DOMAINS: Record<JobPlatform, string> = {
  LinkedIn: "linkedin.com",
  InfoJobs: "infojobs.net",
  Indeed: "indeed.com",
  Tecnoempleo: "tecnoempleo.com",
  Glassdoor: "glassdoor.com",
  Infoempleo: "infoempleo.com",
  Computrabajo: "computrabajo.es",
  Adzuna: "adzuna.es",
  Monster: "monster.com",
  Jobtome: "jobtome.com",
  Jooble: "jooble.org",
  Randstad: "randstad.es",
  Manpower: "manpower.es",
  Adecco: "adecco.es",
  Wellfound: "wellfound.com",
  Remotive: "remotive.com",
  "We Work Remotely": "weworkremotely.com",
  JobToday: "jobtoday.com",
  "Talent.com": "talent.com",
  "Welcome to the Jungle": "welcometothejungle.com",
};

const PORTAL_COLORS: Partial<Record<JobPlatform, string>> = {
  LinkedIn: "bg-[#0A66C2] text-white",
  InfoJobs: "bg-[#167DB7] text-white",
  Tecnoempleo: "bg-[#F97316] text-white",
  Indeed: "bg-[#2557A7] text-white",
  Glassdoor: "bg-[#0CAA41] text-white",
  Infoempleo: "bg-[#CC1515] text-white",
  Computrabajo: "bg-[#FF5A00] text-white",
  Adzuna: "bg-[#E74C3C] text-white",
  Monster: "bg-[#6D29D9] text-white",
  Jobtome: "bg-[#2F80ED] text-white",
  Jooble: "bg-[#1AAB9B] text-white",
  Randstad: "bg-[#2B6CB0] text-white",
  Manpower: "bg-[#E31837] text-white",
  Adecco: "bg-[#E4002B] text-white",
  Wellfound: "bg-[#1A1A1A] text-white",
  Remotive: "bg-[#10B981] text-white",
  "We Work Remotely": "bg-[#1B9F4B] text-white",
  JobToday: "bg-[#3B82F6] text-white",
  "Talent.com": "bg-[#8B5CF6] text-white",
  "Welcome to the Jungle": "border border-[#e9d6cb] bg-[#fff8f4] text-[#a63f1a]",
};

export function PortalMark({ platform }: { platform: JobPlatform }) {
  const [failed, setFailed] = useState(false);
  const domain = PORTAL_DOMAINS[platform];
  const src = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

  if (!failed) {
    return (
      <span className="al-work-portal-mark">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={platform}
          width={28}
          height={28}
          className="h-7 w-7 object-contain"
          onError={() => setFailed(true)}
        />
      </span>
    );
  }

  return (
    <span className={cn("al-work-portal-mark text-xs font-semibold", PORTAL_COLORS[platform] ?? "bg-muted text-foreground")}>
      {platform.slice(0, 2)}
    </span>
  );
}

export const WORKING_JOB_PLATFORMS: JobPlatform[] = ["LinkedIn", "InfoJobs", "Indeed", "Tecnoempleo", "Jooble"];

export const OTHER_JOB_PLATFORMS: JobPlatform[] = jobPlatforms.filter(
  (platform) => !WORKING_JOB_PLATFORMS.includes(platform),
);

export const PortalLinkCard = memo(function PortalLinkCard({ platform }: { platform: JobPlatform }) {
  return (
    <a
      href={`https://www.${PORTAL_DOMAINS[platform]}`}
      target="_blank"
      rel="noreferrer"
      className="al-work-portal-link-card"
    >
      <PortalMark platform={platform} />
      <span className="al-work-portal-link-title truncate">{platform}</span>
      <ExternalLink className="al-work-portal-link-icon h-3.5 w-3.5" />
    </a>
  );
});
