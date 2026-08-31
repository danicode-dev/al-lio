import "server-only";

import { query } from "@/lib/db/pool";
import type { DbHackathon } from "@/lib/db/types";

export type EventWrite = {
  id?: string;
  name: string;
  organizer?: string | null;
  province: string;
  city?: string | null;
  type?: string;
  status?: "inscripcion_abierta" | "pendiente" | "realizado" | "revisar_futura_edicion" | "descartado";
  event_start_date?: string | null;
  event_end_date?: string | null;
  registration_deadline?: string | null;
  url?: string | null;
  notes?: string | null;
  priority?: "alta" | "media" | "baja";
  next_review_at?: string | null;
};

export type EventPatch = Partial<Omit<EventWrite, "id" | "name" | "province">> & {
  name?: string;
  province?: string;
};

export async function getHackathonsByUser(userId: string): Promise<DbHackathon[]> {
  const result = await query<DbHackathon>(
    `SELECT * FROM public.hackathons WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );
  return result.rows;
}

export async function createHackathon(userId: string, data: EventWrite): Promise<DbHackathon> {
  const result = await query<DbHackathon>(
    `INSERT INTO public.hackathons
      (id, user_id, name, organizer, province, city, type, status, event_start_date,
       event_end_date, registration_deadline, url, notes, priority, next_review_at)
     VALUES (coalesce($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8,
             $9, $10, $11, $12, $13, $14, $15)
     RETURNING *`,
    [
      data.id ?? null,
      userId,
      data.name,
      data.organizer ?? null,
      data.province,
      data.city ?? null,
      data.type ?? "hackathon",
      data.status ?? "revisar_futura_edicion",
      data.event_start_date ?? null,
      data.event_end_date ?? null,
      data.registration_deadline ?? null,
      data.url ?? null,
      data.notes ?? null,
      data.priority ?? "media",
      data.next_review_at ?? null,
    ],
  );
  return result.rows[0];
}

export async function updateHackathon(userId: string, id: string, patch: EventPatch): Promise<DbHackathon | null> {
  const assignments: string[] = [];
  const values: unknown[] = [];
  const add = (column: string, value: unknown) => {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  };

  if (patch.name !== undefined) add("name", patch.name);
  if (patch.organizer !== undefined) add("organizer", patch.organizer);
  if (patch.province !== undefined) add("province", patch.province);
  if (patch.city !== undefined) add("city", patch.city);
  if (patch.type !== undefined) add("type", patch.type);
  if (patch.status !== undefined) add("status", patch.status);
  if (patch.event_start_date !== undefined) add("event_start_date", patch.event_start_date);
  if (patch.event_end_date !== undefined) add("event_end_date", patch.event_end_date);
  if (patch.registration_deadline !== undefined) add("registration_deadline", patch.registration_deadline);
  if (patch.url !== undefined) add("url", patch.url);
  if (patch.notes !== undefined) add("notes", patch.notes);
  if (patch.priority !== undefined) add("priority", patch.priority);
  if (patch.next_review_at !== undefined) add("next_review_at", patch.next_review_at);
  if (assignments.length === 0) return null;

  values.push(id, userId);
  const result = await query<DbHackathon>(
    `UPDATE public.hackathons
        SET ${assignments.join(", ")}, updated_at = now()
      WHERE id = $${values.length - 1} AND user_id = $${values.length}
      RETURNING *`,
    values,
  );
  return result.rows[0] ?? null;
}

export async function deleteHackathonsByUserLike(userId: string, pattern: string): Promise<void> {
  await query(`DELETE FROM public.hackathons WHERE user_id = $1 AND name LIKE $2`, [userId, pattern]);
}

export async function toggleHackathonFavorite(userId: string, id: string): Promise<boolean | null> {
  const result = await query<{ is_favorite: boolean }>(
    `UPDATE public.hackathons
        SET is_favorite = NOT is_favorite, updated_at = now()
      WHERE id = $1 AND user_id = $2
      RETURNING is_favorite`,
    [id, userId],
  );
  return result.rows[0]?.is_favorite ?? null;
}
