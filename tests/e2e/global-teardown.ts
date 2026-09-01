import { cleanupE2eData } from "./support/fixtures";

// Always runs, including after a failed test. Removes only the two reserved
// synthetic users and their data.
export default async function globalTeardown(): Promise<void> {
  await cleanupE2eData();
  console.log("[e2e] Synthetic users and their task data removed.");
}
