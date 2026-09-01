// Synthetic users, safe fixture provisioning and cleanup for the Tasks E2E
// harness (issue #329).
//
// Everything here is scoped to two reserved identifiers. Cleanup only ever
// targets those exact ids, so it is safe to run in `finally` even when a test
// failed or a user was never created.

import bcrypt from "bcryptjs";
import { Client } from "pg";
import { test as base, expect, type Page } from "@playwright/test";

import { resolveE2eConfig } from "./env";

export { expect };

export const E2E_TASK_PREFIX = "E2E-TASK";

export const E2E_USERS = {
  A: {
    id: "a11ce2e0-0000-4000-8000-000000000001",
    email: "tasks-e2e-user-a@al-lio.test",
    displayName: "Tasks E2E User A",
  },
  B: {
    id: "b0b1e2e0-0000-4000-8000-000000000002",
    email: "tasks-e2e-user-b@al-lio.test",
    displayName: "Tasks E2E User B",
  },
} as const;

export type E2eUserKey = keyof typeof E2E_USERS;

const E2E_USER_IDS = Object.values(E2E_USERS).map((user) => user.id);

// The password is generated fresh per run by scripts/e2e/run.mjs and passed in
// through the environment. It is never written to disk, never logged, and never
// typed into an assertion message.
export function syntheticPassword(): string {
  const value = process.env.E2E_SYNTHETIC_PASSWORD;
  if (!value || value.length < 16) {
    throw new Error("[e2e-guard] E2E_SYNTHETIC_PASSWORD is missing. Run the suite through `npm run e2e`.");
  }
  return value;
}

async function withDbClient<T>(work: (client: Client) => Promise<T>): Promise<T> {
  const { databaseUrl } = resolveE2eConfig();
  const client = new Client({ connectionString: databaseUrl, application_name: "al-lio-e2e-fixture" });
  await client.connect();
  try {
    return await work(client);
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function cleanupE2eData(): Promise<void> {
  await withDbClient(async (client) => {
    // `on delete cascade` on users would be enough, but each table is cleared
    // explicitly so the predicate is always the reserved-id list and never a
    // heuristic over titles or emails.
    await client.query(`DELETE FROM public.tasks WHERE user_id = ANY($1::uuid[])`, [E2E_USER_IDS]);
    await client.query(`DELETE FROM public.auth_tokens WHERE user_id = ANY($1::uuid[])`, [E2E_USER_IDS]);
    await client.query(`DELETE FROM public.external_identities WHERE user_id = ANY($1::uuid[])`, [E2E_USER_IDS]);
    await client.query(`DELETE FROM public.profiles WHERE user_id = ANY($1::uuid[])`, [E2E_USER_IDS]);
    await client.query(`DELETE FROM public.users WHERE id = ANY($1::uuid[])`, [E2E_USER_IDS]);
    // Safe as a whole-table wipe only because this database is exclusively the
    // disposable E2E one: rate_limit_buckets keys are salted digests with no
    // user_id, and the harness must not inherit a throttled state between runs.
    await client.query(`DELETE FROM public.rate_limit_buckets`);
  });
}

export async function provisionE2eUsers(): Promise<void> {
  const passwordHash = bcrypt.hashSync(syntheticPassword(), 10);
  await cleanupE2eData();
  await withDbClient(async (client) => {
    for (const user of Object.values(E2E_USERS)) {
      await client.query(
        `INSERT INTO public.users (id, email, password_hash, display_name, email_confirmed_at)
         VALUES ($1, $2, $3, $4, now())`,
        [user.id, user.email, passwordHash, user.displayName],
      );
      // A completed onboarding profile so the shared private layout does not
      // redirect to /onboarding, and a finished product tour so its overlay
      // never covers the interface under test.
      await client.query(
        `INSERT INTO public.profiles
           (user_id, full_name, display_name, cycle_code, cycle_group, academic_year,
            onboarding_completed_at, onboarding_version, product_tour_status, product_tour_version)
         VALUES ($1, $2, $2, 'DAW', 'DEV', 1, now(), 1, 'completed', 2)`,
        [user.id, user.displayName],
      );
    }
  });
}

export async function countTasksLike(userKey: E2eUserKey, titlePattern: string): Promise<number> {
  return withDbClient(async (client) => {
    const result = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM public.tasks WHERE user_id = $1 AND title LIKE $2`,
      [E2E_USERS[userKey].id, titlePattern],
    );
    return Number(result.rows[0]?.count ?? "0");
  });
}

type HarnessFixtures = {
  loginAs: (page: Page, userKey: E2eUserKey) => Promise<void>;
};

export const test = base.extend<HarnessFixtures>({
  loginAs: async ({}, use) => {
    await use(async (page, userKey) => {
      const user = E2E_USERS[userKey];
      await page.goto("/login");
      await page.getByLabel("Correo electrónico").fill(user.email);
      await page.getByLabel("Contraseña", { exact: true }).fill(syntheticPassword());
      await page.getByRole("button", { name: "Iniciar sesión" }).click();
      await page.waitForURL("**/dashboard");
    });
  },
});
