import { resolveE2eConfig } from "./support/env";
import { provisionE2eUsers, syntheticPassword } from "./support/fixtures";

// Runs once before the suite. The guard and the password check both throw on
// anything that is not a clearly isolated local environment, so the run stops
// before the application server or a browser is started.
export default async function globalSetup(): Promise<void> {
  const config = resolveE2eConfig();
  syntheticPassword();
  await provisionE2eUsers();
  // Host only, never the connection string - it carries credentials.
  console.log(`[e2e] Ready: app ${config.baseURL}, database "${config.databaseName}" on ${config.databaseHost}.`);
}
