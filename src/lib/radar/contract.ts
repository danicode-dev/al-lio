import { z } from "zod";

export const RADAR_SCHEMA_VERSION = 2;
export const RADAR_MAX_BATCH_ITEMS = 100;
export const RADAR_MAX_BODY_BYTES = 1_000_000;
export const RADAR_TIMESTAMP_TOLERANCE_MS = 5 * 60_000;

export const RADAR_CYCLE_CODES = ["DAW", "DAM", "AF", "TSAF", "MP"] as const;
export const RADAR_TRUST_TIERS = ["official", "institutional", "first_party", "sector", "reference"] as const;

const httpsUrl = z.string().url().refine((value) => new URL(value).protocol === "https:", "URL must use HTTPS");
const nullableDateTime = z.string().datetime({ offset: true }).nullable();

export const radarItemSchema = z.object({
  schemaVersion: z.literal(RADAR_SCHEMA_VERSION),
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
  contentHash: z.string().regex(/^[0-9a-f]{64}$/),
}).strict();

export const radarDeliverySchema = z.object({
  schemaVersion: z.literal(RADAR_SCHEMA_VERSION),
  deliveryId: z.string().uuid(),
  items: z.array(radarItemSchema).min(1).max(RADAR_MAX_BATCH_ITEMS),
}).strict();

export type RadarDelivery = z.infer<typeof radarDeliverySchema>;
export type RadarDeliveryItem = z.infer<typeof radarItemSchema>;
export type RadarCycleCode = (typeof RADAR_CYCLE_CODES)[number];
