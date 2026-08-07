import "server-only";
import { query } from "@/lib/db/pool";
import type { JobApplication, ApplicationStatus, ApplicationNote } from "./types";

export async function getApplications(userId: string): Promise<JobApplication[]> {
  const res = await query<JobApplication>(
    `SELECT * FROM public.job_applications WHERE user_id = $1 ORDER BY detected_at DESC`,
    [userId]
  );
  return res.rows;
}

export async function getNewCount(userId: string): Promise<number> {
  const res = await query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM public.job_applications WHERE user_id = $1 AND is_new = true`,
    [userId]
  );
  return parseInt(res.rows[0]?.count ?? "0", 10);
}

export async function upsertScrapedJob(
  userId: string,
  job: {
    company_name: string;
    company_url: string;
    job_title: string;
    job_url: string | null;
    page_hash: string;
  },
): Promise<{ inserted: boolean }> {
  const existing = await query(
    `SELECT id FROM public.job_applications WHERE user_id = $1 AND page_hash = $2 AND company_url = $3 LIMIT 1`,
    [userId, job.page_hash, job.company_url]
  );
  if (existing.rows.length > 0) return { inserted: false };

  await query(
    `INSERT INTO public.job_applications (user_id, company_name, company_url, job_title, job_url, page_hash, source, status, is_new)
     VALUES ($1, $2, $3, $4, $5, $6, 'radar', 'nueva', true)`,
    [userId, job.company_name, job.company_url, job.job_title, job.job_url, job.page_hash]
  );
  return { inserted: true };
}

export async function insertManualApplication(
  userId: string,
  data: { company_name: string; company_url: string; job_title: string; job_url?: string },
): Promise<JobApplication> {
  const res = await query<JobApplication>(
    `INSERT INTO public.job_applications (user_id, company_name, company_url, job_title, job_url, source, status, is_new)
     VALUES ($1, $2, $3, $4, $5, 'manual', 'nueva', false)
     RETURNING *`,
    [userId, data.company_name, data.company_url, data.job_title, data.job_url ?? null]
  );
  return res.rows[0];
}

export async function updateApplicationStatus(
  userId: string,
  id: string,
  status: ApplicationStatus,
): Promise<void> {
  const appliedAt = status === "aplicada" ? new Date().toISOString() : null;
  if (appliedAt) {
    await query(
      `UPDATE public.job_applications SET status = $1, applied_at = $2, is_new = false WHERE id = $3 AND user_id = $4`,
      [status, appliedAt, id, userId]
    );
  } else {
    await query(
      `UPDATE public.job_applications SET status = $1, is_new = false WHERE id = $2 AND user_id = $3`,
      [status, id, userId]
    );
  }
}

export async function addApplicationNote(
  userId: string,
  id: string,
  text: string,
): Promise<void> {
  const existing = await query<{ notes: ApplicationNote[] }>(
    `SELECT notes FROM public.job_applications WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  const notes: ApplicationNote[] = Array.isArray(existing.rows[0]?.notes)
    ? existing.rows[0].notes
    : [];
  notes.push({ text, created_at: new Date().toISOString() });
  await query(
    `UPDATE public.job_applications SET notes = $1 WHERE id = $2 AND user_id = $3`,
    [JSON.stringify(notes), id, userId]
  );
}

export async function deleteApplication(userId: string, id: string): Promise<void> {
  await query(
    `DELETE FROM public.job_applications WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
}
