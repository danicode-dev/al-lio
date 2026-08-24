import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { signSessionToken, verifySessionToken } from "../src/lib/auth/session-token.ts";
import { isValidRadarItemId } from "../src/lib/radar/item-id.ts";
import { createRadarSignature, radarSignaturesMatch } from "../src/lib/radar/signature.ts";
import { cleanNewsText } from "../src/lib/news/text.ts";
import {
  applicationIdSchema,
  applicationUpdateInputSchema,
  manualApplicationInputSchema,
} from "../src/lib/job-radar/validation.ts";

const validSessionSecret = "session-test-secret-with-32-characters";

async function withSessionEnvironment(callback) {
  const previousSecret = process.env.SESSION_SECRET;
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.SESSION_SECRET = validSessionSecret;
  process.env.NODE_ENV = "test";

  try {
    await callback();
  } finally {
    if (previousSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSecret;

    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
}

test("session tokens verify only with an intact signature and future expiry", async () => {
  await withSessionEnvironment(async () => {
    const payload = {
      uid: "11111111-1111-4111-8111-111111111111",
      email: "student@example.test",
      name: "Test Student",
      exp: Math.floor(Date.now() / 1000) + 300,
    };

    const token = await signSessionToken(payload);
    assert.deepEqual(await verifySessionToken(token), payload);

    const [body, signature] = token.split(".");
    const replacement = signature.startsWith("a") ? "b" : "a";
    const tamperedToken = `${body}.${replacement}${signature.slice(1)}`;
    assert.equal(await verifySessionToken(tamperedToken), null);
  });
});

test("expired and malformed session tokens are rejected", async () => {
  await withSessionEnvironment(async () => {
    const expired = await signSessionToken({
      uid: "22222222-2222-4222-8222-222222222222",
      email: "expired@example.test",
      exp: Math.floor(Date.now() / 1000) - 1,
    });

    assert.equal(await verifySessionToken(expired), null);
    assert.equal(await verifySessionToken("not-a-session-token"), null);
    assert.equal(await verifySessionToken(null), null);
  });
});

test("production session signing requires a sufficiently long secret", async () => {
  const previousSecret = process.env.SESSION_SECRET;
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.SESSION_SECRET = "too-short";
  process.env.NODE_ENV = "production";

  try {
    await assert.rejects(
      signSessionToken({
        uid: "33333333-3333-4333-8333-333333333333",
        email: "student@example.test",
        exp: Math.floor(Date.now() / 1000) + 300,
      }),
      /SESSION_SECRET/,
    );
  } finally {
    if (previousSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSecret;

    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

test("Radar signatures bind timestamp, delivery identifier and exact body", () => {
  const secret = "radar-test-secret-with-at-least-32-characters";
  const timestamp = "2026-08-22T10:00:00.000Z";
  const deliveryId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const body = '{"schemaVersion":2,"items":[]}';
  const signature = createRadarSignature(secret, timestamp, deliveryId, body);

  assert.match(signature, /^v1=[0-9a-f]{64}$/);
  assert.equal(radarSignaturesMatch(signature, signature), true);
  assert.equal(
    radarSignaturesMatch(signature, createRadarSignature(secret, timestamp, deliveryId, `${body} `)),
    false,
  );
  assert.equal(radarSignaturesMatch(signature, "v1=invalid"), false);
});

test("Radar item identifiers stay inside the PostgreSQL bigint boundary", () => {
  assert.equal(isValidRadarItemId("1"), true);
  assert.equal(isValidRadarItemId("0001"), true);
  assert.equal(isValidRadarItemId("9223372036854775807"), true);
  assert.equal(isValidRadarItemId("9223372036854775808"), false);
  assert.equal(isValidRadarItemId("-1"), false);
  assert.equal(isValidRadarItemId("1 OR 1=1"), false);
});

test("news summaries remove active markup and respect the display limit", () => {
  assert.equal(
    cleanNewsText('<script>alert(1)</script><p>Official &amp; relevant update</p>'),
    "Official & relevant update",
  );
  assert.equal(cleanNewsText("A".repeat(400), 40), "A".repeat(40));
  assert.equal(cleanNewsText("   "), undefined);
});

test("manual job applications accept only bounded HTTPS input", () => {
  const valid = manualApplicationInputSchema.safeParse({
    company_name: "Example Company",
    company_url: "https://example.com/careers",
    job_title: "Junior Developer",
    job_url: "https://example.com/jobs/123",
  });
  assert.equal(valid.success, true);

  for (const companyUrl of ["http://example.com", "javascript:alert(1)", "data:text/html,test"]) {
    assert.equal(
      manualApplicationInputSchema.safeParse({
        company_name: "Example Company",
        company_url: companyUrl,
        job_title: "Junior Developer",
      }).success,
      false,
    );
  }
});

test("job application updates reject invalid identifiers and states", () => {
  assert.equal(applicationIdSchema.safeParse("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa").success, true);
  assert.equal(applicationIdSchema.safeParse("1 OR 1=1").success, false);
  assert.equal(applicationUpdateInputSchema.safeParse({ status: "aplicada" }).success, true);
  assert.equal(applicationUpdateInputSchema.safeParse({ status: "invalid" }).success, false);
  assert.equal(applicationUpdateInputSchema.safeParse({ note: "" }).success, false);
});

test("Job Radar API routes use non-redirecting authentication and generic errors", async () => {
  const routes = [
    "src/app/api/job-radar/route.ts",
    "src/app/api/job-radar/[id]/route.ts",
    "src/app/api/job-radar/sync/route.ts",
  ];

  for (const route of routes) {
    const source = await readFile(new URL(`../${route}`, import.meta.url), "utf8");
    assert.match(source, /tryGetCurrentUserId/);
    assert.match(source, /status:\s*401/);
    assert.doesNotMatch(source, /\bgetCurrentUserId\b/);
    assert.doesNotMatch(source, /error:\s*String\(/);
  }
});

test("learning saves do not invalidate or recreate the active video route", async () => {
  const [actionsSource, playerHookSource] = await Promise.all([
    readFile(new URL("../src/lib/learning/actions.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/ruta/use-youtube-player.ts", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(actionsSource, /revalidatePath\(`\/aprende\//);
  assert.doesNotMatch(
    playerHookSource,
    /\[youtubeRef\?\.type,\s*youtubeRef\?\.id,\s*initialTimeSeconds/,
  );
});

test("learning notes are saved atomically and mirrored to Bloc", async () => {
  const [actionsSource, repositorySource] = await Promise.all([
    readFile(new URL("../src/lib/learning/actions.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/db/repositories/learning.ts", import.meta.url), "utf8"),
  ]);

  assert.match(actionsSource, /addLearningNoteToBloc/);
  assert.match(repositorySource, /withTransaction/);
  assert.match(repositorySource, /INSERT INTO public\.fp_learning_notes/);
  assert.match(repositorySource, /INSERT INTO public\.bloc_notes/);
  assert.match(repositorySource, /ON CONFLICT \(user_id, source_type, source_id\)/);
});

test("News detail API route authenticates without redirecting, validates the id, and never distinguishes not-found from unauthorized", async () => {
  const source = await readFile(new URL("../src/app/api/news/[id]/route.ts", import.meta.url), "utf8");
  assert.match(source, /tryGetCurrentUserId/);
  assert.doesNotMatch(source, /\bgetCurrentUserId\b/);
  assert.match(source, /status:\s*401/);
  assert.match(source, /isValidRadarItemId/);
  assert.match(source, /status:\s*400/);

  const notFoundMatches = source.match(/status:\s*404/g) ?? [];
  assert.equal(
    notFoundMatches.length,
    1,
    "the detail route must return exactly one generic not-found response, never a distinct one for cross-cycle or unapproved items",
  );
  assert.doesNotMatch(source, /forbidden|cross.?cycle|not.?authorized/i);
  assert.doesNotMatch(source, /error:\s*String\(/);
});

test("Radar detail query mirrors the list boundary (cycle, destination, kind, freshness-or-saved) and related items reuse it", async () => {
  const source = await readFile(new URL("../src/lib/db/repositories/radar.ts", import.meta.url), "utf8");

  assert.match(source, /export async function getRadarItemDetailForUser/);
  assert.match(source, /item\.id = \$3::bigint/);
  assert.match(source, /ANY\(item\.target_cycle_codes\)/);
  assert.match(source, /item\.destination = 'news'/);
  assert.match(source, /item\.kind IN \('news', 'legal'\)/);
  assert.match(source, /state\.status = 'saved'/);
  assert.match(source, /interval '7 days'/);
  assert.match(source, /interval '30 days'/);

  assert.match(source, /export async function getRelatedNewsItems/);
  const relatedFunctionSource = source.slice(source.indexOf("export async function getRelatedNewsItems"));
  assert.match(relatedFunctionSource, /listRadarItemsForCycle\(/);
  assert.doesNotMatch(relatedFunctionSource, /FROM public\.radar_items/);
});

test("News cards link to the internal detail page and keep the existing external source link", async () => {
  const source = await readFile(new URL("../src/components/noticias/noticias-view.tsx", import.meta.url), "utf8");
  assert.match(source, /from "next\/link"/);
  assert.match(source, /href=\{`\/noticias\/\$\{item\.id\}`\}/);
  assert.match(source, /href=\{item\.url\}/);
  assert.doesNotMatch(source, /dangerouslySetInnerHTML/);
});

test("News detail view offers a clear Spanish source action and never injects raw HTML", async () => {
  const source = await readFile(new URL("../src/components/noticias/news-detail-view.tsx", import.meta.url), "utf8");
  assert.match(source, /Leer noticia original/);
  assert.match(source, /Volver a Noticias/);
  assert.doesNotMatch(source, /dangerouslySetInnerHTML/);
});

test("Read/save mutations require the live-feed boundary before a first save, and never downgrade a saved item", async () => {
  const source = await readFile(new URL("../src/lib/db/repositories/radar.ts", import.meta.url), "utf8");
  const fnSource = source.slice(
    source.indexOf("export async function setRadarItemStatus"),
    source.indexOf("export async function getRadarItemDetailForUser"),
  );

  // Same cycle/destination/kind/freshness boundary as the list and detail queries.
  assert.match(fnSource, /ANY\(item\.target_cycle_codes\)/);
  assert.match(fnSource, /item\.destination = 'news'/);
  assert.match(fnSource, /item\.kind IN \('news', 'legal'\)/);
  assert.match(fnSource, /item\.expires_at IS NULL OR item\.expires_at > now\(\)/);
  assert.match(fnSource, /interval '7 days'/);
  assert.match(fnSource, /interval '30 days'/);

  // A not-yet-saved (stale) item is gated by that boundary; an already-saved one bypasses it,
  // matching the saved-archive guarantee instead of re-checking freshness on every call.
  assert.match(fnSource, /existing\.status = 'saved'/);

  // Status transitions are monotonic: saved can never be overwritten back to read.
  assert.match(fnSource, /WHEN public\.radar_item_user_states\.status = 'saved' THEN 'saved'/);

  // Upsert stays a single idempotent statement under repeated/concurrent calls.
  assert.match(fnSource, /ON CONFLICT \(user_id, radar_item_id\) DO UPDATE/);
});

test("News detail view separates unavailable content from a temporary failure, with retry only for the latter", async () => {
  const source = await readFile(new URL("../src/components/noticias/news-detail-view.tsx", import.meta.url), "utf8");

  // Distinct states instead of collapsing every failure into one null/loading pair.
  for (const status of ["loading", "loaded", "unavailable", "unauthenticated", "profile-incomplete", "error"]) {
    assert.match(source, new RegExp(`"${status}"`), `missing view state: ${status}`);
  }

  // 404/400 map to the generic not-found state, never to the retry-capable error state.
  const notFoundBranch = source.slice(source.indexOf("status === 404"), source.indexOf("status === 401"));
  assert.match(notFoundBranch, /status: "unavailable"/);

  // The temporary-failure state offers a real retry action and never claims the item
  // expired or doesn't belong to the student's cycle (that would be dishonest for a
  // network/server failure that has nothing to do with authorization or freshness).
  const errorBranch = source.slice(source.indexOf('state.status === "error"'), source.indexOf("const { item, related } = state.data;"));
  assert.match(errorBranch, /Reintentar/);
  assert.match(errorBranch, /onClick=\{\(\) => void load\(\)\}/);
  assert.doesNotMatch(errorBranch, /caducad|no corresponda a tu ciclo/);

  // The detail query never returns kind === "event" (destination='news', kind IN news/legal
  // only), so the event-only rendering block from the original draft is unreachable and gone.
  assert.doesNotMatch(source, /item\.kind === "event"/);
});

test("The card's internal link no longer duplicates the read mutation; the external source link still marks read", async () => {
  const source = await readFile(new URL("../src/components/noticias/noticias-view.tsx", import.meta.url), "utf8");

  const internalLinkStart = source.indexOf("href={`/noticias/${item.id}`}");
  assert.ok(internalLinkStart > -1, "internal detail link not found");
  const internalLinkTag = source.slice(Math.max(0, internalLinkStart - 20), internalLinkStart + 180);
  assert.doesNotMatch(internalLinkTag, /onClick/);

  const externalLinkStart = source.indexOf("href={item.url}");
  assert.ok(externalLinkStart > -1, "external source link not found");
  const externalLinkTag = source.slice(externalLinkStart, externalLinkStart + 200);
  assert.match(externalLinkTag, /onClick=\{onRead\}/);
});

test("Task editing preserves critical priority and optional due time", async () => {
  const source = await readFile(new URL("../src/components/tasks/tasks-view.tsx", import.meta.url), "utf8");

  assert.match(source, /useState<Task\["priority"\]>\(task\.priority\)/);
  assert.match(source, /<option value="critica">Prioridad crítica<\/option>/);
  assert.match(source, /task\.due_at\?\.includes\("T"\)/);
  assert.match(source, /type="time"/);
  assert.match(source, /`\$\{dueDate\}\$\{dueTime \? `T\$\{dueTime\}` : ""\}`/);
  assert.doesNotMatch(source, /task\.priority === "critica" \? "alta"/);
});

test("Task edit waits for persistence and keeps the dialog open after failure", async () => {
  const [viewSource, storeSource] = await Promise.all([
    readFile(new URL("../src/components/tasks/tasks-view.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/guest-store.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(viewSource, /await actions\.updateTask\(editingTask\.id, data\);\s+setEditingTask\(null\);/);
  assert.match(viewSource, /No se pudo guardar la tarea/);
  assert.match(viewSource, /\{saving \? "Guardando…" : "Guardar"\}/);

  assert.match(storeSource, /if \(!response\?\.result\) throw new Error\("Task update was not persisted"\)/);
  assert.match(storeSource, /patchById\(current\.tasks, id, previousTask\)/);
  assert.match(storeSource, /throw error;/);
});

test("The authenticated student tree owns exactly one store provider (issue #90)", async () => {
  const [guestAppSource, guestStoreSource, storedGuestAppSource, dashboardClientSource, layoutSource] = await Promise.all([
    readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/guest-store.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/stored-guest-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/dashboard/dashboard-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/(dashboard)/layout.tsx", import.meta.url), "utf8"),
  ]);

  // guest-app.tsx must not define its own context/provider/mutations anymore -
  // it consumes the canonical one from guest-store.tsx.
  assert.doesNotMatch(guestAppSource, /createContext/);
  assert.doesNotMatch(guestAppSource, /export function StoreProvider/);
  assert.doesNotMatch(guestAppSource, /export function useStore/);
  assert.match(guestAppSource, /import \{ useStore \} from "@\/components\/guest-store";/);

  // guest-store.tsx is the sole canonical implementation.
  assert.match(guestStoreSource, /export function StoreProvider/);
  assert.match(guestStoreSource, /export function useStore/);

  // Only the layout mounts a StoreProvider; StoredGuestApp and DashboardClient
  // are pure consumers of the ambient context, not additional mount points.
  assert.match(layoutSource, /<StoreProvider initialStore=\{store\}>/);
  assert.doesNotMatch(storedGuestAppSource, /StoreProvider/);
  assert.doesNotMatch(dashboardClientSource, /StoreProvider/);
});

test("The merged store fetch loads every section with fail-soft handling (issue #90)", async () => {
  const dataSource = await readFile(new URL("../src/lib/data.ts", import.meta.url), "utf8");

  // getShellStore/getDashboardStore no longer exist as separate, nested fetches.
  assert.doesNotMatch(dataSource, /export const getShellStore/);
  assert.doesNotMatch(dataSource, /export async function getDashboardStore/);
  assert.match(dataSource, /export const getGlobalStore = cache\(async \(\) => \{/);

  for (const section of [
    'loadStoreSection\\("tasks"',
    'loadStoreSection\\("courses"',
    'loadStoreSection\\("hackathons"',
    'loadStoreSection\\("opportunities", getAllTechOpportunities',
    'loadStoreSection\\("opportunities", getFpContentForProfile',
    'loadStoreSection\\("companies", getCompaniesByCycleGroup',
    'loadStoreSection\\("companies", getFavoriteCompanyIds',
    'loadStoreSection\\("roadmap"',
  ]) {
    assert.match(dataSource, new RegExp(section), `missing fail-soft wrapping for ${section}`);
  }
});
