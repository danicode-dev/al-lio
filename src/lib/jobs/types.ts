export type VerifiedJobLifecycle = "open" | "closed" | "expired" | "unknown";
export type VerifiedJobWorkplaceMode = "remote" | "hybrid" | "on_site";

export interface VerifiedJobEvidence {
  fieldPath: string;
  origin: "authoritative_source" | "source";
  kind: "official_document" | "source_feed" | "source_page" | "registration_page";
  url: string;
  observedAt: string;
  authorityRank: number;
}

export interface VerifiedJob {
  id: string;
  revision: number;
  title: string;
  summary: string | null;
  employer: string;
  sourceVacancyId: string;
  applicationUrl: string;
  lifecycle: VerifiedJobLifecycle;
  applicationDeadline: string | null;
  country: string | null;
  autonomousCommunity: string | null;
  province: string | null;
  municipality: string | null;
  workplaceMode: VerifiedJobWorkplaceMode | null;
  contractType: string | null;
  workingTime: string | null;
  schedule: string | null;
  salaryMinMinor: number | null;
  salaryMaxMinor: number | null;
  salaryCurrency: string | null;
  salaryPeriod: "hour" | "month" | "year" | null;
  minimumEducation: string | null;
  experienceRequirements: string | null;
  languages: string[];
  otherEligibility: string[];
  sourceName: string;
  sourceUrl: string;
  sourcePublishedAt: string | null;
  sourceUpdatedAt: string | null;
  verifiedAt: string;
  cycleCodes: string[];
  moduleCodes: string[];
  topics: string[];
  skills: string[];
  matchReasons: string[];
  privateApplicationId: string | null;
  privateApplicationStatus: string | null;
  isSaved: boolean;
  evidence?: VerifiedJobEvidence[];
}

export type VerifiedJobPrivateAction = "save" | "unsave" | "applied" | "dismiss";
