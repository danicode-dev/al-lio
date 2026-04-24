import type { NormalizedOpportunity } from "@/lib/db/types";
import { emptyOnError } from "./common";

export async function collect(): Promise<NormalizedOpportunity[]> {
  try {
    return [];
  } catch (error) {
    return emptyOnError(error, "tecnoempleo-rss");
  }
}
