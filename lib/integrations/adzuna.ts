import type { NormalizedOpportunity } from "@/lib/db/types";
import { emptyOnError } from "./common";

export async function collect(): Promise<NormalizedOpportunity[]> {
  if (!process.env.ADZUNA_APP_ID || !process.env.ADZUNA_APP_KEY) return [];
  try {
    return [];
  } catch (error) {
    return emptyOnError(error, "adzuna");
  }
}
