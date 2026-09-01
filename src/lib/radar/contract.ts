import { createHash } from "node:crypto";
import { z } from "zod";

const RADAR_SCHEMA_VERSION = 3;
export const RADAR_V4_SCHEMA_VERSION = 4;
const RADAR_LEGACY_SCHEMA_VERSION = 2;
export const RADAR_SUPPORTED_SCHEMA_VERSIONS = [
  RADAR_LEGACY_SCHEMA_VERSION,
  RADAR_SCHEMA_VERSION,
  RADAR_V4_SCHEMA_VERSION,
] as const;
export const RADAR_MAX_BATCH_ITEMS = 100;
export const RADAR_MAX_BODY_BYTES = 1_000_000;
export const RADAR_TIMESTAMP_TOLERANCE_MS = 5 * 60_000;

const RADAR_CYCLE_CODES = ["DAW", "DAM", "AF", "TSAF", "MP"] as const;
const RADAR_TRUST_TIERS = ["official", "institutional", "first_party", "sector", "reference"] as const;
const RADAR_DESTINATIONS = ["news", "course", "event"] as const;
const RADAR_V4_DESTINATIONS = ["news", "course", "event", "job"] as const;
const RADAR_V4_PUBLICATION_DECISIONS = ["accepted", "rejected", "quarantined"] as const;
const RADAR_V4_SOURCE_LIFECYCLE_STATUSES = [
  "announced",
  "registration_open",
  "registration_closed",
  "ongoing",
  "completed",
  "cancelled",
  "postponed",
  "evergreen",
] as const;
const RADAR_V4_FACT_OBSERVATION_STATES = [
  "verified",
  "not_stated",
  "extraction_failed",
  "source_unavailable",
  "verified_removed",
] as const;
const RADAR_V4_OPPORTUNITY_TYPES = [
  "article",
  "legal_update",
  "course",
  "workshop",
  "webinar",
  "seminar",
  "masterclass",
  "conference",
  "meetup",
  "event",
  "hackathon",
  "challenge",
  "competition",
  "scholarship",
  "grant",
  "accelerator",
  "call",
  "vacancy",
] as const;

export const RADAR_V4_FACT_FIELDS = [
  "title",
  "summaryShort",
  "summaryExpanded",
  "keyFacts",
  "organizer",
  "provider",
  "courseCode",
  "startsAt",
  "endsAt",
  "registrationOpensAt",
  "registrationDeadline",
  "registrationUrl",
  "attendanceMode",
  "country",
  "autonomousCommunity",
  "province",
  "municipality",
  "venue",
  "address",
  "durationHours",
  "courseDifficulty",
  "minimumEducation",
  "otherEligibility",
  "credentialLevel",
  "priceState",
  "priceAmountMinor",
  "priceCurrency",
  "certification",
  "prize",
  "requirements",
  "audience",
  "sourceLifecycleStatus",
] as const;
export type RadarV4FactField = (typeof RADAR_V4_FACT_FIELDS)[number];
const RADAR_V4_EVIDENCE_FIELDS = RADAR_V4_FACT_FIELDS.map((field) => `facts.${field}` as const);
export type RadarV4EvidenceField = (typeof RADAR_V4_EVIDENCE_FIELDS)[number];
const RADAR_V4_DERIVED_FIELDS = [
  "derived.aboutSummary",
  "derived.learningOutcomes",
  "derived.skillsTested",
  "derived.preparationTips",
  "derived.whyRelevant",
] as const;
export const RADAR_V4_JOB_FIELDS = [
  "employer",
  "sourceVacancyId",
  "applicationUrl",
  "lifecycle",
  "applicationDeadline",
  "country",
  "autonomousCommunity",
  "province",
  "municipality",
  "workplaceMode",
  "contractType",
  "workingTime",
  "schedule",
  "salaryMinMinor",
  "salaryMaxMinor",
  "salaryCurrency",
  "salaryPeriod",
  "minimumEducation",
  "experienceRequirements",
  "languages",
  "otherEligibility",
  "sourcePublishedAt",
  "sourceUpdatedAt",
] as const;
const RADAR_V4_JOB_EVIDENCE_FIELDS = RADAR_V4_JOB_FIELDS.map((field) => `job.${field}` as const);
type RadarV4JobEvidenceField = (typeof RADAR_V4_JOB_EVIDENCE_FIELDS)[number];

