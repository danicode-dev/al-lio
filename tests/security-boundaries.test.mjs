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
