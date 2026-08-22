import { z } from "zod";

const applicationStatuses = [
  "nueva",
  "revisada",
  "aplicada",
  "en_proceso",
  "descartada",
  "sin_respuesta",
  "oferta",
] as const;

const httpsUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .url()
  .refine((value) => new URL(value).protocol === "https:", "URL must use HTTPS");

const applicationStatusSchema = z.enum(applicationStatuses);

export const manualApplicationInputSchema = z
  .object({
    company_name: z.string().trim().min(1).max(160),
    company_url: httpsUrlSchema,
    job_title: z.string().trim().min(1).max(200),
    job_url: z.union([httpsUrlSchema, z.literal("")]).optional(),
  })
  .strict()
  .transform((value) => ({
    ...value,
    job_url: value.job_url || undefined,
  }));

export const applicationUpdateInputSchema = z
  .object({
    status: applicationStatusSchema.optional(),
    note: z.string().trim().min(1).max(2000).optional(),
  })
  .strict()
  .refine((value) => value.status !== undefined || value.note !== undefined);

export const applicationIdSchema = z.string().uuid();