const httpsUrl = z.string().url().refine((value) => new URL(value).protocol === "https:", "URL must use HTTPS");
const nullableDateTime = z.string().datetime({ offset: true }).nullable();
const nullableText = (maximum = 2_000) => z.string().trim().min(1).max(maximum).nullable();
const hash = z.string().regex(/^[0-9a-f]{64}$/);

const itemFields = {
  sourceId: z.string().min(1).max(120),
  sourceName: z.string().min(1).max(200),
  externalId: z.string().min(1).max(1000),
  canonicalUrl: httpsUrl,
  title: z.string().min(1).max(500),
  summary: z.string().max(1000),
  publishedAt: nullableDateTime,
  fetchedAt: z.string().datetime({ offset: true }),
  expiresAt: nullableDateTime,
  eventStartsAt: nullableDateTime,
  eventEndsAt: nullableDateTime,
  registrationUrl: httpsUrl.nullable(),
  registrationDeadline: nullableDateTime,
  kind: z.enum(["news", "event", "call", "legal"]),
  locality: z.string().max(160).nullable(),
  province: z.string().max(160).nullable(),
  targetCycleCodes: z.array(z.enum(RADAR_CYCLE_CODES)).min(1).max(RADAR_CYCLE_CODES.length),
  moduleCodes: z.array(z.string().min(1).max(120)).max(30),
  topics: z.array(z.string().min(1).max(120)).max(30),
  matchedRuleIds: z.array(z.string().min(1).max(160)).min(1).max(30),
  matchedKeywords: z.array(z.string().min(1).max(160)).min(1).max(50),
  trustTier: z.enum(RADAR_TRUST_TIERS),
  reviewStatus: z.literal("approved"),
  reviewedBy: z.string().trim().min(1).max(160),
  reviewedAt: z.string().datetime({ offset: true }),
  reviewReason: z.string().trim().min(1).max(1000),
  sourceUrl: httpsUrl,
  contentHash: hash,
};

const radarItemV2Schema = z.object({ schemaVersion: z.literal(RADAR_LEGACY_SCHEMA_VERSION), ...itemFields }).strict();

const radarItemSchema = z.object({
  schemaVersion: z.literal(RADAR_SCHEMA_VERSION),
  ...itemFields,
  destination: z.enum(RADAR_DESTINATIONS),
  semanticKey: hash,
}).strict();

export const radarV4FactsSchema = z.object({
  title: z.string().trim().min(1).max(500),
  summaryShort: nullableText(1_000),
  summaryExpanded: nullableText(5_000),
  keyFacts: z.array(z.string().trim().min(1).max(1_000)).max(20),
  organizer: nullableText(),
  provider: nullableText(),
  courseCode: nullableText(),
  startsAt: nullableDateTime,
  endsAt: nullableDateTime,
  registrationOpensAt: nullableDateTime,
  registrationDeadline: nullableDateTime,
  registrationUrl: httpsUrl.nullable(),
  attendanceMode: z.enum(["online", "in_person", "hybrid"]).nullable(),
  country: nullableText(),
  autonomousCommunity: nullableText(),
  province: nullableText(),
  municipality: nullableText(),
  venue: nullableText(),
  address: nullableText(),
  durationHours: z.number().positive().max(100_000).nullable(),
  courseDifficulty: nullableText(),
  minimumEducation: nullableText(),
  otherEligibility: z.array(z.string().trim().min(1).max(1_000)).max(100),
  credentialLevel: nullableText(),
  priceState: z.enum(["free", "paid"]).nullable(),
  priceAmountMinor: z.number().int().nonnegative().nullable(),
  priceCurrency: z.string().regex(/^[A-Z]{3}$/).nullable(),
  certification: nullableText(),
  prize: nullableText(),
  requirements: z.array(z.string().trim().min(1).max(1_000)).max(100),
  audience: z.array(z.string().trim().min(1).max(1_000)).max(100),
  sourceLifecycleStatus: z.enum(RADAR_V4_SOURCE_LIFECYCLE_STATUSES).nullable(),
}).strict().superRefine((facts, context) => {
  if (facts.priceState === "paid" && (facts.priceAmountMinor === null || facts.priceCurrency === null)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["priceState"],
      message: "Paid opportunities require an amount and ISO currency",
    });
  }
  if (facts.priceState !== "paid" && (facts.priceAmountMinor !== null || facts.priceCurrency !== null)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["priceAmountMinor"],
      message: "Amount and currency are only valid for paid opportunities",
    });
  }
});

