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
import {
  fpUserStatusToHackathonStatus,
  isPreparationComplete,
  selectFeaturedHackathon,
} from "../src/lib/fp/event-lifecycle.ts";
import { resolveLegacyRutaTarget, selectAptitudeVideo } from "../src/lib/fp/event-cta.ts";
import {
  buildFeaturedHackathonCards,
  buildUpcomingFeed,
  selectDashboardTodoTasks,
} from "../src/lib/dashboard/upcoming-feed.ts";

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

test("Quick Add, Calendar and Notifications form one shared header action group mounted once per page (issue #91)", async () => {
  const [headerSource, layoutSource, guestAppSource, quickAddSource, dashboardClientSource, dashboardGreetingSource] = await Promise.all([
    readFile(new URL("../src/components/student-header-actions.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/(dashboard)/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/quick-add.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/dashboard/dashboard-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/dashboard/dashboard-greeting.tsx", import.meta.url), "utf8"),
  ]);

  // Desktop order: Quick Add, then Calendar, then Notifications.
  const quickAddIdx = headerSource.indexOf('aria-label="Añadir rápido"');
  const calendarIdx = headerSource.indexOf('aria-label="Abrir calendario"');
  const notifIdx = headerSource.search(/aria-label=\{alerts\.length/);
  assert.ok(quickAddIdx > -1 && calendarIdx > quickAddIdx && notifIdx > calendarIdx, "expected Quick Add, Calendar, Notifications in that order");

  // Every required student page is covered by the route allowlist.
  for (const route of ["/dashboard", "/roadmap", "/tasks", "/bloc", "/noticias", "/work", "/courses", "/hackathons", "/calendar", "/profile"]) {
    assert.match(headerSource, new RegExp(`"${route}"`), `missing route in allowlist: ${route}`);
  }
  // Admin-only /settings is not part of the allowlist.
  assert.doesNotMatch(headerSource, /"\/settings"/);

  // Mounted exactly twice in the layout (mobile slot + desktop slot) - the only mount point for the whole tree.
  const layoutMounts = (layoutSource.match(/<StudentHeaderActions \/>/g) ?? []).length;
  assert.equal(layoutMounts, 2, "expected exactly one mobile and one desktop mount in the layout");

  // The old per-view/per-route duplicates are gone: no more BrandHeaderActions row,
  // no more floating QuickAdd mount, no more local NotificationBell in guest-app.tsx.
  assert.doesNotMatch(guestAppSource, /BrandHeaderActions/);
  assert.doesNotMatch(guestAppSource, /<QuickAdd\b/);
  assert.doesNotMatch(guestAppSource, /function NotificationBell/);
  assert.doesNotMatch(dashboardClientSource, /MobileHeaderActions|headerActions/);
  assert.doesNotMatch(dashboardGreetingSource, /actions:/);

  // QuickAdd itself no longer renders its own always-on floating trigger.
  assert.doesNotMatch(quickAddSource, /aria-label="Añadir rápido"/);
  assert.match(quickAddSource, /export function QuickAdd\(\{ open, setOpen, actions \}: QuickAddProps\)/);
});

test("The notifications popover meets the accessibility requirements (issue #91)", async () => {
  const headerSource = await readFile(new URL("../src/components/student-header-actions.tsx", import.meta.url), "utf8");

  assert.match(headerSource, /aria-expanded=\{open\}/);
  assert.match(headerSource, /aria-controls=\{panelId\}/);
  assert.match(headerSource, /event\.key !== "Escape"/);
  assert.match(headerSource, /triggerRef\.current\?\.focus\(\)/);
  assert.match(headerSource, /addEventListener\("pointerdown", onPointerDown\)/);
  assert.match(headerSource, /closeButtonRef\.current\?\.focus\(\)/);
});

test("insertDb enforces authorization and scopes every write to the current user (issue #92)", async () => {
  const dbSource = await readFile(new URL("../src/lib/db.ts", import.meta.url), "utf8");
  const fnSource = dbSource.slice(dbSource.indexOf("export async function insertDb"), dbSource.indexOf("export async function updateDb"));

  assert.match(fnSource, /const userId = await tryGetCurrentUserId\(\);/);
  assert.match(fnSource, /if \(!userId\) return null;/);
  assert.match(fnSource, /user_id: userId/);
  assert.match(fnSource, /RETURNING \*/);
});

test("Quick Add course and event creation normalize empty optional fields to null and roll back on failure (issue #92)", async () => {
  const storeSource = await readFile(new URL("../src/components/guest-store.tsx", import.meta.url), "utf8");

  const addCourseSource = storeSource.slice(storeSource.indexOf("addCourse: async"), storeSource.indexOf("updateCourse: async"));
  for (const field of [
    'platform: data\\.platform \\|\\| null',
    'url: data\\.url \\|\\| null',
    'start_date: data\\.start_at \\|\\| null',
    'deadline: data\\.deadline_at \\|\\| null',
    'notes: data\\.notes \\|\\| null',
  ]) {
    assert.match(addCourseSource, new RegExp(field), `addCourse missing null normalization for ${field}`);
  }
  assert.match(addCourseSource, /if \(!response\?\.result\) throw new Error/);
  assert.match(addCourseSource, /courses: current\.courses\.filter\(\(course\) => course\.id !== id\)/);
  assert.match(addCourseSource, /throw error;/);

  const addHackathonSource = storeSource.slice(storeSource.indexOf("addHackathon: async"), storeSource.indexOf("updateHackathon: async"));
  for (const field of [
    'organizer: data\\.organizer \\|\\| null',
    'city: data\\.city \\|\\| null',
    'event_start_date: data\\.start_at \\|\\| null',
    'event_end_date: data\\.end_at \\|\\| null',
    'registration_deadline: data\\.registration_deadline_at \\|\\| null',
    'url: data\\.url \\|\\| null',
    'notes: data\\.notes \\|\\| null',
  ]) {
    assert.match(addHackathonSource, new RegExp(field), `addHackathon missing null normalization for ${field}`);
  }
  assert.match(addHackathonSource, /if \(!response\?\.result\) throw new Error/);
  assert.match(addHackathonSource, /hackathons: current\.hackathons\.filter\(\(hackathon\) => hackathon\.id !== id\)/);

  const addTaskSource = storeSource.slice(storeSource.indexOf("addTask: async"), storeSource.indexOf("updateTask: async"));
  assert.match(addTaskSource, /if \(!response\?\.result\) throw new Error/);
  assert.match(addTaskSource, /tasks: current\.tasks\.filter\(\(task\) => task\.id !== id\)/);
});

test("Quick Add awaits persistence, blocks duplicate submits and keeps entered values open on failure (issue #92)", async () => {
  const quickAddSource = await readFile(new URL("../src/components/quick-add.tsx", import.meta.url), "utf8");

  // Idempotent retry: a second submit while one is already in flight is a no-op.
  assert.match(quickAddSource, /if \(submitting\) return;/);
  assert.match(quickAddSource, /setSubmitting\(true\)/);
  assert.match(quickAddSource, /disabled=\{submitting\}/);

  // The dialog only closes after every awaited action resolves, inside the try
  // block - a rejection skips the close and keeps the uncontrolled form (and
  // whatever the user typed) mounted for retry instead of resetting it.
  const submitFnSource = quickAddSource.slice(quickAddSource.indexOf("async function submit"), quickAddSource.indexOf("return (\n    <>"));
  assert.match(submitFnSource, /await actions\.addTask/);
  assert.match(submitFnSource, /await actions\.addCourse/);
  assert.match(submitFnSource, /await actions\.addHackathon/);
  const setOpenIdx = submitFnSource.indexOf("setOpen(false)");
  const catchIdx = submitFnSource.indexOf("} catch");
  assert.ok(setOpenIdx > -1 && catchIdx > setOpenIdx, "setOpen(false) must be the last step of the try block, before the catch");

  // No unconditional reset() on submit that would blow away the entered
  // values regardless of whether persistence actually succeeded.
  assert.doesNotMatch(quickAddSource, /currentTarget\.reset\(\)/);
});

test("Course completion routes each origin through its own persistence path with rollback (issue #94)", async () => {
  const storeSource = await readFile(new URL("../src/components/guest-store.tsx", import.meta.url), "utf8");
  const completeCourseStart = storeSource.indexOf("completeCourse: async");
  const completeCourseEnd = storeSource.indexOf("addHackathon: async", completeCourseStart);
  assert.ok(completeCourseStart > -1 && completeCourseEnd > completeCourseStart, "could not locate the completeCourse action body");
  const completeCourseSource = storeSource.slice(completeCourseStart, completeCourseEnd);

  // fp_content_items: routed through fp_user_content_state, not copied into
  // the courses table.
  const fpStart = completeCourseSource.indexOf('"fp_content_items"');
  const fpEnd = completeCourseSource.indexOf('"tech_opportunities"');
  const fpBranch = completeCourseSource.slice(fpStart, fpEnd);
  assert.match(fpBranch, /await markResourceStatusAction\(idSlug, "completed"\)/);
  assert.doesNotMatch(fpBranch, /insertDb\("courses"/);
  assert.match(fpBranch, /user_status: null, user_completed_at: null/, "fp branch must roll back the optimistic completion on failure");
  assert.match(fpBranch, /throw error;|throw new Error/);

  // tech_opportunities: checks for an existing row by id_slug before ever
  // inserting (the idempotent-retry / no-duplicate requirement), and forwards
  // id_slug on insert so the DB's unique (user_id, id_slug) index is actually
  // effective.
  const techBranch = completeCourseSource.slice(fpEnd);
  assert.match(techBranch, /store\.courses\.find\(\(c\) => c\.id_slug === idSlug\)/);
  assert.match(techBranch, /id_slug: idSlug \|\| null/);
  assert.match(techBranch, /courses: current\.courses\.filter\(\(c\) => c\.id !== id\)/, "tech branch must roll back the optimistic insert on failure");

  // Every branch normalizes optional dates before writing and re-throws on
  // failure so the caller (the card's onClick) sees the rejection. Four
  // distinct persistence paths re-throw: fp, tech-existing-row,
  // tech-new-row, and the plain already-user-owned row.
  for (const field of ['start_date: course\\.start_at \\|\\| null', 'deadline: course\\.deadline_at \\|\\| null']) {
    assert.match(completeCourseSource, new RegExp(field));
  }
  assert.equal((completeCourseSource.match(/throw error;/g) ?? []).length, 4, "all four persistence paths must re-throw on failure");

  // Plain, already user-owned courses roll back to the exact previous row,
  // not just an empty/unknown state.
  const plainBranch = completeCourseSource.slice(completeCourseSource.lastIndexOf("Plain, already user-owned"));
  assert.match(plainBranch, /patchById\(current\.courses, course\.id, previousCourse\)/);
});

test("fp course completion is per-user isolated and never mutates the shared courses table (issue #94)", async () => {
  const actionsSource = await readFile(new URL("../src/lib/fp/resource-notes-actions.ts", import.meta.url), "utf8");
  const fnSource = actionsSource.slice(actionsSource.indexOf("export async function markResourceStatusAction"));

  assert.match(fnSource, /const session = await getSession\(\);/);
  assert.match(fnSource, /if \(!session\) redirect\("\/login"\);/);
  assert.match(fnSource, /getAuthorizedResource\(session\.uid, idSlug\)/, "must resolve the item scoped to the current session's user/cycle");
  assert.match(fnSource, /upsertFpUserContentState\(session\.uid, item\.id/, "must write scoped to session.uid, not a caller-supplied id");
  assert.match(fnSource, /revalidatePath\("\/courses"\)/);

  const guestAppSource = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  assert.match(guestAppSource, /fpUserStatusToCourseStatus\(item\.user_status\)/, "the Courses view must read the per-user completion state, not just the catalogue's own display status");
});

test("Course cards clamp title, provider and description consistently and stay inside the grid (issue #94)", async () => {
  const guestAppSource = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  const cardStart = guestAppSource.indexOf('key={item.id} className="al-course-card"');
  const cardEnd = guestAppSource.indexOf("al-course-card-actions", cardStart);
  assert.ok(cardStart > -1 && cardEnd > cardStart, "could not locate the course card JSX");
  const cardSource = guestAppSource.slice(cardStart, cardEnd);

  assert.match(cardSource, /al-course-card-title line-clamp-2/);
  assert.match(cardSource, /al-course-card-org line-clamp-1/);
  assert.match(cardSource, /al-course-card-desc line-clamp-2/);
  // Clamping must not hide content with no fallback - each clamped element
  // keeps the full text reachable via a native accessible title attribute.
  assert.match(cardSource, /title=\{item\.title\}/);
  assert.match(cardSource, /title=\{item\.entidad \|\| item\.platform\}/);
  assert.match(cardSource, /title=\{item\.requisitos_resumen\}/);
  // Long, unbroken tag/location text wraps instead of overflowing the card.
  assert.match(cardSource, /className="max-w-full break-words"/);

  const styleSource = guestAppSource.slice(guestAppSource.indexOf(".al-course-card {"), guestAppSource.indexOf(".al-course-card-top"));
  assert.match(styleSource, /min-width:\s*0/, "the grid cell itself must be allowed to shrink below its content's intrinsic width");
});

test("Competency completion is authorized against the caller's session and cycle, never a client-supplied user (issue #96)", async () => {
  const actionsSource = await readFile(new URL("../src/lib/fp/competency-actions.ts", import.meta.url), "utf8");
  const fnSource = actionsSource.slice(actionsSource.indexOf("export async function markCompetencyCompletedAction"));

  assert.match(fnSource, /const session = await getSession\(\);/);
  assert.match(fnSource, /if \(!session\) redirect\("\/login"\);/);
  assert.match(fnSource, /getAuthorizedSkill\(session\.uid, skillId\)/, "must resolve the skill scoped to the current session's user/cycle");
  assert.match(fnSource, /markUserCompetencyCompleted\(session\.uid, skillId\)/, "must write scoped to session.uid, not a caller-supplied id");

  const guestAppSource = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  assert.match(guestAppSource, /return !!competency\.completed;/, "isCompetencyDone must read the explicit per-user competency record, not infer from resource status");
});

test("A competency with no linked learning item can still be marked complete (issue #96)", async () => {
  const guestAppSource = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  const componentStart = guestAppSource.indexOf("function CompetencyRequirement(");
  const componentEnd = guestAppSource.indexOf("\nfunction LinksView", componentStart);
  assert.ok(componentStart > -1 && componentEnd > componentStart, "could not locate the CompetencyRequirement component");
  const componentSource = guestAppSource.slice(componentStart, componentEnd);

  assert.match(componentSource, /actions\.markCompetencyCompleted\(competency\.id\)/, "marking done must write an explicit competency record, not loop over learningItems");
  assert.doesNotMatch(componentSource, /for \(const learningItem of competency\.learningItems\)/, "must not infer completion from marking every linked resource done");
  assert.doesNotMatch(componentSource, /competency\.learningItems\.length > 0 &&/, "the mark-done control must not be gated behind having at least one linked resource");
});

test("markCompetencyCompleted optimistically completes and rolls back on failure (issue #96)", async () => {
  const storeSource = await readFile(new URL("../src/components/guest-store.tsx", import.meta.url), "utf8");
  const start = storeSource.indexOf("markCompetencyCompleted: (skillId: string) =>");
  const end = storeSource.indexOf("reset: () =>", start);
  assert.ok(start > -1 && end > start, "could not locate the markCompetencyCompleted action body");
  const actionSource = storeSource.slice(start, end);

  assert.match(actionSource, /setStore\(\(current\) => \(\{ \.\.\.current, fpContent: patchCompetencies\(current\.fpContent, true\) \}\)\);/, "must optimistically mark the competency completed before the request resolves");
  assert.match(actionSource, /void markCompetencyCompletedAction\(skillId\)\.then\(\(result\) => \{/);
  assert.match(actionSource, /if \(!result\.error\) return;/);
  assert.match(actionSource, /patchCompetencies\(current\.fpContent, false\)/, "must roll back to not-completed on failure");
  assert.match(actionSource, /toast\.error\("No se pudo guardar"\);/);
});

test("the Eventos redirect resolver never depends on fp_user_competency_state - Events aptitude checklist and resource-watching progress are separate systems by design (issue #96, issue #112)", async () => {
  // issue #112 removed the internal /ruta "path" screen for Eventos
  // (ruta-path.ts / ruta-path-view.tsx, which this guard used to read) and
  // replaced it with a redirect resolved by event-cta.ts + ruta/[slug]/page.tsx.
  // The isolation invariant is the same as before: neither must ever read
  // Events aptitude completion state.
  const [eventCtaSource, rutaPageSource] = await Promise.all([
    readFile(new URL("../src/lib/fp/event-cta.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/(dashboard)/ruta/[slug]/page.tsx", import.meta.url), "utf8"),
  ]);

  for (const source of [eventCtaSource, rutaPageSource]) {
    assert.doesNotMatch(source, /competencyCompleted/, "must not read or expose Events aptitude completion");
    assert.doesNotMatch(source, /fp_user_competency_state/, "must not reference the Events aptitude table");
    assert.doesNotMatch(source, /getUserCompetencyStatesForSkills/, "must not call the Events aptitude repository function");
  }
});

test("The event aptitude modal renders through a body portal with full accessibility wiring (issue #96)", async () => {
  const guestAppSource = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  const modalStart = guestAppSource.indexOf("function HackathonRequirementsModal(");
  const modalEnd = guestAppSource.indexOf("\nfunction isCompetencyDone", modalStart);
  assert.ok(modalStart > -1 && modalEnd > modalStart, "could not locate the HackathonRequirementsModal component");
  const modalSource = guestAppSource.slice(modalStart, modalEnd);

  // Portal: renders outside the normal tree, directly under document.body.
  assert.match(modalSource, /return createPortal\(/);
  assert.match(modalSource, /,\s*document\.body\s*\);/, "createPortal must target document.body");

  // Full-viewport lock on both html and body, without layout shift.
  assert.match(modalSource, /document\.documentElement\.style\.overflow = "hidden"/);
  assert.match(modalSource, /document\.body\.style\.overflow = "hidden"/);
  assert.match(modalSource, /document\.body\.style\.paddingRight = `\$\{scrollbarWidth\}px`/);

  // Focus trap: cycles Tab/Shift+Tab inside the dialog, never escapes it.
  assert.match(modalSource, /function handleDialogKeyDown/);
  assert.match(modalSource, /event\.shiftKey && document\.activeElement === firstElement/);
  assert.match(modalSource, /!event\.shiftKey && document\.activeElement === lastElement/);

  // Escape closes, and focus returns to whatever triggered the modal.
  assert.match(modalSource, /if \(event\.key === "Escape"\) \{\s*onClose\(\);/);
  assert.match(modalSource, /previouslyFocused\?\.focus\(\)/);

  // Background is inert while the modal is open. Cleanup restores each
  // sibling's own prior value (not a hardcoded false), in case something
  // else already relied on it being inert for an unrelated reason.
  assert.match(modalSource, /el\.inert = true/);
  assert.match(modalSource, /previousInertStates = backgroundSiblings\.map\(\(el\) => el\.inert\)/);
  assert.match(modalSource, /el\.inert = previousInertStates\[index\]/);

  // aria-labelledby/aria-describedby point at real ids on the title/description.
  assert.match(modalSource, /aria-labelledby=\{titleId\}/);
  assert.match(modalSource, /aria-describedby=\{descriptionId\}/);
  assert.match(modalSource, /id=\{titleId\}/);
  assert.match(modalSource, /id=\{descriptionId\}/);
});

test("The event aptitude modal footer never links to the retired internal ruta screen (issue #112)", async () => {
  const guestAppSource = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  const modalStart = guestAppSource.indexOf("function HackathonRequirementsModal(");
  const modalEnd = guestAppSource.indexOf("\nfunction isCompetencyDone", modalStart);
  assert.ok(modalStart > -1 && modalEnd > modalStart, "could not locate the HackathonRequirementsModal component");
  const modalSource = guestAppSource.slice(modalStart, modalEnd);

  // issue #112: the event-level "Ver en tu ruta"/rutaHref footer CTA is
  // removed entirely - an event can require several aptitudes, so there is
  // no single correct destination for it. Nothing in the modal should
  // construct a /ruta/ URL any more.
  assert.doesNotMatch(modalSource, /rutaHref/, "the event-level ruta footer CTA must be gone");
  assert.doesNotMatch(modalSource, /Ver en tu ruta/, "the ambiguous event-level CTA label must be gone");
  assert.doesNotMatch(modalSource, /\/ruta\//, "the modal must never construct a /ruta/ URL");
  assert.doesNotMatch(modalSource, /Ruta todavía sin vídeo/, "the old dead-end disabled CTA must be gone");
});

test("A competency shows at most two external references (issue #96)", async () => {
  const guestAppSource = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  const componentStart = guestAppSource.indexOf("function CompetencyRequirement(");
  const componentEnd = guestAppSource.indexOf("\nfunction LinksView", componentStart);
  assert.ok(componentStart > -1 && componentEnd > componentStart, "could not locate the CompetencyRequirement component");
  const componentSource = guestAppSource.slice(componentStart, componentEnd);

  assert.match(componentSource, /\.filter\(\(li\) => !li\.video_url\)\.slice\(0, 2\)/);
});

// --- issue #95: event lifecycle (preparation, featured rotation, Realizado) ---

function mockCompetency(overrides = {}) {
  return { id: "skill-1", titulo: "Skill", obligatoria_para_item: true, learningItems: [], completed: false, ...overrides };
}

function mockHackathon(overrides = {}) {
  return {
    id: "fp-event-1",
    id_slug: "event-1",
    name: "Evento de prueba",
    status: "inscripcion_abierta",
    priority: "media",
    start_at: "2026-09-01",
    created_at: "2026-01-01T00:00:00.000Z",
    sourceTable: "fp_content_items",
    requiredCompetencies: [],
    ...overrides,
  };
}

test("isPreparationComplete: zero mandatory competencies is never preparation complete (issue #95)", () => {
  assert.equal(isPreparationComplete(mockHackathon({ requiredCompetencies: [] })), false);
  assert.equal(
    isPreparationComplete(mockHackathon({ requiredCompetencies: [mockCompetency({ obligatoria_para_item: false, completed: true })] })),
    false,
    "only recommended (non-mandatory) competencies, even if all completed, is not preparation complete",
  );
});

test("isPreparationComplete: only true once every mandatory competency is completed (issue #95)", () => {
  const partiallyDone = mockHackathon({
    requiredCompetencies: [mockCompetency({ id: "a", completed: true }), mockCompetency({ id: "b", completed: false })],
  });
  assert.equal(isPreparationComplete(partiallyDone), false);

  const allMandatoryDone = mockHackathon({
    requiredCompetencies: [
      mockCompetency({ id: "a", completed: true }),
      mockCompetency({ id: "b", completed: true }),
      // A recommended competency left incomplete must not block preparation.
      mockCompetency({ id: "c", obligatoria_para_item: false, completed: false }),
    ],
  });
  assert.equal(isPreparationComplete(allMandatoryDone), true);
});

test("selectFeaturedHackathon: excludes preparation-complete candidates from the pool only (issue #95)", () => {
  const ready = mockHackathon({ id: "a", start_at: "2026-09-01", requiredCompetencies: [mockCompetency({ completed: true })] });
  const notReady = mockHackathon({ id: "b", start_at: "2026-09-05", requiredCompetencies: [mockCompetency({ completed: false })] });
  const featured = selectFeaturedHackathon([ready, notReady]);
  assert.equal(featured?.id, "b", "the preparation-complete event must not be featured even though it starts sooner");

  // Preparation and attendance are different states: completing preparation
  // must not change status to "realizado" (that would archive the event).
  assert.equal(ready.status, "inscripcion_abierta");
});

test("selectFeaturedHackathon: prefers open registration, falls back to the full pool otherwise (issue #95)", () => {
  const pending = mockHackathon({ id: "a", status: "pendiente", start_at: "2026-09-01" });
  const open = mockHackathon({ id: "b", status: "inscripcion_abierta", start_at: "2026-09-10" });
  assert.equal(selectFeaturedHackathon([pending, open])?.id, "b", "must prefer the open-registration candidate even though it starts later");
  assert.equal(selectFeaturedHackathon([pending])?.id, "a", "with no open-registration candidate, falls back to the full eligible pool");
});

test("selectFeaturedHackathon: orders by nearest future date, with a deterministic identity tiebreak (issue #95)", () => {
  const later = mockHackathon({ id: "z-later", start_at: "2026-09-20" });
  const sooner = mockHackathon({ id: "a-sooner", start_at: "2026-09-05" });
  assert.equal(selectFeaturedHackathon([later, sooner])?.id, "a-sooner");
  assert.equal(selectFeaturedHackathon([sooner, later])?.id, "a-sooner", "order of the input array must not affect the result");

  const tieB = mockHackathon({ id: "b-tie", start_at: "2026-09-05" });
  const tieA = mockHackathon({ id: "a-tie", start_at: "2026-09-05" });
  assert.equal(selectFeaturedHackathon([tieB, tieA])?.id, "a-tie", "same-date candidates break the tie by stable id, not array order");
  assert.equal(selectFeaturedHackathon([tieA, tieB])?.id, "a-tie");
});

test("selectFeaturedHackathon orders by the nearest actionable registration/start/end date (issue #95)", () => {
  const earlierRegistration = mockHackathon({
    id: "registration-first",
    registration_deadline_at: "2026-09-03",
    start_at: "2026-09-20",
  });
  const earlierStart = mockHackathon({
    id: "start-first",
    registration_deadline_at: "2026-09-10",
    start_at: "2026-09-05",
  });

  assert.equal(selectFeaturedHackathon([earlierStart, earlierRegistration])?.id, "registration-first");
});

test("selectFeaturedHackathon: returns null instead of fabricating a candidate when none remain (issue #95)", () => {
  assert.equal(selectFeaturedHackathon([]), null);
  const onlyReady = mockHackathon({ requiredCompetencies: [mockCompetency({ completed: true })] });
  assert.equal(selectFeaturedHackathon([onlyReady]), null);
});

test("fpUserStatusToHackathonStatus maps explicit per-user completion, defers to catalogue status otherwise (issue #95)", () => {
  assert.equal(fpUserStatusToHackathonStatus("completed"), "realizado");
  assert.equal(fpUserStatusToHackathonStatus("dismissed"), "descartado");
  assert.equal(fpUserStatusToHackathonStatus("started"), undefined);
  assert.equal(fpUserStatusToHackathonStatus(null), undefined);
  assert.equal(fpUserStatusToHackathonStatus(undefined), undefined);
});

test("completeHackathon persists Realizado per origin, with rollback, and never copies a catalogue row into hackathons (issue #95)", async () => {
  const storeSource = await readFile(new URL("../src/components/guest-store.tsx", import.meta.url), "utf8");
  const start = storeSource.indexOf("completeHackathon: async");
  const end = storeSource.indexOf("addLink: async", start);
  assert.ok(start > -1 && end > start, "could not locate the completeHackathon action body");
  const actionSource = storeSource.slice(start, end);

  // fp_content_items: routed through the same per-user table as course/video
  // completion, never inserted or copied into the hackathons table.
  const fpBranchEnd = actionSource.indexOf("// Plain, already user-owned hackathon row");
  const fpBranch = actionSource.slice(0, fpBranchEnd);
  assert.match(fpBranch, /await markResourceStatusAction\(idSlug, "completed"\)/);
  assert.doesNotMatch(fpBranch, /insertDb\("hackathons"/, "must not copy the catalogue row into the user's hackathons table");
  assert.doesNotMatch(fpBranch, /addHackathon/, "must not go through the add-new-hackathon path either");
  assert.match(fpBranch, /const previousStatus = previousContent\?\.user_status/);
  assert.match(fpBranch, /const previousCompletedAt = previousContent\?\.user_completed_at/);
  assert.match(fpBranch, /user_status: previousStatus/);
  assert.match(fpBranch, /user_completed_at: previousCompletedAt/, "must roll back the optimistic completion to the exact prior state");
  assert.match(fpBranch, /throw error;/);

  // No tech_opportunities persistence branch exists - the UI does not offer
  // Realizado for that source, and this action must not invent one. (A
  // comment documenting why is fine; an actual sourceTable check is not.)
  assert.doesNotMatch(
    actionSource,
    /if \(item\.sourceTable === "tech_opportunities"\)/,
    "must not implement a tech_opportunities persistence branch",
  );

  // Plain, already user-owned hackathon row: awaited update scoped by id,
  // rolled back to the exact previous row on failure.
  const plainBranch = actionSource.slice(fpBranchEnd);
  assert.match(plainBranch, /store\.hackathons\.find\(\(hackathon\) => hackathon\.id === item\.id\)/);
  assert.match(plainBranch, /await updateDb\("hackathons", item\.id, \{ status: "realizado" \}/);
  assert.match(plainBranch, /if \(!response\?\.result\) throw new Error/);
  assert.match(plainBranch, /patchById\(current\.hackathons, item\.id, previousHackathon\)/, "must roll back to the exact previous row, not just clear it");
  assert.match(plainBranch, /throw error;/);
});

test("completeHackathon preserves favourites and is scoped to the caller's own session/row, not a client-supplied user (issue #95)", async () => {
  const storeSource = await readFile(new URL("../src/components/guest-store.tsx", import.meta.url), "utf8");
  const start = storeSource.indexOf("completeHackathon: async");
  const end = storeSource.indexOf("addLink: async", start);
  const actionSource = storeSource.slice(start, end);
  const fpBranchEnd = actionSource.indexOf("// Plain, already user-owned hackathon row");
  const fpBranch = actionSource.slice(0, fpBranchEnd);
  const plainBranch = actionSource.slice(fpBranchEnd);

  // fp_content_items: only status/completed_at are ever set - is_favorite,
  // notes and reminder_at are untouched, so upsertFpUserContentState's
  // partial-update semantics leave them exactly as they were.
  assert.match(fpBranch, /user_status: "completed", user_completed_at: completedAt/);
  assert.doesNotMatch(fpBranch, /is_favorite/, "must not touch is_favorite when marking an event realizado");
  // markResourceStatusAction itself resolves the user from the server
  // session (proven by the issue #94 test above) - completeHackathon never
  // passes or receives a userId itself.
  assert.doesNotMatch(fpBranch, /userId|user_id/i);

  // Plain hackathon row: the update is scoped to this exact row's id, going
  // through updateDb (which resolves the writer from the session and is
  // allowlist-gated - see the issue #92 test above), not a raw/global write.
  assert.match(plainBranch, /updateDb\("hackathons", item\.id, \{ status: "realizado" \}/);
});

test("Realizado is not offered for tech_opportunities and is guarded against double submission (issue #95)", async () => {
  const guestAppSource = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  assert.match(
    guestAppSource,
    /!isHackathonArchived\(item\) && item\.sourceTable !== "tech_opportunities" && \(/,
    "Realizado must be hidden for tech_opportunities-sourced items, which have no safe per-user completion table",
  );
  assert.match(guestAppSource, /if \(pendingCompleteId\) return;/, "must ignore a second click while one completion is already in flight");
  assert.match(guestAppSource, /disabled=\{pendingCompleteId === item\.id\}/);
});

test("The featured event hero and its empty state read the pure selection helper, not an inline sort (issue #95)", async () => {
  const guestAppSource = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  assert.match(guestAppSource, /return selectFeaturedHackathon\(activos\);/);
  assert.match(guestAppSource, /Sin próximo evento o reto pendiente/, "must show a useful empty state instead of just rendering nothing");
});

// --- issue #93: deduplicated Dashboard feed ---

const REFERENCE_TODAY = new Date("2026-09-01T00:00:00.000Z");

function mockTask(overrides = {}) {
  return { id: "task-1", title: "Tarea", status: "pendiente", due_at: "2026-09-05", created_at: "2026-08-01T00:00:00.000Z", ...overrides };
}

function mockCourse(overrides = {}) {
  return { id: "course-1", title: "Curso", status: "empezado", start_at: "2026-09-05", created_at: "2026-08-01T00:00:00.000Z", ...overrides };
}

function mockHackathonItem(overrides = {}) {
  return { id: "hackathon-1", name: "Evento", status: "inscripcion_abierta", start_at: "2026-09-05", created_at: "2026-08-01T00:00:00.000Z", ...overrides };
}

function mockFpItem(overrides = {}) {
  return {
    id: "fp-item-1",
    id_slug: "fp-item-1",
    type: "evento",
    title: "Evento del catálogo",
    is_favorite: true,
    user_status: null,
    start_date: "2026-09-05",
    created_at: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

const emptyFeedParams = { tasks: [], courses: [], hackathons: [], fpContent: [], todoTaskIds: new Set(), today: REFERENCE_TODAY };

test("selectDashboardTodoTasks returns the most recently created tasks, most recent first (issue #93)", () => {
  const older = mockTask({ id: "a", created_at: "2026-07-01T00:00:00.000Z" });
  const newer = mockTask({ id: "b", created_at: "2026-08-15T00:00:00.000Z" });
  const result = selectDashboardTodoTasks([older, newer], 1);
  assert.deepEqual(result.map((task) => task.id), ["b"]);
});

test("buildUpcomingFeed excludes tasks already shown in To-do, includes the rest (issue #93)", () => {
  const shown = mockTask({ id: "shown", due_at: "2026-09-05" });
  const notShown = mockTask({ id: "not-shown", due_at: "2026-09-06" });
  const result = buildUpcomingFeed({ ...emptyFeedParams, tasks: [shown, notShown], todoTaskIds: new Set(["shown"]) });
  assert.deepEqual(result.map((item) => item.id), ["task-not-shown"]);
});

test("buildUpcomingFeed only includes dated items within the next 14 days (issue #93)", () => {
  const undated = mockTask({ id: "undated", due_at: undefined });
  const tooFar = mockTask({ id: "too-far", due_at: "2026-10-01" });
  const inRange = mockTask({ id: "in-range", due_at: "2026-09-10" });
  const inPast = mockTask({ id: "in-past", due_at: "2026-08-01" });
  const result = buildUpcomingFeed({ ...emptyFeedParams, tasks: [undated, tooFar, inRange, inPast] });
  assert.deepEqual(result.map((item) => item.id), ["task-in-range"]);
});

test("buildUpcomingFeed chooses the next valid date when an earlier deadline has already passed (issue #93)", () => {
  const course = mockCourse({ deadline_at: "2026-08-20", start_at: "2026-09-06" });
  const hackathon = mockHackathonItem({ registration_deadline_at: "2026-08-25", start_at: "2026-09-07" });
  const fpEvent = mockFpItem({ start_date: "2026-08-20", end_date: "2026-09-08" });
  const result = buildUpcomingFeed({ ...emptyFeedParams, courses: [course], hackathons: [hackathon], fpContent: [fpEvent] });

  assert.deepEqual(result.map((item) => item.date), ["2026-09-06", "2026-09-07", "2026-09-08"]);
});

test("buildUpcomingFeed preserves distinct tasks that share title and date (issue #93)", () => {
  const first = mockTask({ id: "first", title: "Llamar", due_at: "2026-09-05" });
  const second = mockTask({ id: "second", title: "Llamar", due_at: "2026-09-05" });
  const result = buildUpcomingFeed({ ...emptyFeedParams, tasks: [first, second] });

  assert.deepEqual(result.map((item) => item.id), ["task-first", "task-second"]);
});

test("buildUpcomingFeed excludes completed/dismissed/archived items across every source (issue #93)", () => {
  const doneTask = mockTask({ id: "done", status: "completada" });
  const cancelledTask = mockTask({ id: "cancelled", status: "cancelada" });
  const finishedCourse = mockCourse({ id: "finished", status: "terminado" });
  const archivedHackathon = mockHackathonItem({ id: "archived", status: "descartado" });
  const completedFp = mockFpItem({ id_slug: "completed-fp", user_status: "completed" });
  const result = buildUpcomingFeed({
    ...emptyFeedParams,
    tasks: [doneTask, cancelledTask],
    courses: [finishedCourse],
    hackathons: [archivedHackathon],
    fpContent: [completedFp],
  });
  assert.deepEqual(result, []);
});

test("buildUpcomingFeed includes active user courses/events with an actionable date, and saved FP events, only (issue #93)", () => {
  const course = mockCourse();
  const hackathon = mockHackathonItem();
  const savedFp = mockFpItem({ id_slug: "saved", is_favorite: true });
  const unsavedFp = mockFpItem({ id_slug: "unsaved", is_favorite: false });
  const nonEventFp = mockFpItem({ id_slug: "not-an-event", type: "curso_basico", is_favorite: true });
  const result = buildUpcomingFeed({
    ...emptyFeedParams,
    courses: [course],
    hackathons: [hackathon],
    fpContent: [savedFp, unsavedFp, nonEventFp],
  });
  const ids = result.map((item) => item.id).sort();
  assert.deepEqual(ids, ["course-course-1", "fp-saved", "hackathon-hackathon-1"]);
});

test("buildUpcomingFeed orders chronologically and deduplicates by identity, with a normalized-title fallback (issue #93)", () => {
  const later = mockTask({ id: "later", due_at: "2026-09-12" });
  const sooner = mockTask({ id: "sooner", due_at: "2026-09-03" });
  const ordered = buildUpcomingFeed({ ...emptyFeedParams, tasks: [later, sooner] });
  assert.deepEqual(ordered.map((item) => item.id), ["task-sooner", "task-later"]);

  // Same catalogue event, reached through two different collections with two
  // different generated ids: a real identity (id_slug) collapses them to one.
  const asHackathon = mockHackathonItem({ id: "dup-a", id_slug: "shared-slug", start_at: "2026-09-06" });
  const asFp = mockFpItem({ id_slug: "shared-slug", start_date: "2026-09-06" });
  const dedupedById = buildUpcomingFeed({ ...emptyFeedParams, hackathons: [asHackathon], fpContent: [asFp] });
  assert.equal(dedupedById.length, 1, "the same id_slug must collapse to a single feed item");

  // No shared id_slug at all: falls back to normalized title + date + destination.
  const courseA = mockCourse({ id: "c-a", id_slug: undefined, title: "Preparación Física", start_at: "2026-09-07" });
  const courseB = mockCourse({ id: "c-b", id_slug: undefined, title: "preparacion fisica", start_at: "2026-09-07" });
  const dedupedByFallback = buildUpcomingFeed({ ...emptyFeedParams, courses: [courseA, courseB] });
  assert.equal(dedupedByFallback.length, 1, "same normalized title + date + destination must also collapse to one item");
});

test("buildFeaturedHackathonCards shows saved catalogue events first, and never claims there are none when is_favorite is true (issue #93)", () => {
  const saved = mockFpItem({ id_slug: "saved-1" });
  const result = buildFeaturedHackathonCards({ hackathons: [], fpContent: [saved], today: REFERENCE_TODAY });
  assert.equal(result.length, 1, "a favourited FP event/challenge must always appear, even alone");
  assert.equal(result[0].id, "fp-saved-1");
});

test("buildFeaturedHackathonCards tops up with the user's own events only when fewer than three are saved (issue #93)", () => {
  const savedOne = mockFpItem({ id_slug: "saved-1" });
  const userHackathon = mockHackathonItem({ id: "own-1" });
  const withOneSaved = buildFeaturedHackathonCards({ hackathons: [userHackathon], fpContent: [savedOne], today: REFERENCE_TODAY });
  assert.deepEqual(withOneSaved.map((item) => item.id).sort(), ["fp-saved-1", "hackathon-own-1"]);

  const savedThree = ["a", "b", "c"].map((slug) => mockFpItem({ id_slug: slug, title: `Evento ${slug}` }));
  const withThreeSaved = buildFeaturedHackathonCards({ hackathons: [userHackathon], fpContent: savedThree, today: REFERENCE_TODAY });
  assert.equal(withThreeSaved.length, 3);
  assert.ok(!withThreeSaved.some((item) => item.id === "hackathon-own-1"), "must not top up once three saved items already fill the section");
});

test("buildFeaturedHackathonCards deduplicates a saved catalogue event against the user's own matching row (issue #93)", () => {
  const saved = mockFpItem({ id_slug: "shared-slug" });
  const ownSameEvent = mockHackathonItem({ id: "own-dup", id_slug: "shared-slug" });
  const result = buildFeaturedHackathonCards({ hackathons: [ownSameEvent], fpContent: [saved], today: REFERENCE_TODAY });
  assert.equal(result.length, 1, "the same event must not appear twice just because it also has a user-owned row");
});

test("buildFeaturedHackathonCards excludes expired and catalogue-inactive events (issue #93)", () => {
  const expiredSaved = mockFpItem({ id_slug: "expired-saved", start_date: "2026-08-01", end_date: "2026-08-02" });
  const closedSaved = mockFpItem({ id_slug: "closed-saved", status: "Finalizado", start_date: "2026-09-05" });
  const expiredOwned = mockHackathonItem({ id: "expired-owned", start_at: "2026-08-01", end_at: "2026-08-02" });
  const activeSaved = mockFpItem({ id_slug: "active-saved", start_date: "2026-09-05" });

  const result = buildFeaturedHackathonCards({
    hackathons: [expiredOwned],
    fpContent: [expiredSaved, closedSaved, activeSaved],
    today: REFERENCE_TODAY,
  });

  assert.deepEqual(result.map((item) => item.id), ["fp-active-saved"]);
});

test("DashboardTodo and DashboardFocusCarousel read the shared pure feed helpers, not a reimplemented inline version (issue #93)", async () => {
  const todoSource = await readFile(new URL("../src/components/dashboard/dashboard-todo.tsx", import.meta.url), "utf8");
  assert.match(todoSource, /selectDashboardTodoTasks\(store\.tasks\)/);

  const carouselSource = await readFile(new URL("../src/components/dashboard/dashboard-focus-carousel.tsx", import.meta.url), "utf8");
  assert.match(carouselSource, /buildUpcomingFeed\(\{/);
  assert.match(carouselSource, /buildFeaturedHackathonCards\(\{/);
  // No carousel redesign: the same four rotating sections and the same
  // auto-advance mechanism must still be present, unchanged.
  assert.match(carouselSource, /"upcoming".*"opportunities".*"work".*"hackathons"/s);
  assert.match(carouselSource, /window\.setInterval\(\(\) => move\(1\), 8000\)/);
});

// --- issue #103: Dashboard mobile overflow ---

test("DashboardView's layout grids define a shrinkable base track, not only the xl desktop layout (issue #103)", async () => {
  const source = await readFile(new URL("../src/components/dashboard/dashboard-view.tsx", import.meta.url), "utf8");

  // A Tailwind grid with only an `xl:grid-cols-…` variant has no explicit
  // grid-template-columns below 1280px, so it falls back to an implicit
  // auto track that does not shrink below its children's min-content width -
  // that intrinsic width becoming wider than the viewport is exactly what
  // produced the reported horizontal overflow. grid-cols-1 (Tailwind's own
  // `repeat(1, minmax(0, 1fr))`) is the base track that can actually shrink.
  const gridDivs = [...source.matchAll(/<div className="([^"]*\bgrid\b[^"]*)">/g)].map((m) => m[1]);
  const withXlCols = gridDivs.filter((className) => className.includes("xl:grid-cols-"));
  assert.equal(withXlCols.length, 2, "expected the To-do/route/calendar row and the opportunities/progress row");
  for (const className of withXlCols) {
    assert.match(className, /\bgrid-cols-1\b/, `grid must define a base grid-cols-1 (got: "${className}")`);
  }
});

test("DashboardFocusCarousel's card grid defines a shrinkable base track, not only the sm layout (issue #103)", async () => {
  const source = await readFile(new URL("../src/components/dashboard/dashboard-focus-carousel.tsx", import.meta.url), "utf8");
  const match = source.match(/<div className="([^"]*\bgrid\b[^"]*\bsm:grid-cols-3\b[^"]*)">/);
  assert.ok(match, "expected to find the card grid using sm:grid-cols-3");
  assert.match(match[1], /\bgrid-cols-1\b/, `card grid must define a base grid-cols-1 (got: "${match[1]}")`);
});

test("the Dashboard overflow fix does not fall back to hiding overflow globally (issue #103)", async () => {
  const [globalsCss, layoutSource] = await Promise.all([
    readFile(new URL("../src/app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../src/app/(dashboard)/layout.tsx", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(globalsCss, /overflow-x:\s*hidden/i, "must not hide horizontal overflow globally in place of a real layout fix");
  assert.doesNotMatch(layoutSource, /overflow-x-hidden/, "must not hide horizontal overflow globally in place of a real layout fix");
});

test("desktop's xl three-column composition is untouched (issue #103)", async () => {
  const source = await readFile(new URL("../src/components/dashboard/dashboard-view.tsx", import.meta.url), "utf8");
  assert.match(
    source,
    /grid grid-cols-1 items-start gap-4 xl:grid-cols-\[minmax\(300px,1\.08fr\)_minmax\(350px,1\.14fr\)_minmax\(260px,\.78fr\)\]/,
    "the xl: three-column track definition must be byte-for-byte unchanged, only the mobile base was added",
  );
});

// --- issue #112: retire the internal /ruta screen for Eventos, link exact YouTube videos ---

function mockLearningItem(overrides = {}) {
  return {
    id: "li-1",
    id_slug: "li-1-slug",
    title: "Recurso",
    type: "curso_basico",
    source_url: "https://example.com/recurso",
    video_url: null,
    tipo_relacion: "ensena",
    ...overrides,
  };
}

test("selectAptitudeVideo returns null when no learning item has a video (issue #112)", () => {
  assert.equal(selectAptitudeVideo([]), null);
  assert.equal(selectAptitudeVideo([mockLearningItem({ id_slug: "a" }), mockLearningItem({ id_slug: "b" })]), null);
});

test("selectAptitudeVideo returns the only candidate when exactly one has a video (issue #112)", () => {
  const withVideo = mockLearningItem({ id_slug: "b", video_url: "https://youtube.com/watch?v=b" });
  const result = selectAptitudeVideo([mockLearningItem({ id_slug: "a" }), withVideo]);
  assert.equal(result?.id_slug, "b");
  assert.equal(result?.video_url, "https://youtube.com/watch?v=b");
});

test("selectAptitudeVideo is deterministic regardless of input order - no more arbitrary 'first' pick (issue #112)", () => {
  const itemA = mockLearningItem({ id_slug: "zzz", video_url: "https://youtube.com/watch?v=z" });
  const itemB = mockLearningItem({ id_slug: "aaa", video_url: "https://youtube.com/watch?v=a" });
  const forward = selectAptitudeVideo([itemA, itemB]);
  const reversed = selectAptitudeVideo([itemB, itemA]);
  assert.equal(forward?.id_slug, reversed?.id_slug, "the same candidates must resolve to the same video regardless of array order");
  assert.equal(forward?.id_slug, "aaa", "ties are broken by id_slug, never by array position");
});

test("resolveLegacyRutaTarget prefers the exact video, then the event's official page, then a safe fallback (issue #112)", () => {
  assert.equal(
    resolveLegacyRutaTarget({ itemSourceUrl: "https://evento.example/", exactVideoUrl: "https://youtube.com/watch?v=x" }),
    "https://youtube.com/watch?v=x",
  );
  assert.equal(resolveLegacyRutaTarget({ itemSourceUrl: "https://evento.example/", exactVideoUrl: null }), "https://evento.example/");
  assert.equal(resolveLegacyRutaTarget({ itemSourceUrl: null, exactVideoUrl: null }), "/hackathons");
});

test("ruta/[slug] redirects Eventos legacy links instead of rendering an internal path screen, and leaves the plain-resource branch untouched (issue #112)", async () => {
  const source = await readFile(new URL("../src/app/(dashboard)/ruta/[slug]/page.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /buildRutaPathSteps|LearningPathView/, "the retired Eventos path screen must be gone");
  assert.match(source, /if \(FP_APTITUDE_GATED_TYPES\.has\(item\.type\)\) \{/);
  assert.match(source, /selectAptitudeVideo\(/, "must use the shared, deterministic video selector");
  assert.match(
    source,
    /redirect\(resolveLegacyRutaTarget\(\{ itemSourceUrl: item\.source_url, exactVideoUrl \}\)\);/,
    "the Eventos branch must always redirect, never render",
  );

  // The plain fp_content_item branch (e.g. a course with its own video) is
  // unrelated to Eventos and must be untouched - it still renders, never redirects.
  assert.match(source, /if \(!item\.video_url\) notFound\(\);/);
  assert.match(source, /<LearningResourceView/);
});

test("/roadmap/[modulo] never depended on, and still does not depend on, the retired ruta-path/ruta-path-view modules (issue #112)", async () => {
  const [pageSource, viewSource] = await Promise.all([
    readFile(new URL("../src/app/(dashboard)/roadmap/[modulo]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/learning/competency-courses-view.tsx", import.meta.url), "utf8"),
  ]);
  for (const source of [pageSource, viewSource]) {
    assert.doesNotMatch(source, /ruta-path/, "must not depend on the removed Eventos ruta-path module");
    assert.doesNotMatch(source, /buildRutaPathSteps/, "must not depend on the removed Eventos step builder");
  }
});

test("the featured hackathon hero and hackathon list cards always open the official event page externally, never the retired /ruta screen (issue #112)", async () => {
  const source = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /\/ruta\//, "no CTA anywhere in this file may construct a /ruta/ URL any more");
  assert.match(source, /<a href=\{featuredHackathon\.url\} target="_blank" rel="noreferrer" className="al-hack-hero-btn-primary">/);
  assert.match(source, /<a href=\{item\.url\} target="_blank" rel="noreferrer" className="al-hack-btn al-hack-btn-primary">/);
  assert.match(source, /Entrar al hackat[oó]n/);
  // The old video-gated internal/external dichotomy is gone.
  assert.doesNotMatch(source, /featuredHasRuta/);
  assert.doesNotMatch(source, /hackathonHasRutaVideo/);
});

test("each aptitude's YouTube CTA opens its exact video_url directly, with a non-interactive fallback when none is curated (issue #112)", async () => {
  const guestAppSource = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  const componentStart = guestAppSource.indexOf("function CompetencyRequirement(");
  const componentEnd = guestAppSource.indexOf("\nfunction LinksView", componentStart);
  assert.ok(componentStart > -1 && componentEnd > componentStart, "could not locate the CompetencyRequirement component");
  const componentSource = guestAppSource.slice(componentStart, componentEnd);

  assert.match(componentSource, /const videoItem = selectAptitudeVideo\(competency\.learningItems\);/, "must use the shared, deterministic video selector");
  assert.match(componentSource, /<a href=\{videoItem\.video_url\} target="_blank" rel="noreferrer" className="al-modal-req-btn al-modal-req-btn-video">/);
  assert.match(componentSource, /Ver curso en YouTube/);
  assert.doesNotMatch(componentSource, /\/ruta\//, "must never link back to the retired internal ruta screen");
  // No video and no other resources: informative, non-interactive text -
  // never a fake/misleading CTA and never an arbitrary generic resource.
  assert.match(componentSource, /!videoItem && docItems\.length === 0 && <EmptyText>/);
});
