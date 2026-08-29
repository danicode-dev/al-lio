import { z } from "zod";

export const RADAR_LEARNING_SCHEMA_VERSION = 1 as const;
export const RADAR_LEARNING_MAX_ITEMS = 100;

const learningMappingSchema = z.object({
  cycleCode: z.enum(["DAW", "DAM", "AF", "TSAF", "MP"]),
  competencyKey: z.string().trim().min(1).max(200).regex(/^[a-z0-9][a-z0-9._:-]*$/i),
  role: z.enum(["primary", "backup", "extension"]),
  coveragePercent: z.number().int().min(1).max(100).nullable().optional(),
  selectionReasons: z.array(z.string().trim().min(1).max(500)).min(1).max(20),
}).strict();

const learningResourceSchema = z.object({
  provider: z.literal("youtube"),
  externalId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  canonicalUrl: z.string().url().max(2_000),
  channelId: z.string().trim().min(1).max(200),
  channelName: z.string().trim().min(1).max(300),
  title: z.string().trim().min(1).max(500),
  description: z.string().trim().max(4_000).nullable().optional(),
  language: z.literal("es"),
  durationSeconds: z.number().int().positive().max(60 * 60 * 24 * 7).nullable(),
  availability: z.literal("available"),
  verifiedAt: z.string().datetime({ offset: true }),
  revision: z.number().int().positive(),
  supersedesExternalId: z.string().regex(/^[A-Za-z0-9_-]{11}$/).nullable().optional(),
}).strict().superRefine((resource, context) => {
  if (resource.canonicalUrl !== `https://www.youtube.com/watch?v=${resource.externalId}`) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["canonicalUrl"],
      message: "canonicalUrl must identify the exact externalId",
    });
  }
});

export const radarLearningDeliverySchema = z.object({
  schemaVersion: z.literal(RADAR_LEARNING_SCHEMA_VERSION),
  deliveryId: z.string().uuid(),
  resources: z.array(z.object({
    resource: learningResourceSchema,
    mappings: z.array(learningMappingSchema).min(1).max(50),
  }).strict()).min(1).max(RADAR_LEARNING_MAX_ITEMS),
}).strict();

export type RadarLearningDelivery = z.infer<typeof radarLearningDeliverySchema>;
export type RadarLearningResource = RadarLearningDelivery["resources"][number];