const radarV4SourceSchema = z.object({
  id: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(200),
  externalId: z.string().trim().min(1).max(1_000),
  canonicalUrl: httpsUrl,
  primaryEvidenceUrl: httpsUrl,
  supportingEvidenceUrls: z.array(httpsUrl).max(10),
  trustTier: z.enum(RADAR_TRUST_TIERS),
  verifiedAt: z.string().datetime({ offset: true }),
  publishedAt: nullableDateTime,
  updatedAt: nullableDateTime,
}).strict();

const radarV4IdentitySchema = z.object({
  legacySemanticKey: hash.nullable(),
  entityKey: hash,
  occurrenceKey: hash,
  revision: z.number().int().positive(),
  materialFingerprint: hash,
  aliases: z.array(z.object({
    kind: z.enum(["entity", "occurrence"]),
    key: hash,
    sourceId: z.string().trim().min(1).max(120).nullable(),
    reason: z.string().trim().min(1).max(500),
  }).strict()).max(20),
}).strict();

const radarV4ClassificationSchema = z.object({
  destination: z.enum(RADAR_V4_DESTINATIONS),
  opportunityType: z.enum(RADAR_V4_OPPORTUNITY_TYPES),
  kind: z.enum(["news", "event", "call", "legal", "vacancy"]),
  language: z.literal("es"),
  targetCycleCodes: z.array(z.enum(RADAR_CYCLE_CODES)).min(1).max(RADAR_CYCLE_CODES.length),
  moduleCodes: z.array(z.string().trim().min(1).max(120)).max(30),
  topics: z.array(z.string().trim().min(1).max(120)).max(30),
  skills: z.array(z.string().trim().min(1).max(160)).max(50),
  matchReasons: z.array(z.string().trim().min(1).max(160)).min(1).max(50),
}).strict();

const radarV4PublicationSchema = z.object({
  decision: z.enum(RADAR_V4_PUBLICATION_DECISIONS),
  decidedBy: z.string().trim().min(1).max(160),
  decidedAt: z.string().datetime({ offset: true }),
  reasonCodes: z.array(z.string().trim().min(1).max(160)).min(1).max(30),
  rationale: z.string().trim().min(1).max(1_000),
  rankingPriority: z.number().int().min(0).max(100),
}).strict();

const radarV4EvidenceSchema = z.object({
  fieldPath: z.enum(RADAR_V4_EVIDENCE_FIELDS as [RadarV4EvidenceField, ...RadarV4EvidenceField[]]),
  origin: z.enum(["authoritative_source", "source"]),
  kind: z.enum(["official_document", "source_feed", "source_page", "registration_page"]),
  url: httpsUrl,
  observedAt: z.string().datetime({ offset: true }),
  valueHash: hash,
  authorityRank: z.number().int().min(1).max(100),
}).strict();

const radarV4JobFactsSchema = z.object({
  employer: z.string().trim().min(1).max(300),
  sourceVacancyId: z.string().trim().min(1).max(500),
  applicationUrl: httpsUrl,
  lifecycle: z.enum(["open", "closed", "expired", "unknown"]),
  applicationDeadline: nullableDateTime,
  country: nullableText(160),
  autonomousCommunity: nullableText(160),
  province: nullableText(160),
  municipality: nullableText(160),
  workplaceMode: z.enum(["remote", "hybrid", "on_site"]).nullable(),
  contractType: nullableText(300),
  workingTime: nullableText(300),
  schedule: nullableText(500),
  salaryMinMinor: z.number().int().nonnegative().nullable(),
  salaryMaxMinor: z.number().int().nonnegative().nullable(),
  salaryCurrency: z.string().regex(/^[A-Z]{3}$/).nullable(),
  salaryPeriod: z.enum(["hour", "month", "year"]).nullable(),
  minimumEducation: nullableText(1_000),
  experienceRequirements: nullableText(1_000),
  languages: z.array(z.string().trim().min(1).max(160)).max(20),
  otherEligibility: z.array(z.string().trim().min(1).max(1_000)).max(100),
  sourcePublishedAt: nullableDateTime,
  sourceUpdatedAt: nullableDateTime,
  firstSeenAt: z.string().datetime({ offset: true }),
  lastSeenAt: z.string().datetime({ offset: true }),
  verifiedAt: z.string().datetime({ offset: true }),
}).strict().superRefine((facts, context) => {
  const hasAnySalary = facts.salaryMinMinor !== null || facts.salaryMaxMinor !== null;
  if (hasAnySalary !== (facts.salaryCurrency !== null && facts.salaryPeriod !== null)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["salaryCurrency"],
      message: "Salary amount, ISO currency and period must be stated together",
    });
  }
  if (facts.salaryMinMinor !== null && facts.salaryMaxMinor !== null && facts.salaryMinMinor > facts.salaryMaxMinor) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["salaryMaxMinor"],
      message: "Maximum salary must be greater than or equal to minimum salary",
    });
  }
});

