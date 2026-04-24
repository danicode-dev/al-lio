import type { NormalizedOpportunity } from "@/lib/db/types";
import { emptyOnError } from "./common";

export async function collect(): Promise<NormalizedOpportunity[]> {
  if (!process.env.INFOJOBS_CLIENT_ID || !process.env.INFOJOBS_CLIENT_SECRET) return [];
  try {
    return [];
  } catch (error) {
    return emptyOnError(error, "infojobs");
  }
}
