import "server-only";
import { query } from "@/lib/db/pool";
import type {
  DbFpContentItem,
  DbFpCycle,
  DbFpUserContentState,
  DbProfile,
  FpAcademicYear,
  FpCycleCode,
  FpCycleGroup,
} from "@/lib/db/types";

export type FpCatalogContentRow = DbFpContentItem & {
  cycle_code: FpCycleCode;
  cycle_group: FpCycleGroup;
  priority: "Alta" | "Media" | "Baja";
  fit_score: number;
  audience_year: FpAcademicYear | null;
  user_status: DbFpUserContentState["status"] | null;
  is_favorite: boolean;
  user_notes: string | null;
  user_completed_at: string | null;
};

export async function getActiveFpCycles(): Promise<DbFpCycle[]> {
  const res = await query<DbFpCycle>(
    `SELECT *
     FROM public.fp_cycles
     WHERE is_active = true
     ORDER BY sort_order ASC, code ASC`
  );
  return res.rows;
}

export async function getFpContentForProfile(
  userId: string,
  profile: Pick<DbProfile, "cycle_code" | "cycle_group" | "academic_year" | "interests">,
  options: { includeVolatile?: boolean } = {}
): Promise<FpCatalogContentRow[]> {
  if (!profile.cycle_group) return [];

  const values: unknown[] = [userId, profile.cycle_group];
  const filters = ["fit.cycle_group = $2"];

  if (profile.academic_year) {
    values.push(profile.academic_year);
    filters.push(`(fit.audience_year is null or fit.audience_year = $${values.length})`);
  }

  if (!options.includeVolatile) {
    filters.push("item.type <> 'empleo_busqueda'");
  }

  const res = await query<FpCatalogContentRow>(
    `SELECT
       item.*,
       fit.cycle_code,
       fit.cycle_group,
       fit.priority,
       fit.fit_score,
       fit.audience_year,
       state.status as user_status,
       coalesce(state.is_favorite, false) as is_favorite,
       state.notes as user_notes,
       state.completed_at as user_completed_at
     FROM public.fp_content_items item
     INNER JOIN public.fp_content_cycle_fit fit
       ON fit.content_item_id = item.id
     LEFT JOIN public.fp_user_content_state state
       ON state.content_item_id = item.id
      AND state.user_id = $1
     WHERE ${filters.join(" AND ")}
     ORDER BY
       case fit.priority when 'Alta' then 0 when 'Media' then 1 else 2 end,
       fit.fit_score DESC,
       item.start_date ASC NULLS LAST,
       item.title ASC`,
    values
  );

  return res.rows;
}

export async function upsertFpUserContentState(
  userId: string,
  contentItemId: string,
  data: Partial<Pick<DbFpUserContentState, "status" | "is_favorite" | "notes" | "reminder_at" | "completed_at">>
): Promise<DbFpUserContentState> {
  const shouldUpdate = (key: keyof typeof data) => Object.prototype.hasOwnProperty.call(data, key);
  const updateSets = [
    shouldUpdate("status") ? "status = excluded.status" : null,
    shouldUpdate("is_favorite") ? "is_favorite = excluded.is_favorite" : null,
    shouldUpdate("notes") ? "notes = excluded.notes" : null,
    shouldUpdate("reminder_at") ? "reminder_at = excluded.reminder_at" : null,
    shouldUpdate("completed_at") ? "completed_at = excluded.completed_at" : null,
    "updated_at = now()",
  ].filter(Boolean);

  const res = await query<DbFpUserContentState>(
    `INSERT INTO public.fp_user_content_state
       (user_id, content_item_id, status, is_favorite, notes, reminder_at, completed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id, content_item_id) DO UPDATE SET
       ${updateSets.join(", ")}
     RETURNING *`,
    [
      userId,
      contentItemId,
      data.status ?? "saved",
      data.is_favorite ?? false,
      data.notes ?? null,
      data.reminder_at ?? null,
      data.completed_at ?? null,
    ]
  );
  return res.rows[0];
}