const radarV4JobEvidenceSchema = z.object({
  fieldPath: z.enum(RADAR_V4_JOB_EVIDENCE_FIELDS as [RadarV4JobEvidenceField, ...RadarV4JobEvidenceField[]]),
  origin: z.enum(["authoritative_source", "source"]),
  kind: z.enum(["official_document", "source_feed", "source_page", "registration_page"]),
  url: httpsUrl,
  observedAt: z.string().datetime({ offset: true }),
  valueHash: hash,
  authorityRank: z.number().int().min(1).max(100),
}).strict();

const radarV4JobSchema = z.object({
  facts: radarV4JobFactsSchema,
  factStates: z.record(
    z.enum(RADAR_V4_JOB_EVIDENCE_FIELDS as [RadarV4JobEvidenceField, ...RadarV4JobEvidenceField[]]),
    z.enum(RADAR_V4_FACT_OBSERVATION_STATES),
  ),
  evidence: z.array(radarV4JobEvidenceSchema).max(100),
}).strict().superRefine((job, context) => {
  for (const field of RADAR_V4_JOB_FIELDS) {
    const fieldPath = `job.${field}` as RadarV4JobEvidenceField;
    const value = job.facts[field];
    const state = job.factStates[fieldPath];
    const present = isKnownFactValue(value) || (Array.isArray(value) && state === "verified");
    const evidence = job.evidence.filter((entry) => entry.fieldPath === fieldPath);
    if (present && state !== "verified") {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["factStates", fieldPath], message: "A present job fact must be verified" });
    }
    if (present && !evidence.some((entry) => entry.valueHash === radarV4ValueHash(value))) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["evidence"], message: `Verified job fact ${fieldPath} requires matching evidence` });
    }
  }
});

const radarV4DerivedSchema = z.object({
  aboutSummary: nullableText(2_000),
  learningOutcomes: z.array(z.string().trim().min(1).max(1_000)).max(100),
  skillsTested: z.array(z.string().trim().min(1).max(1_000)).max(100),
  preparationTips: z.array(z.string().trim().min(1).max(1_000)).max(100),
  whyRelevant: nullableText(2_000),
  provenance: z.array(z.object({
    fieldPath: z.enum(RADAR_V4_DERIVED_FIELDS),
    method: z.enum(["extractive", "rule_based", "llm_assisted"]),
    sourceFields: z.array(
      z.enum(RADAR_V4_EVIDENCE_FIELDS as [RadarV4EvidenceField, ...RadarV4EvidenceField[]]),
    ).min(1).max(20),
    generatedAt: z.string().datetime({ offset: true }),
  }).strict()).max(RADAR_V4_DERIVED_FIELDS.length),
}).strict();

