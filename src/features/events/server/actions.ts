"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUserId } from "@/lib/auth/current-user";
import { createHackathon, toggleHackathonFavorite, updateHackathon } from "@/features/events/server/repository";

const optionalText = (maximum: number) => z.string().trim().max(maximum).optional().nullable();
const optionalUrl = z.union([z.string().trim().url().max(2_000), z.literal("")]).optional().nullable();
const optionalDate = z.union([z.string().date(), z.literal("")]).optional().nullable();
const eventStatus = z.enum(["inscripcion_abierta", "pendiente", "realizado", "revisar_futura_edicion", "descartado"]);
const eventPriority = z.enum(["alta", "media", "baja"]);

const createEventSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(300),
  organizer: optionalText(300),
  province: z.string().trim().min(1).max(120),
  city: optionalText(120),
  status: eventStatus.default("revisar_futura_edicion"),
  priority: eventPriority.default("media"),
  startAt: optionalDate,
  endAt: optionalDate,
  registrationDeadlineAt: optionalDate,
  url: optionalUrl,
  notes: optionalText(20_000),
}).strict();

const completeEventSchema = z.object({ id: z.string().uuid() }).strict();
const eventIdSchema = z.string().uuid();

export type EventMutationResult =
  | { ok: true }
  | { ok: false; error: "invalid_input" | "not_found" | "save_failed" };

export async function createEventAction(input: unknown): Promise<EventMutationResult> {
  const parsed = createEventSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const userId = await getCurrentUserId();
  try {
    const data = parsed.data;
    await createHackathon(userId, {
      id: data.id,
      name: data.name,
      organizer: emptyToNull(data.organizer),
      province: data.province,
      city: emptyToNull(data.city),
      type: "hackathon",
      status: data.status,
      priority: data.priority,
      event_start_date: emptyToNull(data.startAt),
      event_end_date: emptyToNull(data.endAt),
      registration_deadline: emptyToNull(data.registrationDeadlineAt),
      url: emptyToNull(data.url),
      notes: emptyToNull(data.notes),
    });
    revalidateEvents();
    return { ok: true };
  } catch {
    return { ok: false, error: "save_failed" };
  }
}

export async function completeEventAction(input: unknown): Promise<EventMutationResult> {
  const parsed = completeEventSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const userId = await getCurrentUserId();
  try {
    if (!(await updateHackathon(userId, parsed.data.id, { status: "realizado" }))) {
      return { ok: false, error: "not_found" };
    }
    revalidateEvents();
    return { ok: true };
  } catch {
    return { ok: false, error: "save_failed" };
  }
}

export async function toggleHackathonFavoriteAction(
  input: unknown,
): Promise<{ error: string | null; isFavorite: boolean | null }> {
  const parsed = eventIdSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid_input", isFavorite: null };
  const userId = await getCurrentUserId();
  try {
    const isFavorite = await toggleHackathonFavorite(userId, parsed.data);
    if (isFavorite === null) return { error: "hackathon_not_found", isFavorite: null };
    revalidateEvents();
    return { error: null, isFavorite };
  } catch {
    return { error: "favorite_save_failed", isFavorite: null };
  }
}

function emptyToNull(value: string | null | undefined): string | null {
  return value?.trim() ? value.trim() : null;
}

function revalidateEvents() {
  revalidatePath("/hackathons");
  revalidatePath("/calendar");
}
