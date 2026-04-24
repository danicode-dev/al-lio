import type { NormalizedOpportunity } from "@/lib/db/types";
import { emptyOnError } from "./common";

export async function collect(): Promise<NormalizedOpportunity[]> {
  if (!process.env.JOOBLE_API_KEY) return [];
  try {
    return [];
  } catch (error) {
    return emptyOnError(error, "jooble");
  }
}