const radarV4ItemSchema = z.object({
  schemaVersion: z.literal(RADAR_V4_SCHEMA_VERSION),
  source: radarV4SourceSchema,
  identity: radarV4IdentitySchema,
  classification: radarV4ClassificationSchema,
  publication: radarV4PublicationSchema,
  facts: radarV4FactsSchema,
  factStates: z.record(
    z.enum(RADAR_V4_EVIDENCE_FIELDS as [RadarV4EvidenceField, ...RadarV4EvidenceField[]]),
    z.enum(RADAR_V4_FACT_OBSERVATION_STATES),
  ),
  evidence: z.array(radarV4EvidenceSchema).max(100),
  derived: radarV4DerivedSchema,
  job: radarV4JobSchema.optional(),
}).strict().superRefine((item, context) => {
  const evidenceByField = new Map<RadarV4EvidenceField, typeof item.evidence>();
  for (const entry of item.evidence) {
    const list = evidenceByField.get(entry.fieldPath) ?? [];
    list.push(entry);
    evidenceByField.set(entry.fieldPath, list);
  }

  for (const field of RADAR_V4_FACT_FIELDS) {
    const fieldPath = `facts.${field}` as RadarV4EvidenceField;
    const value = item.facts[field];
    const state = item.factStates[fieldPath];
    const present = isKnownFactValue(value) || (Array.isArray(value) && state === "verified");
    const evidence = evidenceByField.get(fieldPath) ?? [];

    if (present && state !== "verified") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["factStates", fieldPath],
        message: "A present source fact must be marked verified",
      });
    }
    if (present && !evidence.some((entry) => entry.valueHash === radarV4ValueHash(value))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["evidence"],
        message: `Verified fact ${fieldPath} requires matching field-level evidence`,
      });
    }
    if (!present && state === "verified") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["factStates", fieldPath],
        message: "An absent fact cannot be marked verified",
      });
    }
    if (state === "verified_removed" && !evidence.some((entry) => entry.valueHash === radarV4ValueHash(value))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["evidence"],
        message: `Verified removal ${fieldPath} requires matching evidence`,
      });
    }
  }

  const derivedValues: Record<(typeof RADAR_V4_DERIVED_FIELDS)[number], unknown> = {
    "derived.aboutSummary": item.derived.aboutSummary,
    "derived.learningOutcomes": item.derived.learningOutcomes,
    "derived.skillsTested": item.derived.skillsTested,
    "derived.preparationTips": item.derived.preparationTips,
    "derived.whyRelevant": item.derived.whyRelevant,
  };
  for (const [fieldPath, value] of Object.entries(derivedValues)) {
    if (isKnownFactValue(value) && !item.derived.provenance.some((entry) => entry.fieldPath === fieldPath)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["derived", "provenance"],
        message: `Derived field ${fieldPath} requires explicit provenance`,
      });
    }
  }

  if (item.publication.decision === "accepted") {
    const required: RadarV4FactField[] = ["title", "summaryShort"];
    if (item.classification.destination === "course") required.push("provider");
    if (item.classification.destination === "event") required.push("organizer", "startsAt");
    if (item.classification.destination === "job") {
      if (!item.job) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["job"], message: "Accepted job publication requires typed job facts" });
      } else if (item.job.facts.lifecycle === "unknown") {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["job", "facts", "lifecycle"], message: "Accepted job publication requires a verified lifecycle" });
      } else {
        const expectedLifecycle = item.job.facts.lifecycle === "open"
          ? "registration_open"
          : item.job.facts.lifecycle === "closed"
            ? "registration_closed"
            : "completed";
        if (item.facts.registrationUrl !== item.job.facts.applicationUrl) {
          context.addIssue({ code: z.ZodIssueCode.custom, path: ["facts", "registrationUrl"], message: "Job application URL must match the generic action projection" });
        }
        if (item.facts.registrationDeadline !== item.job.facts.applicationDeadline) {
          context.addIssue({ code: z.ZodIssueCode.custom, path: ["facts", "registrationDeadline"], message: "Job deadline must match the generic opportunity projection" });
        }
        if (item.facts.organizer !== item.job.facts.employer || item.facts.provider !== item.job.facts.employer) {
          context.addIssue({ code: z.ZodIssueCode.custom, path: ["facts", "organizer"], message: "Job employer must match the generic source projection" });
        }
        if (item.facts.sourceLifecycleStatus !== expectedLifecycle) {
          context.addIssue({ code: z.ZodIssueCode.custom, path: ["facts", "sourceLifecycleStatus"], message: "Job lifecycle must match the generic opportunity projection" });
        }
      }
    } else if (item.job) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["job"], message: "Job facts are only valid for destination=job" });
    }
    for (const field of required) {
      if (!isKnownFactValue(item.facts[field])) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["facts", field],
          message: `${field} is required for accepted ${item.classification.destination} publication`,
        });
      }
    }
    if (item.classification.destination === "news" && item.source.publishedAt === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["source", "publishedAt"],
        message: "Accepted news requires an objective source publication time",
      });
    }
  }
});

