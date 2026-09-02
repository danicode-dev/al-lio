import type { Hackathon } from "@/components/store/types";
import { isPastActionDate, pad, parseDate } from "@/lib/catalog/date-filters";

// Date-aware helpers for the Events feature, kept next to their only callers
// (the catalogue container and the detail view). They stay out of
// event-catalogue-model.ts because that module is executed directly by the
// plain Node unit runner, which cannot resolve the "@/lib" alias these
// functions depend on.

export function isHackathonPast(
  hackathon: Pick<Hackathon, "inscripcion_hasta" | "registration_deadline_at" | "end_at" | "start_at">,
) {
  return isPastActionDate(
    hackathon.inscripcion_hasta || hackathon.registration_deadline_at || hackathon.end_at || hackathon.start_at,
  );
}

function toDatetimeLocalValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function addDaysKeepingTime(value: string | undefined, days: number) {
  const base = parseDate(value) ?? new Date();
  base.setDate(base.getDate() + days);
  return toDatetimeLocalValue(base);
}
