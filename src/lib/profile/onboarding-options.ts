import type { FpCycleCode, FpCycleGroup } from "@/lib/db/types";

export const CYCLE_CODES = ["DAW", "DAM", "AF", "TSAF", "MP"] as const satisfies readonly FpCycleCode[];

export function cycleGroupForCode(cycleCode: FpCycleCode): FpCycleGroup {
  return cycleCode === "DAW" || cycleCode === "DAM" ? "DEV" : cycleCode;
}
