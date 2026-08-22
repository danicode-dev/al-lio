import { createHash } from "node:crypto";
import { z } from "zod";

export const RADAR_SCHEMA_VERSION = 3;
export const RADAR_LEGACY_SCHEMA_VERSION = 2;
export const RADAR_SUPPORTED_SCHEMA_VERSIONS = [RADAR_LEGACY_SCHEMA_VERSION, RADAR_SCHEMA_VERSION] as const;
export const RADAR_MAX_BATCH_ITEMS = 100;
export const RADAR_MAX_BODY_BYTES = 1_000_000;
export const RADAR_TIMESTAMP_TOLERANCE_MS = 5 * 60_000;

export const RADAR_CYCLE_CODES = ["DAW", "DAM", "AF", "TSAF", "MP"] as const;
export const RADAR_TRUST_TIERS = ["official", "institutional", "first_party", "sector", "reference"] as const;
export const RADAR_DESTINATIONS = ["news", "course", "event"] as const;

const httpsUrl = z.string().url().refine((value) => new URL(value).protocol === "https:", "URL must use HTTPS");
const nullableDateTime = z.string().datetime({ offset: true }).nullable();
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
  contentHash: z.string().regex(/^[0-9a-f]{64}$/),
};

const radarItemV2Schema = z.object({ schemaVersion: z.literal(RADAR_LEGACY_SCHEMA_VERSION), ...itemFields }).strict();

export const radarItemSchema = z.object({
  schemaVersion: z.literal(RADAR_SCHEMA_VERSION),
  ...itemFields,
  destination: z.enum(RADAR_DESTINATIONS),
  semanticKey: z.string().regex(/^[0-9a-f]{64}$/),
}).strict();

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

export const radarDeliverySchema = z.discriminatedUnion("schemaVersion", [radarDeliveryV2Schema, radarDeliveryV3Schema])
  .transform((delivery) => ({
    schemaVersion: RADAR_SCHEMA_VERSION as typeof RADAR_SCHEMA_VERSION,
    deliveryId: delivery.deliveryId,
    items: delivery.items.map(normalizeRadarItem),
  }));

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

export type RadarDelivery = z.infer<typeof radarDeliverySchema>;
export type RadarDeliveryItem = z.infer<typeof radarItemSchema>;
export type RadarCycleCode = (typeof RADAR_CYCLE_CODES)[number];
export type RadarDestination = (typeof RADAR_DESTINATIONS)[number];
