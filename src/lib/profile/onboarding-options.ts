import type { FpCycleCode, FpCycleGroup } from "@/lib/db/types";

export const CYCLE_CODES = ["DAW", "DAM", "AF", "TSAF", "MP"] as const satisfies readonly FpCycleCode[];

export const ONBOARDING_INTEREST_OPTIONS = [
  "herramientas",
  "cursos",
  "portfolio",
  "hackathons",
  "organizacion",
] as const;

export function cycleGroupForCode(cycleCode: FpCycleCode): FpCycleGroup {
  return cycleCode === "DAW" || cycleCode === "DAM" ? "DEV" : cycleCode;
}