const radarDeliveryV2Schema = z.object({
  schemaVersion: z.literal(RADAR_LEGACY_SCHEMA_VERSION),
  deliveryId: z.string().uuid(),
  items: z.array(radarItemV2Schema).min(1).max(RADAR_MAX_BATCH_ITEMS),
}).strict();

const radarDeliveryV3Schema = z.object({
  schemaVersion: z.literal(RADAR_SCHEMA_VERSION),
  deliveryId: z.string().uuid(),
  items: z.array(radarItemSchema).min(1).max(RADAR_MAX_BATCH_ITEMS),
}).strict();

const radarDeliveryV4Schema = z.object({
  schemaVersion: z.literal(RADAR_V4_SCHEMA_VERSION),
  deliveryId: z.string().uuid(),
  items: z.array(radarV4ItemSchema).min(1).max(RADAR_MAX_BATCH_ITEMS),
}).strict();

export const radarDeliverySchema = z.discriminatedUnion("schemaVersion", [
  radarDeliveryV2Schema,
  radarDeliveryV3Schema,
  radarDeliveryV4Schema,
]).transform((delivery): RadarDeliveryV3 | RadarDeliveryV4 => {
  if (delivery.schemaVersion === RADAR_V4_SCHEMA_VERSION) return delivery;
  return {
    schemaVersion: RADAR_SCHEMA_VERSION,
    deliveryId: delivery.deliveryId,
    items: delivery.items.map(normalizeRadarItem),
  };
});

function normalizeRadarItem(item: z.infer<typeof radarItemV2Schema> | z.infer<typeof radarItemSchema>): RadarDeliveryItem {
  if (item.schemaVersion === RADAR_SCHEMA_VERSION) return item;
  const destination = inferLegacyDestination(item);
  return {
    ...item,
    schemaVersion: RADAR_SCHEMA_VERSION,
    destination,
    semanticKey: createHash("sha256")
      .update([destination, normalizeText(item.title), item.eventStartsAt?.slice(0, 10) ?? item.publishedAt?.slice(0, 10) ?? "", normalizeText(item.locality ?? item.province ?? "")].join("|"))
      .digest("hex"),
  };
}

function inferLegacyDestination(item: z.infer<typeof radarItemV2Schema>): RadarDestination {
  const text = normalizeText(`${item.title} ${item.summary} ${item.topics.join(" ")}`);
  const titleText = normalizeText(item.title);
  const isFormalStudyOffer = /\b(grado superior|ciclo formativo|matricula|admision|escolarizacion|oferta educativa)\b/.test(text);
  if (!isFormalStudyOffer && /\b(cursos?|taller(?:es)?|formacion|certificacion(?:es)?|certificados?|webinar(?:es|s)?|seminarios?|masterclass)\b/.test(text)) return "course";
  if (/\b(hackathons?|retos?|challenges?|concursos?|competiciones?|jornadas?|congresos?|ferias?|encuentros?|eventos?)\b/.test(titleText)) return "event";
  if (item.kind === "event" || item.kind === "call") return "event";
  return "news";
}

function normalizeText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isKnownFactValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export function radarV4ValueHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export type RadarDeliveryV3 = {
  schemaVersion: typeof RADAR_SCHEMA_VERSION;
  deliveryId: string;
  items: RadarDeliveryItem[];
};
export type RadarDeliveryV4 = z.infer<typeof radarDeliveryV4Schema>;
export type RadarV4DeliveryItem = z.infer<typeof radarV4ItemSchema>;
export type RadarV4Facts = z.infer<typeof radarV4FactsSchema>;
export type RadarV4Job = z.infer<typeof radarV4JobSchema>;
export type RadarV4Destination = (typeof RADAR_V4_DESTINATIONS)[number];
export type RadarDelivery = RadarDeliveryV3 | RadarDeliveryV4;
export type RadarDeliveryItem = z.infer<typeof radarItemSchema>;
export type RadarCycleCode = (typeof RADAR_CYCLE_CODES)[number];
type RadarDestination = (typeof RADAR_DESTINATIONS)[number];
