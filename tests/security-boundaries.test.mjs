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
import { isSafeHttpUrl, selectAptitudeVideos } from "../src/lib/fp/event-cta.ts";
import {
  buildFeaturedHackathonCards,
  buildUpcomingFeed,
  selectDashboardTodoTasks,
} from "../src/lib/dashboard/upcoming-feed.ts";
import {
  ALLOWED_DATASET_STATUSES,
  idSlugFor,
  isBlockedWebHost,
  isHttpUrl,
  isValidReviewedAt,
  parseDatasetSource,
  stableUuid,
  SUPPORTED_SCHEMA_VERSIONS,
  validateDataset,
} from "../scripts/lib/company-catalogue.mjs";
import { toIsoTimestamp } from "../src/lib/bloc/timestamps.ts";
import { compareByRecentFirst, sortByRecentFirst } from "../src/lib/bloc/notes-sort.ts";
import { buildNoteExportHtml } from "../src/lib/bloc/note-export.ts";
import {
  canToggleHackathonFavorite as canToggleHackathonFavoriteShared,
  fpItemToHackathon,
  getHackathonPresentation,
  hackathonPublicDescription,
  isFpHackathonLike,
  isTechHackathonOrEvent,
  resolveHackathonById,
  techOpportunityToHackathon,
} from "../src/lib/hackathons/hackathon-presentation.ts";
import {
  fpItemToCourse,
  getCoursePresentation,
  isFpCourseLike,
  isTechCourse,
  resolveCourseById,
  techOpportunityToCourse,
} from "../src/lib/courses/course-presentation.ts";
import { buildJobSearchUrl } from "../src/lib/deeplinks/job-search-urls.ts";
import { SPANISH_PROVINCES } from "../src/lib/deeplinks/spanish-provinces.ts";

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
      sv: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
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
      sv: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
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

test("Quick Add, Calendar and Notifications form one shared header action group, mounted once for mobile and once per page's own header on desktop (issue #91, issue #129)", async () => {
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

  // issue #129: the layout's own standalone desktop actions row (the source of
  // the excessive top gap) is gone - only the mobile sticky-header mount remains
  // there. The desktop mount now lives inside each page's own PageHeader, next
  // to its title, instead of floating in a disconnected row above the content.
  const layoutMounts = (layoutSource.match(/<StudentHeaderActions \/>/g) ?? []).length;
  assert.equal(layoutMounts, 1, "expected exactly the mobile sticky-header mount in the layout, no separate desktop row");

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

test("Each page's own header mounts StudentHeaderActions exactly once for its desktop actions slot - relocated, not lost or duplicated (issue #129)", async () => {
  const files = [
    "../src/components/dashboard/dashboard-greeting.tsx",
    "../src/components/learning/competencies-view.tsx",
    "../src/components/tasks/tasks-view.tsx",
    "../src/components/noticias/noticias-view.tsx",
    "../src/components/profile/profile-form.tsx",
  ];
  for (const file of files) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    const mounts = (source.match(/<StudentHeaderActions \/>/g) ?? []).length;
    assert.equal(mounts, 1, `${file} should mount StudentHeaderActions exactly once`);
  }
  // guest-app.tsx mounts it six times by design: once inside the shared
  // work/courses/hackathons/bloc header, once for the separately-composed
  // Calendario header, twice inside HackathonDetailView (issue #135) and
  // twice inside CourseDetailView (owner-reported follow-up) - each
  // detail view's own PageHeader and its not-found fallback state,
  // mutually exclusive at runtime but both present in the source as
  // static JSX.
  const guestApp = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  const guestAppMounts = (guestApp.match(/<StudentHeaderActions \/>/g) ?? []).length;
  assert.equal(guestAppMounts, 6, "guest-app.tsx should mount StudentHeaderActions exactly six times: shared header + Calendario + two detail views' two branches each");
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

  assert.match(fnSource, /const session = await getValidatedSession\(\);/);
  assert.match(fnSource, /if \(!session\) redirect\("\/login"\);/);
  assert.match(fnSource, /getAuthorizedResource\(session\.uid, idSlug\)/, "must resolve the item scoped to the current session's user/cycle");
  assert.match(fnSource, /upsertFpUserContentState\(session\.uid, item\.id/, "must write scoped to session.uid, not a caller-supplied id");
  assert.match(fnSource, /revalidatePath\("\/courses"\)/);

  const coursePresentationSource = await readFile(new URL("../src/lib/courses/course-presentation.ts", import.meta.url), "utf8");
  assert.match(coursePresentationSource, /fpUserStatusToCourseStatus\(item\.user_status\)/, "fpItemToCourse must read the per-user completion state, not just the catalogue's own display status");
});

test("Course cards reuse the shared catalogue anatomy, keep full labels reachable, and stay inside a grid capped at 3 columns (issue #94, issue #130, issue #160, issue #164)", async () => {
  const [guestAppSource, cardSource, globalStyles] = await Promise.all([
    readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/catalog/catalog-card.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(cardSource, /al-catalog-card-title line-clamp-2/);
  assert.match(cardSource, /al-catalog-card-org line-clamp-1/);
  // Clamping must not hide content with no fallback - the clamped elements
  // keep the full text reachable via a native accessible title attribute,
  // sourced from the one shared presentation model (issue #130).
  assert.match(cardSource, /title=\{title\}/);
  assert.match(cardSource, /title=\{subtitle\}/);
  // issue #130: the header row wraps a min-w-0 title block and a shrink-0
  // badge cluster - the same shape Trabajo/Eventos y retos use.
  assert.match(cardSource, /al-catalog-card-title-wrap/);
  assert.match(cardSource, /al-catalog-card-badges/);
  // issue #160: the redesigned card carries only the three identifying
  // facts and a single Ver detalles action - no Abrir/Terminado, no
  // description, no location/priority chips competing for attention.
  assert.doesNotMatch(cardSource, /card-desc/, "the card must not render a description block anymore");
  assert.doesNotMatch(cardSource, />Terminado</, "Terminado moves to the detail view");
  const coursesSource = guestAppSource.slice(guestAppSource.indexOf("function Courses("), guestAppSource.indexOf("function coursePriorityClass"));
  assert.match(coursesSource, /<CatalogCard/);
  assert.match(coursesSource, /<CatalogFeaturedCard/);

  const styleSource = globalStyles.slice(globalStyles.indexOf(".al-catalog-card {"), globalStyles.indexOf(".al-catalog-card-actions {"));
  assert.match(styleSource, /min-width:\s*0/, "the grid cell itself must be allowed to shrink below its content's intrinsic width");
  assert.match(styleSource, /overflow-wrap:\s*anywhere/, "title/org must break long unbroken strings instead of overflowing the card");

  // issue #160: at most 3 cards per row so the screen never feels saturated.
  const gridStyle = globalStyles.slice(globalStyles.indexOf(".al-catalog-grid-cards {"), globalStyles.indexOf(".al-catalog-featured {"));
  assert.doesNotMatch(gridStyle, /auto-fill/, "the grid must not auto-fill an unbounded number of columns");
  assert.match(gridStyle, /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/, "the widest breakpoint caps the grid at 3 columns");
});

test("The course source URL is only linked from the detail view, and gated by isSafeHttpUrl (issue #130, issue #160)", async () => {
  const guestAppSource = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  // issue #160: the grid card no longer links out - Abrir moved to the detail panel.
  const cardStart = guestAppSource.indexOf('key={item.id} className="al-course-card"');
  const cardEnd = guestAppSource.indexOf("al-course-card-actions", cardStart);
  assert.doesNotMatch(guestAppSource.slice(cardStart, cardEnd), /href=\{presentation\.sourceUrl\}|sourceUrl/, "the card must not open the external URL directly");

  const viewFnStart = guestAppSource.indexOf("export function CourseDetailView");
  const viewFnEnd = guestAppSource.indexOf("function Hackathons(");
  const viewFnSource = guestAppSource.slice(viewFnStart, viewFnEnd);
  assert.match(viewFnSource, /isSafeHttpUrl\(presentation\.sourceUrl\)/, "Abrir curso must not link to an unvalidated URL (javascript:/data: guard)");
  assert.match(viewFnSource, /rel="noopener noreferrer"/);
});

test("Every course card offers Ver detalles, linking to the real internal /courses/[id] page - the old CourseDetailModal was retired outright, mirroring the hackathons detail route (owner-reported follow-up to #135/#120)", async () => {
  const [source, cardSource] = await Promise.all([
    readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/catalog/catalog-card.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(source, /detailHref=\{`\/courses\/\$\{encodeURIComponent\(item\.id\)\}`\}/, "the grid card must pass its real internal detail URL unconditionally");
  assert.match(source, /detailHref=\{`\/courses\/\$\{encodeURIComponent\(featuredCourse\.id\)\}`\}/, "the featured card must pass the same internal detail URL");
  assert.match(cardSource, /<Link href=\{href\} className=\{cn\("al-catalog-detail-link"/);
  assert.match(cardSource, /Ver detalles\s*<\/Link>/, "the shared action must keep one explicit Spanish expansion label");
  assert.doesNotMatch(source, /function CourseDetailModal/, "the modal must be removed entirely, not just left unreachable");
  assert.doesNotMatch(source, /setDetailItemId|detailItemId/, "no state should remain for opening a modal that no longer exists");

  assert.match(source, /export function CourseDetailView\(\{ id \}: \{ id: string \}\)/);
  const viewFnStart = source.indexOf("export function CourseDetailView");
  const viewFnEnd = source.indexOf("function Hackathons(");
  const viewFnSource = source.slice(viewFnStart, viewFnEnd);
  assert.match(viewFnSource, /const presentation = getCoursePresentation\(item\);/, "the detail view must reuse the shared presentation model, not re-derive its own field mapping");
});

test("Courses and Events share the same quiet catalogue detail action instead of duplicating the solid orange CTA (issue #164)", async () => {
  const [guestAppSource, cardSource, globalStyles] = await Promise.all([
    readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/catalog/catalog-card.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/globals.css", import.meta.url), "utf8"),
  ]);

  const coursesSource = guestAppSource.slice(guestAppSource.indexOf("function Courses("), guestAppSource.indexOf("function coursePriorityClass"));
  const eventsSource = guestAppSource.slice(guestAppSource.indexOf("function Hackathons("), guestAppSource.indexOf("function HackathonsEmptyState"));
  for (const moduleSource of [coursesSource, eventsSource]) {
    assert.match(moduleSource, /<CatalogFeaturedCard/);
    assert.match(moduleSource, /<CatalogCard/);
  }
  assert.match(cardSource, /className=\{cn\("al-catalog-detail-link"/);

  const quietButtonStyles = globalStyles.slice(globalStyles.indexOf(".al-catalog-detail-link {"), globalStyles.indexOf(".al-action-soft:hover"));
  assert.match(quietButtonStyles, /background:\s*var\(--al-action-soft-bg\)/);
  assert.match(quietButtonStyles, /border:\s*1px solid var\(--al-action-soft-border\)/);
  assert.match(quietButtonStyles, /color:\s*var\(--al-action-soft-text\)/);
  assert.doesNotMatch(quietButtonStyles, /linear-gradient|color:\s*white|border:\s*none/, "the internal detail action must remain visually quiet");
});

test("Routine actions share the quiet terracotta treatment while semantic states keep their own colors (issue #166)", async () => {
  const [globalStyles, button, guestApp, dailyAlerts, login, bloc, roadmap] = await Promise.all([
    readFile(new URL("../src/app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../src/components/ui/button.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/daily-alerts.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/auth/login-form.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/bloc/bloc-notepad.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/roadmap/roadmap-view.tsx", import.meta.url), "utf8"),
  ]);

  for (const token of [
    "--al-action-soft-bg: #fff8f4",
    "--al-action-soft-bg-hover: #fbe7dd",
    "--al-action-soft-border: rgba(225, 93, 45, 0.24)",
    "--al-action-soft-text: #b94720",
    "--al-action-soft-text-hover: #a63f1a",
  ]) {
    assert.ok(globalStyles.includes(token), `missing shared action token: ${token}`);
  }
  assert.match(globalStyles, /\.al-action-soft:hover:not\(:disabled\)/);
  assert.match(globalStyles, /\.al-action-soft:focus-visible/);
  assert.match(globalStyles, /\.al-action-soft:active:not\(:disabled\)/);
  assert.match(button, /variant === "default" && "al-action-soft"/);

  const catalogueAction = globalStyles.slice(globalStyles.indexOf(".al-catalog-action-solid {"), globalStyles.indexOf(".al-catalog-action-soft {"));
  assert.match(catalogueAction, /background:\s*var\(--al-action-soft-bg\)/);
  assert.doesNotMatch(catalogueAction, /linear-gradient|color:\s*white|border-color:\s*transparent/);

  const workStyles = guestApp.slice(guestApp.indexOf("const workBrandCss"), guestApp.indexOf("const WORK_DIACRITICS_PATTERN"));
  assert.doesNotMatch(workStyles, /linear-gradient|#FFCD00/i, "Work tabs, search and company actions must not restore the loud orange/yellow treatments");
  for (const selector of ["al-work-tab-active", "al-work-portal-search-btn", "al-work-company-btn-solid"]) {
    assert.match(workStyles, new RegExp(`\\.${selector}[^}]+var\\(--al-action-soft-`));
  }
  assert.match(guestApp, /"Welcome to the Jungle": "border border-\[#e9d6cb\] bg-\[#fff8f4\] text-\[#a63f1a\]"/);

  for (const source of [dailyAlerts, login, bloc, roadmap]) {
    assert.match(source, /al-action-soft|var\(--al-action-soft-/, "each major routine-action surface must consume the shared treatment");
  }
  assert.match(dailyAlerts, /bg-rose-500 text-white/, "urgent alerts must remain semantically red");
  assert.match(button, /bg-destructive text-destructive-foreground/, "destructive actions must remain visually distinct");
});

test("Course and event details use the same hero, information, three-column section, panel and next-item primitives (issue #164)", async () => {
  const source = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  const courseDetail = source.slice(source.indexOf("export function CourseDetailView"), source.indexOf("function Hackathons("));
  const eventDetail = source.slice(source.indexOf("export function HackathonDetailView"), source.indexOf("function LinksView"));

  for (const detailSource of [courseDetail, eventDetail]) {
    assert.match(detailSource, /lg:grid-cols-\[1fr_320px\]/);
    assert.match(detailSource, /className="al-catalog-hero-media"/);
    assert.match(detailSource, /<CatalogInfoGrid items=/);
    assert.match(detailSource, /className="al-catalog-detail-cols"/);
    assert.match(detailSource, /<CatalogPanel/);
    assert.match(detailSource, /<CatalogNextLink/);
  }
  assert.match(eventDetail, /<CatalogPanel title="Recursos para prepararte">/);
  assert.match(eventDetail, /<RequirementRow key=\{competency\.id\}/, "reviewed linked courses and videos must remain reachable from each event requirement");
});

test("Course descriptions never fall back to raw import/moderation notes for any origin - the same regression class fixed for Hackathons in issue #118 (issue #130)", async () => {
  const source = await readFile(new URL("../src/lib/courses/course-presentation.ts", import.meta.url), "utf8");
  assert.match(source, /description: nonEmpty\(course\.requisitos_resumen\)/);
  const presentationFnStart = source.indexOf("export function getCoursePresentation");
  const presentationFnEnd = source.indexOf("\n}", presentationFnStart);
  const presentationFnSource = source.slice(presentationFnStart, presentationFnEnd);
  assert.doesNotMatch(presentationFnSource, /\.notes|suggested_action/, "the public presentation model must never read Course.notes as a description source - fpItemToCourse elsewhere in this file legitimately builds the internal notes field, but getCoursePresentation must never touch it");

  const guestAppSource = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  const courseFnStart = guestAppSource.indexOf("function Courses(");
  const courseFnEnd = guestAppSource.indexOf("function coursePriorityClass");
  const courseFnSource = guestAppSource.slice(courseFnStart, courseFnEnd);
  assert.doesNotMatch(courseFnSource, /item\.notes|\.notes\b/, "the Courses view must never render Course.notes as student-facing copy");
});

test("Competency completion is authorized against the caller's session and cycle, never a client-supplied user (issue #96)", async () => {
  const actionsSource = await readFile(new URL("../src/lib/fp/competency-actions.ts", import.meta.url), "utf8");
  const fnSource = actionsSource.slice(actionsSource.indexOf("export async function markCompetencyCompletedAction"));

  assert.match(fnSource, /const session = await getValidatedSession\(\);/);
  assert.match(fnSource, /if \(!session\) redirect\("\/login"\);/);
  assert.match(fnSource, /getAuthorizedSkill\(session\.uid, skillId\)/, "must resolve the skill scoped to the current session's user/cycle");
  assert.match(fnSource, /markUserCompetencyCompleted\(session\.uid, skillId\)/, "must write scoped to session.uid, not a caller-supplied id");

  const guestAppSource = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  assert.match(guestAppSource, /return !!competency\.completed;/, "isCompetencyDone must read the explicit per-user competency record, not infer from resource status");
});

test("A competency with no linked learning item can still be marked complete (issue #96)", async () => {
  const guestAppSource = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  const componentStart = guestAppSource.indexOf("function RequirementRow(");
  const componentEnd = guestAppSource.indexOf("export function HackathonDetailView", componentStart);
  assert.ok(componentStart > -1 && componentEnd > componentStart, "could not locate the RequirementRow component");
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

// The requirements step-by-step modal (HackathonRequirementsModal) was
// retired by issue #135's owner-reported follow-up: requirements now render
// inline on the /hackathons/[id] detail page (RequirementRow) instead of
// behind a second modal-opening button, so there is exactly one entry point
// ("Ver detalles") instead of two competing ones. The modal's own
// portal/focus-trap/inert accessibility tests and its /ruta-link guard are
// removed along with it - see "the requirements section never constructs a
// /ruta/ URL" below for the equivalent guard against the inline replacement.

test("A competency shows at most two non-clickable legacy references (issue #96)", async () => {
  const guestAppSource = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  const componentStart = guestAppSource.indexOf("function RequirementRow(");
  const componentEnd = guestAppSource.indexOf("export function HackathonDetailView", componentStart);
  assert.ok(componentStart > -1 && componentEnd > componentStart, "could not locate the RequirementRow component");
  const componentSource = guestAppSource.slice(componentStart, componentEnd);

  assert.match(componentSource, /const referenceTitles = \[\.\.\.new Set\([\s\S]*\)\]\.slice\(0, 2\);/);
  assert.doesNotMatch(componentSource, /href=\{learningItem\.source_url\}|target="_blank"/);
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
  const detailStart = guestAppSource.indexOf("export function HackathonDetailView");
  const detailSource = guestAppSource.slice(detailStart, guestAppSource.indexOf("function LinksView", detailStart));
  assert.match(
    detailSource,
    /!archived && item\.sourceTable !== "tech_opportunities" && \(/,
    "Realizado must be hidden for tech_opportunities-sourced items, which have no safe per-user completion table",
  );
  assert.match(detailSource, /if \(pendingComplete\) return;/, "must ignore a second click while completion is already in flight");
  assert.match(detailSource, /disabled=\{pendingComplete\}/);
});

test("The featured event card reads the pure selection helper and follows the same filtered/list gating as Courses (issue #95, issue #164)", async () => {
  const guestAppSource = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  const start = guestAppSource.indexOf("function Hackathons(");
  const source = guestAppSource.slice(start, guestAppSource.indexOf("function HackathonsEmptyState", start));
  assert.match(source, /showFeatured \? selectFeaturedHackathon\(activos\) : null/);
  assert.match(source, /viewMode === "grid"/, "featured content must disappear in list mode, matching Courses");
  assert.match(source, /filtered\.filter\(\(item\) => item\.id !== featuredHackathon\.id\)/, "the featured item must not be repeated in the grid");
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

// --- issue #112 follow-up: keep learning videos inside AL-LIO ---

function mockLearningItem(overrides = {}) {
  return {
    id: "li-1",
    id_slug: "li-1-slug",
    title: "Recurso",
    type: "curso_basico",
    source_url: "https://example.com/recurso",
    video_url: null,
    internal_learning_slug: null,
    tipo_relacion: "ensena",
    ...overrides,
  };
}

// --- issue #97: AF/MP/TSAF company catalogues + parameterized importer ---

function makeRow(overrides = {}) {
  return {
    nombre: "Ejemplo Consultoría SL",
    web: "https://ejemplo-consultoria.es/",
    empleo: null,
    tipo_empleo: null,
    categoria: "Asesoría fiscal y contable",
    granada: "Sede en Granada",
    fuente: "https://ejemplo-consultoria.es/contacto",
    ...overrides,
  };
}

test("isSafeHttpUrl accepts only absolute http(s) URLs, rejecting javascript:/data:/relative/malformed values (issue #112)", () => {
  assert.equal(isSafeHttpUrl("https://youtube.com/watch?v=x"), true);
  assert.equal(isSafeHttpUrl("http://example.com"), true);
  for (const bad of [
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "/relative/path",
    "not a url",
    "ftp://example.com",
    "",
    null,
    undefined,
  ]) {
    assert.equal(isSafeHttpUrl(bad), false, `expected ${JSON.stringify(bad)} to be rejected`);
  }
});

test("selectAptitudeVideos returns every safely-linked video resource, never just one arbitrary pick (issue #112)", () => {
  assert.deepEqual(selectAptitudeVideos([]), []);
  assert.deepEqual(selectAptitudeVideos([mockLearningItem({ id_slug: "a" }), mockLearningItem({ id_slug: "b" })]), [], "no video_url anywhere - nothing to show");

  const videoA = mockLearningItem({ id: "a-id", id_slug: "a", title: "Curso A", video_url: "https://youtube.com/watch?v=a" });
  const videoB = mockLearningItem({ id: "b-id", id_slug: "b", title: "Curso B", video_url: "https://youtube.com/watch?v=b" });
  const noVideo = mockLearningItem({ id: "c-id", id_slug: "c" });
  const result = selectAptitudeVideos([noVideo, videoB, videoA]);
  assert.equal(result.length, 2, "both real video candidates must be returned - not one chosen over the other");
  assert.deepEqual(result.map((r) => r.id_slug), ["a", "b"], "stable id_slug order for reproducible rendering, not array-position order");
});

test("selectAptitudeVideos never treats an unsafe video_url as a real candidate (issue #112)", () => {
  const unsafe = mockLearningItem({ video_url: "javascript:alert(1)" });
  const mixed = mockLearningItem({ id: "safe-id", id_slug: "safe", video_url: "https://youtube.com/watch?v=safe" });
  assert.deepEqual(selectAptitudeVideos([unsafe]), []);
  assert.deepEqual(selectAptitudeVideos([unsafe, mixed]).map((r) => r.id_slug), ["safe"]);
});

test("getActiveVideoResourcesForCompetency queries only active, cycle-matching, ensena resources with a video - and never touches the Roadmap-shared query (issue #112)", async () => {
  const source = await readFile(new URL("../src/lib/db/repositories/fp_catalog.ts", import.meta.url), "utf8");
  const fnStart = source.indexOf("export async function getActiveVideoResourcesForCompetency");
  assert.ok(fnStart > -1, "could not locate getActiveVideoResourcesForCompetency");
  const fnSource = source.slice(fnStart, source.indexOf("\nexport async function getUserContentState", fnStart));

  assert.match(fnSource, /tipo_relacion = 'ensena'/);
  assert.match(fnSource, /fit\.cycle_code = \$2/);
  assert.match(fnSource, /item\.status = 'activo'/, "must require the resource to be active - a redirect must never target an inactive one");
  assert.match(fnSource, /item\.video_url IS NOT NULL/);

  // getLearningItemsForCompetencies (shared with data.ts/the aptitude modal
  // and, transitively, Roadmap's data loading) must be completely untouched.
  const sharedFnStart = source.indexOf("export async function getLearningItemsForCompetencies");
  const sharedFnSource = source.slice(sharedFnStart, source.indexOf("\nexport type ActiveCompetencyVideoCandidate", sharedFnStart));
  assert.ok(sharedFnSource.includes("ORDER BY link.skill_id`"), "boundary slice must end before the new dedicated function, not swallow it");
  assert.doesNotMatch(sharedFnSource, /status = 'activo'/, "the shared query's behavior must not change as a side effect of this issue");
});

test("ruta/[slug] is a pure redirect endpoint for every content type - it never renders a page any more (issue #112)", async () => {
  const source = await readFile(new URL("../src/app/(dashboard)/ruta/[slug]/page.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /buildRutaPathSteps|LearningPathView|LearningResourceView/, "no rendering path may survive - this route only redirects");
  assert.doesNotMatch(source, /return \(/, "must never return JSX");

  // Eventos branch: the requested competency must genuinely belong to the
  // event and an exact video may resolve only to AL-LIO's internal player.
  assert.match(source, /if \(FP_APTITUDE_GATED_TYPES\.has\(item\.type\)\) \{/);
  assert.match(
    source,
    /\(requiredByItem\.get\(item\.id\) \?\? \[\]\)\.find\(\(c\) => c\.id === paso\)/,
    "a paso for a competency outside this event must never resolve to a video",
  );
  assert.match(source, /getActiveVideoResourcesForCompetency\(/, "must use the dedicated active-resource query, not the Roadmap-shared one");
  assert.match(source, /getInternalLearningTargetsForVideoUrls\(exactVideoCandidates, profile\.cycle_code\)/);
  assert.match(source, /redirect\(`\/aprende\/\$\{encodeURIComponent\(internalSlugs\[0\]\)\}`\)/);
  assert.match(source, /redirect\("\/hackathons"\)/);

  // Non-Eventos content follows the same internal-only rule. A missing exact
  // match returns to Competencias instead of opening YouTube.
  assert.match(source, /getInternalLearningTargetsForVideoUrls\(\[item\.video_url\], profile\.cycle_code\)/);
  assert.match(source, /redirect\("\/roadmap"\)/);
  assert.doesNotMatch(source, /redirect\(item\.video_url\)|itemSourceUrl|resolveLegacyRutaTarget/);
});

test("legacy video URLs are matched only to active Spanish courses from the user's cycle", async () => {
  const source = await readFile(new URL("../src/lib/db/repositories/learning.ts", import.meta.url), "utf8");
  const start = source.indexOf("export async function getInternalLearningTargetsForVideoUrls");
  const end = source.indexOf("\nexport async function getLearningNotes", start);
  assert.ok(start > -1 && end > start, "could not locate the internal learning target query");
  const fnSource = source.slice(start, end);
  assert.match(fnSource, /competency\.cycle_code=\$1/);
  assert.match(fnSource, /competency\.is_active=true/);
  assert.match(fnSource, /resource\.is_active=true/);
  assert.match(fnSource, /resource\.language='es'/);
  assert.match(fnSource, /resource\.youtube_url=ANY\(\$2\)/);
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

test("event catalogue cards keep the official URL in the validated detail action and never restore the retired /ruta screen (issue #112, issue #164)", async () => {
  const source = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /\/ruta\//, "no CTA anywhere in this file may construct a /ruta/ URL any more");
  const hackathonsStart = source.indexOf("function Hackathons(");
  const listSource = source.slice(hackathonsStart, source.indexOf("function HackathonsEmptyState", hackathonsStart));
  assert.doesNotMatch(listSource, /href=\{item\.url\}|href=\{featuredHackathon\.url\}/, "catalogue cards must keep one internal action; the official URL belongs in detail");

  const detailStart = source.indexOf("export function HackathonDetailView");
  const detailSource = source.slice(detailStart, source.indexOf("function LinksView", detailStart));
  assert.match(
    detailSource,
    /\{isSafeHttpUrl\(item\.url\) && \(\s*<a href=\{item\.url\} target="_blank" rel="noopener noreferrer" className="al-catalog-action al-catalog-action-solid">/,
    "the official event URL must remain guarded by the shared HTTP(S) validator",
  );
  assert.match(detailSource, /Abrir convocatoria oficial/);
  // The old video-gated internal/external dichotomy, and the first
  // iteration's ad-hoc "Entrar al hackatón" label, are both gone.
  assert.doesNotMatch(source, /featuredHasRuta/);
  assert.doesNotMatch(source, /hackathonHasRutaVideo/);
  assert.doesNotMatch(source, /Entrar al hackat[oó]n/);
});

test("each aptitude links only to exact internal courses and keeps legacy references as short text", async () => {
  const guestAppSource = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  const componentStart = guestAppSource.indexOf("function RequirementRow(");
  const componentEnd = guestAppSource.indexOf("export function HackathonDetailView", componentStart);
  assert.ok(componentStart > -1 && componentEnd > componentStart, "could not locate the RequirementRow component");
  const componentSource = guestAppSource.slice(componentStart, componentEnd);

  assert.match(componentSource, /const internalCourses = selectAptitudeVideos\(competency\.learningItems\)/);
  assert.doesNotMatch(componentSource, /\.find\(\(li\) => li\.video_url\)/, "must never collapse several real videos into one arbitrary pick");
  assert.match(
    componentSource,
    /\{internalCourses\.map\(\(learningItem\) => \(\s*<Link key=\{learningItem\.id\} href=\{`\/aprende\/\$\{encodeURIComponent\(learningItem\.internal_learning_slug\)\}`\}/,
    "the aptitude CTA must stay inside AL-LIO's learning player",
  );
  assert.doesNotMatch(componentSource, /href=\{learningItem\.video_url\}|target="_blank"/);
  assert.match(componentSource, /Otros recursos: \{referenceTitles\.join\(" · "\)\}/);
  assert.match(componentSource, /Sin curso interno disponible todavía\./);
});

test("the learning player embeds YouTube without offering an external YouTube exit", async () => {
  const source = await readFile(new URL("../src/components/learning/learning-player.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /Abrir en YouTube|target="_blank"|href=\{resource\.youtube_url\}/);
  assert.match(source, /ref=\{playerContainerRef\}/, "the internal embedded player must remain available");
});

test("the notes/status Server Actions no longer revalidate the retired ruta screen, but keep every revalidation that still renders content (issue #112)", async () => {
  const source = await readFile(new URL("../src/lib/fp/resource-notes-actions.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /revalidatePath\(`\/ruta\/\$\{idSlug\}`\)/, "/ruta/[slug] never renders content any more, so revalidating it is meaningless");
  assert.match(source, /revalidatePath\("\/roadmap"\)/);
  assert.match(source, /revalidatePath\("\/dashboard"\)/);
  assert.match(source, /revalidatePath\("\/courses"\)/);
  assert.match(source, /revalidatePath\("\/hackathons"\)/);
});
// A valid, owner-approved review envelope for AF/MP/TSAF-style datasets.
// DEV never needs this (see the grandfather tests below), so every other
// cycleGroup-scoped test that expects a clean `errors: []` result must
// spread this in, exactly like `makeRow()` provides valid row defaults.
function validMetadata(overrides = {}) {
  return {
    schemaVersion: 1,
    status: "approved",
    reviewedAt: "2026-08-20",
    reviewedBy: "Test Reviewer",
    ...overrides,
  };
}
test("isHttpUrl accepts only http(s) and rejects malformed/other-protocol values (issue #97)", () => {
  assert.equal(isHttpUrl("https://example.com"), true);
  assert.equal(isHttpUrl("http://example.com"), true);
  assert.equal(isHttpUrl("javascript:alert(1)"), false);
  assert.equal(isHttpUrl("not a url"), false);
  assert.equal(isHttpUrl(""), false);
});

test("isBlockedWebHost rejects job boards, social media, aggregators and link shorteners (issue #97)", () => {
  for (const url of [
    "https://www.linkedin.com/company/example",
    "https://www.infojobs.net/empresa/example",
    "https://es.indeed.com/cmp/Example",
    "https://www.instagram.com/example/",
    "https://www.facebook.com/example",
    "https://bit.ly/3abcdef",
    "https://www.google.com/search?q=example",
  ]) {
    assert.equal(isBlockedWebHost(url), true, `expected ${url} to be blocked`);
  }
  assert.equal(isBlockedWebHost("https://ejemplo-consultoria.es/"), false);
});

test("idSlugFor keeps DEV's original unprefixed scheme, exactly matching the pre-#97 identities (issue #97)", () => {
  // DEV must never change: same slug function, same UUID namespace as the
  // original hardcoded importer used for the existing 69 companies and their
  // favourites - "Ansotec" is a real row from public/data/empresas_tech_granada.md.
  assert.equal(idSlugFor("DEV", "Ansotec"), "ansotec");
  assert.equal(stableUuid("companies-v1", "ansotec"), stableUuid("companies-v1", idSlugFor("DEV", "Ansotec")));
});

test("idSlugFor namespaces new groups so the same company name can never collide with DEV or another group (issue #97)", () => {
  assert.equal(idSlugFor("AF", "Ejemplo"), "af-ejemplo");
  assert.equal(idSlugFor("MP", "Ejemplo"), "mp-ejemplo");
  assert.equal(idSlugFor("TSAF", "Ejemplo"), "tsaf-ejemplo");
  assert.equal(idSlugFor("DEV", "Ejemplo"), "ejemplo");
  const slugs = new Set(["DEV", "AF", "MP", "TSAF"].map((group) => idSlugFor(group, "Ejemplo")));
  assert.equal(slugs.size, 4, "the same company name in four different groups must produce four distinct slugs/ids");
});

test("parseDatasetSource reads the legacy DEV markdown block and the new JSON envelope shape (issue #97)", () => {
  const md = "# Title\n\n```json\n[{\"nombre\":\"A\"}]\n```\n";
  assert.deepEqual(parseDatasetSource(md, "public/data/empresas_tech_granada.md"), { cycleGroupInFile: null, rows: [{ nombre: "A" }] });

  const bareArray = JSON.stringify([{ nombre: "A" }]);
  assert.deepEqual(parseDatasetSource(bareArray, "data/companies/x.json"), { cycleGroupInFile: null, rows: [{ nombre: "A" }] });

  assert.throws(() => parseDatasetSource("not json", "data/companies/x.json"));
  assert.throws(() => parseDatasetSource("# no code block here", "public/data/empresas_tech_granada.md"));
});

test("parseDatasetSource preserves schemaVersion, status, reviewedAt and reviewedBy from the JSON envelope (issue #97)", () => {
  const envelope = JSON.stringify({
    cycleGroup: "AF",
    schemaVersion: 1,
    status: "pending_owner_review",
    reviewedAt: "2026-08-20",
    reviewedBy: "Claude session - pending Daniel's approval",
    companies: [{ nombre: "A" }],
  });
  assert.deepEqual(parseDatasetSource(envelope, "data/companies/administracion-finanzas.json"), {
    cycleGroupInFile: "AF",
    schemaVersion: 1,
    status: "pending_owner_review",
    reviewedAt: "2026-08-20",
    reviewedBy: "Claude session - pending Daniel's approval",
    rows: [{ nombre: "A" }],
  });

  // A JSON envelope missing the review fields must surface them as null
  // (present-but-missing), not silently omit them - validateDataset relies
  // on this to tell "legacy source" (undefined) apart from "envelope
  // source with an incomplete review block" (null).
  const incomplete = JSON.stringify({ cycleGroup: "MP", companies: [{ nombre: "A" }] });
  const parsedIncomplete = parseDatasetSource(incomplete, "data/companies/marketing-publicidad.json");
  assert.equal(parsedIncomplete.schemaVersion, null);
  assert.equal(parsedIncomplete.status, null);
  assert.equal(parsedIncomplete.reviewedAt, null);
  assert.equal(parsedIncomplete.reviewedBy, null);
});

test("validateDataset accepts a well-formed AF/MP/TSAF dataset (issue #97)", () => {
  for (const cycleGroup of ["AF", "MP", "TSAF"]) {
    const secondRow = makeRow({ nombre: "Segunda Empresa", web: "https://segunda-empresa.es/", fuente: "https://segunda-empresa.es/contacto" });
    const { errors, records } = validateDataset({ cycleGroupInFile: cycleGroup, rows: [makeRow(), secondRow], cycleGroup, ...validMetadata() });
    assert.deepEqual(errors, [], `unexpected errors for ${cycleGroup}: ${errors.join("; ")}`);
    assert.equal(records.length, 2);
    assert.equal(records[0].cycle_group, cycleGroup);
    assert.equal(records[0].id_slug, idSlugFor(cycleGroup, "Ejemplo Consultoría SL"));
  }
});

test("validateDataset rejects an unknown cycle group (issue #97)", () => {
  const { errors, records } = validateDataset({ cycleGroupInFile: null, rows: [makeRow()], cycleGroup: "MARKETING" });
  assert.match(errors.join("\n"), /Unknown cycle group/);
  assert.deepEqual(records, []);
});

test("validateDataset rejects a mismatch between the dataset's declared cycleGroup and --cycle-group (issue #97)", () => {
  const { errors } = validateDataset({ cycleGroupInFile: "MP", rows: [makeRow()], cycleGroup: "AF" });
  assert.match(errors.join("\n"), /declares cycleGroup="MP".*--cycle-group="AF"/);
});

test("validateDataset requires nombre, web, categoria, granada and fuente (issue #97)", () => {
  for (const field of ["nombre", "web", "categoria", "granada", "fuente"]) {
    const { errors } = validateDataset({ cycleGroupInFile: null, rows: [makeRow({ [field]: null })], cycleGroup: "AF" });
    assert.ok(errors.some((e) => e.includes(`${field} is required`)), `expected a "${field} is required" error, got: ${errors.join("; ")}`);
  }
});

test("validateDataset rejects non-http(s) web and blocked hosts, including LinkedIn and InfoJobs (issue #97)", () => {
  const badProtocol = validateDataset({ cycleGroupInFile: null, rows: [makeRow({ web: "ftp://example.com" })], cycleGroup: "AF" });
  assert.match(badProtocol.errors.join("\n"), /web must be an http\(s\) URL/);

  const linkedin = validateDataset({ cycleGroupInFile: null, rows: [makeRow({ web: "https://www.linkedin.com/company/example" })], cycleGroup: "AF" });
  assert.match(linkedin.errors.join("\n"), /web points to a job board\/social\/aggregator\/shortener host/);

  const infojobs = validateDataset({ cycleGroupInFile: null, rows: [makeRow({ web: "https://www.infojobs.net/empresa/example" })], cycleGroup: "AF" });
  assert.match(infojobs.errors.join("\n"), /web points to a job board\/social\/aggregator\/shortener host/);
});

test("validateDataset allows empleo to be absent, and validates it the same way as web when present (issue #97)", () => {
  const withoutEmpleo = validateDataset({ cycleGroupInFile: null, rows: [makeRow({ empleo: null, tipo_empleo: null })], cycleGroup: "AF", ...validMetadata() });
  assert.deepEqual(withoutEmpleo.errors, []);
  assert.equal(withoutEmpleo.records[0].empleo_url, null);

  const officialEmpleo = validateDataset({
    cycleGroupInFile: null,
    rows: [makeRow({ empleo: "https://ejemplo-consultoria.es/empleo", tipo_empleo: "Portal oficial" })],
    cycleGroup: "AF",
    ...validMetadata(),
  });
  assert.deepEqual(officialEmpleo.errors, []);
  assert.equal(officialEmpleo.records[0].empleo_url, "https://ejemplo-consultoria.es/empleo");

  const linkedinEmpleo = validateDataset({
    cycleGroupInFile: null,
    rows: [makeRow({ empleo: "https://www.linkedin.com/jobs/search?keywords=example", tipo_empleo: "LinkedIn búsqueda" })],
    cycleGroup: "AF",
  });
  assert.match(linkedinEmpleo.errors.join("\n"), /empleo points to a job board\/social\/aggregator\/shortener host/);

  const orphanTipoEmpleo = validateDataset({ cycleGroupInFile: null, rows: [makeRow({ empleo: null, tipo_empleo: "Portal oficial" })], cycleGroup: "AF" });
  assert.match(orphanTipoEmpleo.errors.join("\n"), /tipo_empleo is set but empleo is empty/);
});

test("validateDataset grandfathers DEV's historical LinkedIn/InfoJobs empleo links instead of rejecting the 69 existing rows (issue #97)", () => {
  const row = makeRow({ empleo: "https://www.linkedin.com/jobs/search/?keywords=Example", tipo_empleo: "LinkedIn búsqueda" });
  const dev = validateDataset({ cycleGroupInFile: null, rows: [row], cycleGroup: "DEV" });
  assert.deepEqual(dev.errors, [], `DEV must not reject historical LinkedIn empleo links: ${dev.errors.join("; ")}`);
  assert.equal(dev.records[0].empleo_url, "https://www.linkedin.com/jobs/search/?keywords=Example", "DEV's empleo_url must pass through unchanged");

  // The same row would be rejected for any new group - the grandfather
  // clause is DEV-only, not a general loosening of the policy.
  const af = validateDataset({ cycleGroupInFile: null, rows: [row], cycleGroup: "AF" });
  assert.match(af.errors.join("\n"), /empleo points to a job board\/social\/aggregator\/shortener host/);
});

test("validateDataset flags duplicate names/slugs as errors and duplicate domains as a warning (issue #97)", () => {
  const dupName = validateDataset({
    cycleGroupInFile: null,
    rows: [makeRow(), makeRow({ web: "https://otra-web.es/" })],
    cycleGroup: "AF",
  });
  assert.match(dupName.errors.join("\n"), /duplicate company name/);

  const dupDomain = validateDataset({
    cycleGroupInFile: null,
    rows: [makeRow(), makeRow({ nombre: "Otra Empresa Real", web: "https://ejemplo-consultoria.es/otra-pagina" })],
    cycleGroup: "AF",
    ...validMetadata(),
  });
  assert.deepEqual(dupDomain.errors, [], "a shared domain alone must not block the import");
  assert.match(dupDomain.warnings.join("\n"), /already uses domain/);
});

test("validateDataset refuses a slug that already exists in the database under a different cycle_group (issue #97)", () => {
  const { errors } = validateDataset({
    cycleGroupInFile: null,
    rows: [makeRow({ nombre: "Ya Existe" })],
    cycleGroup: "MP",
    existingIdentities: new Map([[idSlugFor("MP", "Ya Existe"), "AF"]]),
  });
  assert.match(errors.join("\n"), /already exists in the database under cycle_group="AF".*refusing to move it to "MP"/);
});

test("validateDataset does not write any records when any row is invalid - one bad row invalidates the whole file for the caller (issue #97)", () => {
  const { errors, records } = validateDataset({
    cycleGroupInFile: null,
    rows: [makeRow(), makeRow({ nombre: "Segunda", web: "https://www.linkedin.com/company/segunda" })],
    cycleGroup: "AF",
  });
  assert.ok(errors.length > 0);
  // records is still returned for diagnostics, but the importer (see
  // scripts/import-companies.mjs) checks errors.length before ever opening a
  // transaction, so a non-empty errors array must be treated as "write
  // nothing" by every caller.
  assert.ok(records.length < 2, "the invalid row must not produce a writable record");
});

test("validateDataset rejects javascript: and other non-http(s) fuente, mirroring the web policy (issue #97)", () => {
  const jsScheme = validateDataset({ cycleGroupInFile: null, rows: [makeRow({ fuente: "javascript:alert(1)" })], cycleGroup: "AF", ...validMetadata() });
  assert.match(jsScheme.errors.join("\n"), /fuente must be an http\(s\) URL/);
  assert.equal(jsScheme.records.length, 0, "a javascript: fuente must never produce a writable record");

  const badProtocol = validateDataset({ cycleGroupInFile: null, rows: [makeRow({ fuente: "ftp://example.com" })], cycleGroup: "AF", ...validMetadata() });
  assert.match(badProtocol.errors.join("\n"), /fuente must be an http\(s\) URL/);
});

test("validateDataset rejects fuente pointing to LinkedIn/InfoJobs for every group except DEV (issue #97)", () => {
  const linkedin = validateDataset({
    cycleGroupInFile: null,
    rows: [makeRow({ fuente: "https://www.linkedin.com/company/example" })],
    cycleGroup: "AF",
    ...validMetadata(),
  });
  assert.match(linkedin.errors.join("\n"), /fuente points to a job board\/social\/aggregator\/shortener host/);
  assert.equal(linkedin.records.length, 0);

  const infojobs = validateDataset({
    cycleGroupInFile: null,
    rows: [makeRow({ fuente: "https://www.infojobs.net/empresa/example" })],
    cycleGroup: "MP",
    ...validMetadata(),
  });
  assert.match(infojobs.errors.join("\n"), /fuente points to a job board\/social\/aggregator\/shortener host/);

  // DEV grandfather: 2 of the real 69 rows cite a LinkedIn/InfoJobs page as
  // their historical research source (public/data/empresas_tech_granada.md -
  // "FIDESOL" and "Minsait / Indra Group"). DEV needs no review envelope.
  const devRow = makeRow({ fuente: "https://www.linkedin.com/company/fidesol-centro-tecnologico/" });
  const dev = validateDataset({ cycleGroupInFile: null, rows: [devRow], cycleGroup: "DEV" });
  assert.deepEqual(dev.errors, [], `DEV must not reject a historical LinkedIn fuente: ${dev.errors.join("; ")}`);
});

test("validateDataset requires schemaVersion, status, reviewedAt and reviewedBy for every group except DEV (issue #97)", () => {
  for (const cycleGroup of ["AF", "MP", "TSAF"]) {
    const { errors } = validateDataset({ cycleGroupInFile: null, rows: [makeRow()], cycleGroup });
    assert.match(errors.join("\n"), /schemaVersion must be one of/, `${cycleGroup}: expected a schemaVersion error`);
    assert.match(errors.join("\n"), /status must be one of/, `${cycleGroup}: expected a status error`);
    assert.match(errors.join("\n"), /reviewedAt must be a valid/, `${cycleGroup}: expected a reviewedAt error`);
    assert.match(errors.join("\n"), /reviewedBy is required/, `${cycleGroup}: expected a reviewedBy error`);
  }

  // DEV predates this envelope entirely and must never require it.
  const dev = validateDataset({ cycleGroupInFile: null, rows: [makeRow()], cycleGroup: "DEV" });
  assert.deepEqual(dev.errors, [], `DEV must not require a review envelope: ${dev.errors.join("; ")}`);
});

test("validateDataset rejects an unsupported schemaVersion (issue #97)", () => {
  for (const bad of [2, 0, "1", null, undefined]) {
    const { errors } = validateDataset({ cycleGroupInFile: null, rows: [makeRow()], cycleGroup: "AF", ...validMetadata({ schemaVersion: bad }) });
    assert.match(errors.join("\n"), new RegExp(`schemaVersion must be one of ${SUPPORTED_SCHEMA_VERSIONS.join(", ")}`), `expected schemaVersion=${JSON.stringify(bad)} to be rejected`);
  }
});

test("validateDataset rejects an unrecognized status value (issue #97)", () => {
  const { errors } = validateDataset({ cycleGroupInFile: null, rows: [makeRow()], cycleGroup: "AF", ...validMetadata({ status: "looks_good_to_me" }) });
  assert.match(errors.join("\n"), new RegExp(`status must be one of ${ALLOWED_DATASET_STATUSES.join(", ")}`));
});

test("validateDataset rejects a malformed or impossible reviewedAt (issue #97)", () => {
  for (const bad of ["not-a-date", "2026-13-40", "2026-02-30", "25-08-2026", "2026-08-25T00:00:00Z", null, "", 20260825]) {
    const { errors } = validateDataset({ cycleGroupInFile: null, rows: [makeRow()], cycleGroup: "AF", ...validMetadata({ reviewedAt: bad }) });
    assert.match(errors.join("\n"), /reviewedAt must be a valid/, `expected reviewedAt=${JSON.stringify(bad)} to be rejected`);
    assert.equal(isValidReviewedAt(bad), false);
  }
  assert.equal(isValidReviewedAt("2026-08-25"), true);
});

test("validateDataset rejects a missing or blank reviewedBy (issue #97)", () => {
  for (const bad of [null, undefined, "", "   "]) {
    const { errors } = validateDataset({ cycleGroupInFile: null, rows: [makeRow()], cycleGroup: "AF", ...validMetadata({ reviewedBy: bad }) });
    assert.match(errors.join("\n"), /reviewedBy is required/, `expected reviewedBy=${JSON.stringify(bad)} to be rejected`);
  }
});

test("a pending_owner_review dataset always fails validation, dry-run or not - it is never writable (issue #97)", () => {
  const pending = validMetadata({ status: "pending_owner_review" });
  const secondRow = makeRow({ nombre: "Segunda Empresa", web: "https://segunda-empresa.es/", fuente: "https://segunda-empresa.es/contacto" });
  const { errors, records } = validateDataset({ cycleGroupInFile: "AF", rows: [makeRow(), secondRow], cycleGroup: "AF", ...pending });

  assert.match(errors.join("\n"), /status is "pending_owner_review" - the dataset must be status="approved"/);
  // The importer (scripts/import-companies.mjs) checks errors.length before
  // ever reaching the --dry-run branch or opening a transaction - so this
  // non-empty errors array is what makes "pending" unwritable in practice,
  // identically under --dry-run and under a real (non-dry-run) invocation.
  assert.ok(errors.length > 0);
  // The rows themselves are otherwise perfectly well-formed, proving it is
  // specifically the approval gate blocking the write, not broken data -
  // this is exactly what lets --dry-run usefully validate a pending dataset.
  assert.equal(records.length, 2, "well-formed rows still produce diagnostic records while pending; the importer's errors.length check is what blocks the write, not empty records");
});

test("a fully approved, valid dataset validates cleanly and reproduces identical records across repeated runs - idempotent import (issue #97)", () => {
  const approved = validMetadata({ status: "approved" });
  const rows = [makeRow(), makeRow({ nombre: "Segunda Empresa", web: "https://segunda-empresa.es/", fuente: "https://segunda-empresa.es/contacto" })];

  const firstRun = validateDataset({ cycleGroupInFile: "AF", rows, cycleGroup: "AF", ...approved });
  assert.deepEqual(firstRun.errors, [], `unexpected errors on an approved dataset: ${firstRun.errors.join("; ")}`);
  assert.equal(firstRun.records.length, 2);

  // Re-running the importer against the exact same approved source (a
  // retry, or CI re-running the same command) must target the exact same
  // rows every time - same `id`/`id_slug`/`sort_order` - because that is
  // what makes `ON CONFLICT (id_slug) DO UPDATE` in
  // scripts/import-companies.mjs a genuine no-op on the second run instead
  // of a duplicate or a drift.
  const secondRun = validateDataset({ cycleGroupInFile: "AF", rows, cycleGroup: "AF", ...approved });
  assert.deepEqual(secondRun.records, firstRun.records, "validating the same approved source twice must produce byte-identical records");
  assert.equal(firstRun.records[0].id, stableUuid("companies-v1", idSlugFor("AF", "Ejemplo Consultoría SL")));
});

test("import-companies.mjs forwards the review envelope into validateDataset and still gates every write on validation errors (issue #97)", async () => {
  const source = await readFile(new URL("../scripts/import-companies.mjs", import.meta.url), "utf8");

  assert.match(
    source,
    /\{ cycleGroupInFile, rows, schemaVersion, status, reviewedAt, reviewedBy \} = parseDatasetSource/,
    "the CLI must destructure the full review envelope out of parseDatasetSource's return value",
  );
  assert.match(
    source,
    /schemaVersion,\s*status,\s*reviewedAt,\s*reviewedBy,\s*\}\);/,
    "the CLI must forward the review envelope into validateDataset",
  );

  // The "no rows written on any error" gate must still run before both the
  // --dry-run branch and the BEGIN transaction - this is the single choke
  // point that makes an unapproved/invalid dataset unwritable regardless of
  // how it was invoked.
  const errorGateIndex = source.indexOf("if (errors.length > 0)");
  const dryRunIndex = source.indexOf("if (dryRun)");
  const beginIndex = source.indexOf('client.query("BEGIN")');
  assert.ok(errorGateIndex > -1 && dryRunIndex > -1 && beginIndex > -1, "expected to find the error gate, the --dry-run branch and the BEGIN transaction");
  assert.ok(errorGateIndex < dryRunIndex, "the errors.length gate must run before the --dry-run branch");
  assert.ok(dryRunIndex < beginIndex, "the --dry-run branch must return before any transaction is opened");
});

// --- issue #82: rebrand --primary/--ring away from default shadcn blue ---

test("globals.css's --primary and --ring are the brand terracotta, not the default shadcn blue (issue #82)", async () => {
  const css = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");

  // The old shadcn default (214 84% 38%) must be gone everywhere in this file.
  assert.doesNotMatch(css, /214\s+84%\s+38%/);

  // #E15D2D converts to hsl(16, 75%, 53%) - both --primary and --ring must
  // use it, and --primary-foreground stays white (every existing hardcoded
  // terracotta+white button in the app already assumes white text).
  assert.match(css, /--primary:\s*16\s+75%\s+53%;/);
  assert.match(css, /--ring:\s*16\s+75%\s+53%;/);
  assert.match(css, /--primary-foreground:\s*0\s+0%\s+100%;/);

  // Only primary/ring/primary-foreground changed - every other token is
  // untouched (guards against scope creep into --accent/--destructive/etc.,
  // which the issue explicitly says to leave alone unless documented).
  for (const untouched of [
    "--background: 42 30% 97%",
    "--destructive: 0 72% 47%",
    "--accent: 154 26% 88%",
    "--muted: 210 18% 92%",
    "--border: 214 15% 84%",
  ]) {
    assert.match(css, new RegExp(untouched.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `expected ${untouched} to be unchanged`);
  }
});

test("the #80/#81/daily-alerts hardcoded terracotta overrides now read the fixed --primary token instead of a second, parallel hex value (issue #82)", async () => {
  const [bottomNav, morePage, dailyAlerts] = await Promise.all([
    readFile(new URL("../src/components/bottom-nav.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/(dashboard)/more/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/daily-alerts.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(bottomNav, /isActive \? "text-primary" : "text-muted-foreground"/);
  assert.doesNotMatch(bottomNav, /text-\[#E15D2D\]/i);

  assert.match(morePage, /text-primary/);
  assert.doesNotMatch(morePage, /text-\[#E15D2D\]/i);

  assert.doesNotMatch(dailyAlerts, /#E15D2D|#e15d2d|#c94f21/, "no hardcoded terracotta hex should remain once the token itself carries the brand color");
  assert.match(dailyAlerts, /text-primary"/);
  assert.match(dailyAlerts, /al-action-soft-selected/);
  assert.match(dailyAlerts, /al-action-soft/);
  assert.match(dailyAlerts, /accent-primary/);

  // Light terracotta-tint icon badges (bg-[#FBE7DD]) are a deliberate
  // separate constant, not a --primary alpha blend - left as-is on purpose,
  // not missed. See docs/architecture/decisions or the PR for the exact
  // rationale (Tailwind's bg-primary/N opacity modifier does not reproduce
  // #FBE7DD exactly).
  for (const source of [bottomNav, morePage, dailyAlerts]) {
    assert.match(source, /#FBE7DD|#fbe7dd/i, "the light-tint badge background is expected to remain hardcoded");
  }
});

test("the Mas page's intentional multi-color per-section grid is untouched by the primary token fix (issue #82)", async () => {
  const source = await readFile(new URL("../src/app/(dashboard)/more/page.tsx", import.meta.url), "utf8");
  for (const color of ["teal", "cyan", "indigo", "violet", "emerald", "orange", "fuchsia", "rose", "amber"]) {
    assert.match(source, new RegExp(`bg-${color}-50`), `expected the deliberate ${color} section card color to remain`);
  }
});

test("UI primitives keep the brand focus token while the default Button consumes the shared quiet action treatment (issues #82 and #166)", async () => {
  const [button, input, select, textarea, guestApp] = await Promise.all([
    readFile(new URL("../src/components/ui/button.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/ui/input.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/ui/select.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/ui/textarea.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(button, /variant === "default" && "al-action-soft"/);
  assert.match(input, /focus-visible:ring-ring/);
  assert.match(select, /focus-visible:ring-ring/);
  assert.match(textarea, /focus-visible:ring-ring/);
  assert.match(guestApp, /ring-primary\/40/);
  assert.match(guestApp, /al-action-soft-selected/);
});

test("toIsoTimestamp normalizes a PostgreSQL Date instance to a stable ISO string (issue #128)", () => {
  const date = new Date("2026-08-20T10:15:00.000Z");
  assert.equal(toIsoTimestamp(date), "2026-08-20T10:15:00.000Z");
});

test("toIsoTimestamp passes a valid ISO string through unchanged (issue #128)", () => {
  assert.equal(toIsoTimestamp("2026-08-20T10:15:00.000Z"), "2026-08-20T10:15:00.000Z");
});

test("toIsoTimestamp falls back instead of throwing on invalid legacy values or a NaN Date (issue #128)", () => {
  assert.equal(toIsoTimestamp("not-a-date", "fallback"), "fallback");
  assert.equal(toIsoTimestamp(new Date("invalid"), "fallback"), "fallback");
  assert.equal(toIsoTimestamp(undefined, "fallback"), "fallback");
  assert.equal(toIsoTimestamp(null, "fallback"), "fallback");
  assert.match(toIsoTimestamp("nonsense"), /^\d{4}-\d{2}-\d{2}T/, "default fallback is still a valid ISO string");
});

test("sortByRecentFirst orders PostgreSQL-normalized notes by most recently edited first (issue #128)", () => {
  const notes = [
    { id: "a", updated_at: "2026-08-01T00:00:00.000Z" },
    { id: "b", updated_at: "2026-08-20T00:00:00.000Z" },
    { id: "c", updated_at: "2026-08-10T00:00:00.000Z" },
  ];
  assert.deepEqual(sortByRecentFirst(notes).map((n) => n.id), ["b", "c", "a"]);
});

test("compareByRecentFirst never throws on an invalid/legacy timestamp and sorts it last instead (issue #128)", () => {
  const notes = [
    { id: "valid", updated_at: "2026-08-20T00:00:00.000Z" },
    { id: "corrupt", updated_at: "not-a-timestamp" },
  ];
  assert.doesNotThrow(() => notes.sort(compareByRecentFirst));
  assert.deepEqual(notes.map((n) => n.id), ["valid", "corrupt"]);
});

test("sortByRecentFirst returns an empty list untouched, and does not mutate its input (issue #128)", () => {
  const empty = [];
  assert.deepEqual(sortByRecentFirst(empty), []);
  assert.notEqual(sortByRecentFirst(empty), empty);

  const original = [{ id: "a", updated_at: "2026-08-01T00:00:00.000Z" }, { id: "b", updated_at: "2026-08-20T00:00:00.000Z" }];
  const originalOrder = original.map((n) => n.id);
  sortByRecentFirst(original);
  assert.deepEqual(original.map((n) => n.id), originalOrder, "sorting Recientes must not reorder the source array used by other tabs");
});

test("Recientes ordering is chronological regardless of favorite state - favoriting a note never affects its recent position (issue #128)", () => {
  const notes = [
    { id: "old-fav", updated_at: "2026-08-01T00:00:00.000Z", favorite: true },
    { id: "new-plain", updated_at: "2026-08-20T00:00:00.000Z", favorite: false },
  ];
  assert.deepEqual(sortByRecentFirst(notes).map((n) => n.id), ["new-plain", "old-fav"]);
});

test("buildNoteExportHtml escapes the title, embeds sanitized content HTML, and omits export metadata (issues #128 and #151)", () => {
  const html = buildNoteExportHtml(
    { title: '<b>Plan</b> & notas', contentHtml: "<h1>Objetivo</h1><p>Texto con &amp; y <strong>énfasis</strong>.</p>" },
  );
  assert.match(html, /&lt;b&gt;Plan&lt;\/b&gt; &amp; notas/, "title must be escaped, not injected as raw HTML");
  assert.match(html, /<h1>Objetivo<\/h1><p>Texto con &amp; y <strong>énfasis<\/strong>\.<\/p>/, "sanitized content HTML is embedded as-is, not double-escaped");
  assert.doesNotMatch(html, /Exportado el|al-bloc-export-meta/, "the PDF must contain only the note title and content");
});

test("buildNoteExportHtml shows an honest empty-state message instead of an empty PDF page for a blank note (issue #128)", () => {
  const html = buildNoteExportHtml({ title: "", contentHtml: "" });
  assert.match(html, /Documento sin titulo/);
  assert.match(html, /todavia no tiene contenido/);
});

test("Bloc's server boundary normalizes PostgreSQL timestamps before they reach the client, instead of passing raw Date values through (issue #128)", async () => {
  const source = await readFile(new URL("../src/lib/bloc/notes-actions.ts", import.meta.url), "utf8");
  assert.match(source, /toIsoTimestamp/, "notes-actions.ts should normalize created_at/updated_at/deleted_at at the server-to-client boundary");
  assert.doesNotMatch(source, /created_at: row\.created_at,\s*\n\s*updated_at: row\.updated_at,/, "the DTO must not pass raw pg row timestamps through unnormalized");
});

test("Bloc's PDF export replaces the retired hand-rolled byte-level serializer with a raster-preserving jsPDF/html2canvas path (issue #128)", async () => {
  const source = await readFile(new URL("../src/components/bloc/bloc-notepad.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /buildSimplePdf|toUtf16Hex|BaseFont \/Helvetica/, "the raw PDF byte serializer must be fully removed, not left dead in the file");
  assert.match(source, /import\("jspdf"\)/);
  assert.match(source, /import\("html2canvas"\)/);
  assert.match(source, /buildNoteExportHtml/);
  assert.match(source, /doc\.addImage/, "browser-rendered note pages must be embedded so Unicode glyphs are not lost to jsPDF's built-in fonts");
  assert.doesNotMatch(source, /doc\.html\(/, "the jsPDF HTML text renderer falls back to built-in fonts and corrupts unsupported Unicode glyphs");
});

test("Bloc's PDF export keeps the html2canvas source at the canvas origin instead of rasterizing blank off-screen pages (issue #128)", async () => {
  const source = await readFile(new URL("../src/components/bloc/bloc-notepad.tsx", import.meta.url), "utf8");
  const start = source.indexOf("async function exportActivePdf");
  const end = source.indexOf("function exportActiveWord");
  assert.ok(start !== -1 && end !== -1 && end > start);
  const fn = source.slice(start, end);
  assert.match(fn, /left:\s*0/, "the export surface must start at the html2canvas origin");
  assert.doesNotMatch(fn, /left:\s*-\d/, "a negative horizontal offset produces correctly-sized but blank PDF pages");
});

test("Bloc's PDF export scales and slices the browser canvas inside the printable A4 bounds (issue #128)", async () => {
  const source = await readFile(new URL("../src/components/bloc/bloc-notepad.tsx", import.meta.url), "utf8");
  const start = source.indexOf("async function exportActivePdf");
  const end = source.indexOf("function exportActiveWord");
  assert.ok(start !== -1 && end !== -1 && end > start);
  const fn = source.slice(start, end);
  assert.match(fn, /pixelsPerPoint\s*=\s*canvas\.width\s*\/\s*contentWidth/);
  assert.match(fn, /printableHeight\s*=\s*doc\.internal\.pageSize\.getHeight\(\)\s*-\s*margin\s*\*\s*2/);
  assert.match(fn, /findCanvasPageBreak/, "pagination should look for a nearby blank row instead of slicing ordinary text blindly");
  assert.match(fn, /doc\.addImage\([\s\S]*?margin,\s*\n\s*margin,\s*\n\s*contentWidth/, "every page image must retain the configured top, left and right margins");
});

test("Bloc's PDF export only reports success after generation actually completes, and surfaces a distinct honest failure message otherwise (issue #128)", async () => {
  const source = await readFile(new URL("../src/components/bloc/bloc-notepad.tsx", import.meta.url), "utf8");
  const start = source.indexOf("async function exportActivePdf");
  const end = source.indexOf("function exportActiveWord");
  assert.ok(start !== -1 && end !== -1 && end > start, "exportActivePdf should be an async function defined before exportActiveWord");
  const fn = source.slice(start, end);
  assert.match(fn, /await html2canvas\(/, "must await the browser render before declaring success");
  assert.match(fn, /showNotice\("PDF exportado"\)/);
  assert.match(fn, /catch/);
  assert.match(fn, /showNotice\([^)]*"error"\)/, "a failed export must show a distinctly-toned error notice, not silently claim success");
});

test("Exportar sits in the editor's top-right action group next to the overflow menu, and the old footer export selector is gone (issue #128)", async () => {
  const source = await readFile(new URL("../src/components/bloc/bloc-notepad.tsx", import.meta.url), "utf8");
  assert.match(source, /al-bloc-title-row[\s\S]*?<ExportMenu[\s\S]*?<NoteOverflowMenu/, "Exportar and the overflow menu should be siblings in the title row, in that order");
  assert.doesNotMatch(source, /al-bloc-export-select/, "the redundant desktop footer export <Select> must be removed");
  assert.match(source, /Palabras: \{wordCount\}[\s\S]{0,80}Caracteres: \{charCount\}/, "the footer should stay focused on autosave/document metrics");
});

test("the Bloc sidebar's trash link stays height-bounded and pinned from the tablet breakpoint up, not only at the wide desktop breakpoint (issue #128)", async () => {
  const source = await readFile(new URL("../src/components/bloc/bloc-notepad.tsx", import.meta.url), "utf8");
  assert.match(source, /md:grid-cols-\[minmax\(0,1fr\)_300px\]/, "the two-column split should start at the same breakpoint the component treats as desktop (md, not xl)");
  assert.match(source, /@media \(min-width: 768px\) \{\s*\n\s*\.al-bloc-desktop-grid \{ height: clamp/, "the sidebar height clamp - which makes the notes list scroll internally and keeps Ver papelera pinned - must apply starting at the tablet breakpoint");
  assert.match(source, /al-bloc-trash-link \{ flex-shrink: 0/);
});

test("Ver papelera stays reachable from Todas, Recientes and Favoritas alike - it is rendered once, outside the per-tab note list, not duplicated per tab (issue #128)", async () => {
  const source = await readFile(new URL("../src/components/bloc/bloc-notepad.tsx", import.meta.url), "utf8");
  const renderSites = source.match(/className="al-bloc-trash-link/g) ?? [];
  assert.equal(renderSites.length, 1, "the trash link must render exactly once (not duplicated per tab, not gated behind a tab check)");
  assert.doesNotMatch(source, /listTab === "favoritas"[\s\S]{0,400}al-bloc-trash-link/, "the trash link must not be nested inside favorites-only conditional rendering");
});

test("Bloc exposes one Word-like formatting surface per viewport and removes the redundant insert/link/image controls (issue #151)", async () => {
  const source = await readFile(new URL("../src/components/bloc/bloc-notepad.tsx", import.meta.url), "utf8");
  const toolbarStart = source.indexOf("function BlocEditorToolbar");
  const toolbarEnd = source.indexOf("function MobileNoteCard");
  const toolbar = source.slice(toolbarStart, toolbarEnd);

  assert.match(toolbar, /role="toolbar" aria-label="Formato del documento"/);
  assert.match(toolbar, /aria-label="Estilo de párrafo o título"/);
  assert.match(toolbar, /<optgroup label="Párrafo">[\s\S]*?<optgroup label="Títulos">/);
  assert.match(toolbar, /aria-label="Tipo de letra"/);
  assert.match(source, /Aptos[\s\S]*?Calibri[\s\S]*?Verdana[\s\S]*?Georgia[\s\S]*?Courier New/);
  assert.doesNotMatch(toolbar, /Insertar|Hipervínculo|Enlace|Imagen|onInsert|onLink|onImageClick/);
  assert.match(source, /mobileSheet === "format"/);
  assert.doesNotMatch(source, /mobileSheet === "(?:insert|export|more)"/);
  assert.match(source, /\.al-bloc-toolbar-row \{[^}]*flex-wrap: nowrap/);
  assert.doesNotMatch(source, /\.al-bloc-toolbar-mobile \.al-bloc-toolbar-row \{[^}]*overflow-x: auto/);
});

test("Bloc uses a numeric px font-size control and visibly pressed Word-style B/I/U buttons (issue #151)", async () => {
  const source = await readFile(new URL("../src/components/bloc/bloc-notepad.tsx", import.meta.url), "utf8");
  const toolbar = source.slice(source.indexOf("function BlocEditorToolbar"), source.indexOf("function MobileNoteCard"));

  assert.match(toolbar, /type="number"[\s\S]*?min="8"[\s\S]*?max="96"[\s\S]*?Tamaño de letra en píxeles/);
  assert.match(toolbar, /formatState\.bold[\s\S]*?>B</);
  assert.match(toolbar, /formatState\.italic[\s\S]*?>I</);
  assert.match(toolbar, /formatState\.underline[\s\S]*?>U</);
  assert.match(toolbar, /aria-pressed=\{active\}/);
  assert.match(source, /font\.style\.fontSize = `\$\{clampEditorFontSize\(fontSize\)\}px`[\s\S]*?font\.removeAttribute\("size"\)/, "browser font-size markers must become inline px styles without replacing the selected DOM node");
});

test("Bloc formatting state is deterministic while browser selection events settle (issue #151 final review)", async () => {
  const source = await readFile(new URL("../src/components/bloc/bloc-notepad.tsx", import.meta.url), "utf8");

  assert.match(source, /function editorFormatAfterCommand[\s\S]*?case "justifyLeft"[\s\S]*?alignment: "left"[\s\S]*?case "justifyCenter"[\s\S]*?alignment: "center"[\s\S]*?case "justifyRight"[\s\S]*?alignment: "right"[\s\S]*?case "justifyFull"[\s\S]*?alignment: "justify"/);
  assert.match(source, /editorFormatSyncBlockedUntilRef\.current = Date\.now\(\) \+ 150[\s\S]*?document\.execCommand\(command[\s\S]*?setEditorFormat\(\(current\) => editorFormatAfterCommand\(current, command\)\)/, "toolbar state must update from the requested command instead of a racing selectionchange event");
  assert.match(source, /const computedAlignment = window\.getComputedStyle\(blockElement \?\? anchor\)\.textAlign/, "selection refresh must read the active block's real alignment");
  assert.doesNotMatch(source, /font\.replaceWith\(/, "font-size normalization must not invalidate the live selection");
});

test("Bloc formatting works before the first character is typed and keeps that pending format until input (issue #151 follow-up)", async () => {
  const source = await readFile(new URL("../src/components/bloc/bloc-notepad.tsx", import.meta.url), "utf8");

  assert.match(source, /range\.selectNodeContents\(editor\)[\s\S]*?range\.collapse\(false\)[\s\S]*?selection\.addRange\(range\)/, "an empty editor must receive a real caret before a formatting command runs");
  assert.match(source, /function recordEditorContent\(preserveEmptyFormatting = false\)[\s\S]*?isEmpty && \(preserveEmptyFormatting \|\| emptyEditorFormatPendingRef\.current\)[\s\S]*?emptyEditorFormatPendingRef\.current = true[\s\S]*?return/, "temporary formatting nodes must survive toolbar focus changes until the user types");
  assert.match(source, /function runEditorCommand[\s\S]*?preserveEmptyFormatting[\s\S]*?document\.execCommand\(command[\s\S]*?recordEditorContent\(preserveEmptyFormatting\)/, "inline styles, alignment and lists must preserve empty-editor formatting");
  assert.match(source, /function setParagraphBlock[\s\S]*?recordEditorContent\(preserveEmptyFormatting\)/, "paragraph/title choice must also work before typing");
  assert.match(source, /function setEditorFontSize[\s\S]*?recordEditorContent\(preserveEmptyFormatting\)/, "font size must also work before typing");
});

test("Bloc combines bullets and numbering and keeps text/highlight colors in the main toolbar (issue #151)", async () => {
  const source = await readFile(new URL("../src/components/bloc/bloc-notepad.tsx", import.meta.url), "utf8");
  const toolbar = source.slice(source.indexOf("function BlocEditorToolbar"), source.indexOf("function MobileNoteCard"));

  assert.match(toolbar, /aria-label="Elegir entre viñetas o numeración"/);
  assert.match(toolbar, /value="unordered">• Viñetas/);
  assert.match(toolbar, /value="ordered">1\. Numeración/);
  assert.match(toolbar, /Color de texto[\s\S]*?Color de resaltado/);
  assert.doesNotMatch(toolbar, /showMore|onToggleMore|al-bloc-toolbar-more/);
});

test("Bloc keeps delete controls visible without hover and compacts the mobile notes/editor workflow (issue #151)", async () => {
  const source = await readFile(new URL("../src/components/bloc/bloc-notepad.tsx", import.meta.url), "utf8");
  const guestApp = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  const mobileStart = source.indexOf("if (isMobile)");
  const desktopStart = source.indexOf('<div className="relative">', mobileStart);
  const mobile = source.slice(mobileStart, desktopStart);

  assert.match(source, /\.al-bloc-note-row-delete \{[^}]*opacity: 1/);
  assert.doesNotMatch(source, /\.group:hover \.al-bloc-note-row-delete/);
  assert.match(mobile, /<MobileNoteCard/);
  assert.match(source, /className="al-bloc-mobile-card-delete[^\"]*"/);
  assert.match(mobile, /al-bloc-mobile-create[\s\S]*?<Plus/);
  assert.ok(mobile.indexOf("<BlocEditorToolbar") < mobile.indexOf("ref={attachEditor}"), "mobile formatting controls must be above the writing surface");
  assert.match(mobile, /al-bloc-mobile-actions[\s\S]*?Formato[\s\S]*?<ExportMenu[\s\S]*?<NoteOverflowMenu/);
  assert.match(source, /aria-label="Formato esencial del documento"[\s\S]*?<MobileFontSizeSelect[\s\S]*?<MobileAlignmentSelect[\s\S]*?<BlocListSelect compact/);
  assert.match(source, /function MobileEditorFormatPanel[\s\S]*?Párrafo o título[\s\S]*?Tamaño de letra[\s\S]*?Alineación[\s\S]*?Listas[\s\S]*?Resaltado/);
  assert.match(mobile, /min-h-\[clamp\(220px,38dvh,420px\)\]/);
  assert.match(mobile, /al-bloc-mobile-status/);
  assert.match(guestApp, /view === "bloc" \? "space-y-3 md:space-y-6"/);
  assert.match(guestApp, /className=\{view === "bloc" \? "al-bloc-page-header"/);
});

test("Bloc uses the app empty-state pattern and no longer advertises unsupported slash commands (issue #151 final pass)", async () => {
  const source = await readFile(new URL("../src/components/bloc/bloc-notepad.tsx", import.meta.url), "utf8");

  assert.match(source, /Esta nota está vacía[\s\S]*?Empieza a escribir para guardar tus ideas\./);
  assert.doesNotMatch(source, /presiona '\/' para comandos|al-bloc-content-watermark/);
  assert.match(source, /wordCount === 0 && !editorFocused && <BlocEditorEmptyState \/>/);
});

test("PageHeader renders exactly one h1 with eyebrow/title/subtitle/actions slots, and never hardcodes the display font (issue #129)", async () => {
  const source = await readFile(new URL("../src/components/page-header.tsx", import.meta.url), "utf8");
  const h1Matches = source.match(/<h1[ >]/g) ?? [];
  assert.equal(h1Matches.length, 1, "the shared header primitive must render exactly one h1");
  assert.match(source, /al-page-header-eyebrow/);
  assert.match(source, /al-page-header-subtitle/);
  assert.doesNotMatch(source, /font-barlow/, "product headings use Inter (the default body font), not the display font");
});

test("PageHeader anchors its actions slot to the top of the text block (items-start), not its bottom - items-end tied the actions' position to subtitle length/wrapping, which differs per page and made the same icon cluster land at a different height on every route (issue #129 follow-up)", async () => {
  const source = await readFile(new URL("../src/components/page-header.tsx", import.meta.url), "utf8");
  assert.match(source, /md:items-start/);
  assert.doesNotMatch(source, /md:items-end|md:items-center/, "the actions slot must anchor to the eyebrow line - the one element whose size never varies by page - not to a page-dependent midpoint or bottom");
  assert.match(source, /flex shrink-0 flex-wrap items-center gap-2/, "the actions cluster must never be compressed by a long title/subtitle next to it");
});

test("The shared page-header tokens in globals.css style the eyebrow/title/subtitle with Inter (the default body font), not --font-barlow (issue #129)", async () => {
  const source = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");
  assert.match(source, /\.al-page-header-title \{[^}]*color: #111111/, "the title must be black, matching the Tareas/Competencias reference");
  assert.match(source, /\.al-page-header-eyebrow \{[^}]*color: #e15d2d/, "the eyebrow must be the brand terracotta orange");
  assert.doesNotMatch(source, /\.al-page-header[^}]*font-barlow/);
});

test("The dashboard layout no longer renders a standalone desktop actions row above the content - actions live inside each page's own header - and the mobile sticky header is untouched (issue #129)", async () => {
  const source = await readFile(new URL("../src/app/(dashboard)/layout.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /pt-6 md:flex/, "the old standalone desktop actions row (the source of the excessive top gap) must be removed");
  assert.match(source, /StudentHeaderActions/, "StudentHeaderActions must still be imported for the mobile sticky bar");
  assert.match(source, /md:hidden/, "the mobile-only sticky header row must remain");
  assert.match(source, /pb-safe|pb-20|safe-area/, "mobile safe-area/bottom-nav spacing must remain intact");
});

test("Every first-level authenticated route renders the shared PageHeader instead of a bespoke ad-hoc heading (issue #129)", async () => {
  const routes = [
    { file: "../src/components/dashboard/dashboard-greeting.tsx", label: "Inicio" },
    { file: "../src/components/learning/competencies-view.tsx", label: "Competencias" },
    { file: "../src/components/tasks/tasks-view.tsx", label: "Tareas" },
    { file: "../src/components/guest-app.tsx", label: "Bloc de notas / Trabajo / Cursos / Eventos y retos (shared GuestApp header)" },
    { file: "../src/components/noticias/noticias-view.tsx", label: "Noticias" },
    { file: "../src/components/calendar/app-calendar.tsx", label: "Calendario" },
    { file: "../src/components/profile/profile-form.tsx", label: "Perfil" },
  ];
  for (const route of routes) {
    const source = await readFile(new URL(route.file, import.meta.url), "utf8");
    assert.match(source, /from "@\/components\/page-header"/, `${route.label} must import the shared PageHeader`);
    assert.match(source, /<PageHeader/, `${route.label} must render PageHeader`);
  }
});

test("GuestApp's shared header gives Trabajo, Cursos, Eventos y retos and Bloc de notas a real eyebrow and subtitle, not just a bare view-name h1 (issue #129)", async () => {
  const source = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  assert.match(source, /VIEW_HEADER_CONTENT/);
  for (const view of ["work", "courses", "hackathons", "bloc"]) {
    const re = new RegExp(`${view}: \\{ eyebrow: "[^"]+", title: "[^"]+", subtitle: "[^"]+" \\}`);
    assert.match(source, re, `VIEW_HEADER_CONTENT must define a non-empty eyebrow/title/subtitle for "${view}"`);
  }
  assert.match(source, /view !== "dashboard" && view !== "calendar" && headerContent/, "dashboard and calendar keep their own bespoke header, every other view gets the shared one");
});

test("Perfil's title switches from the Barlow display font to the shared Inter page header, and gains an eyebrow (issue #129)", async () => {
  const source = await readFile(new URL("../src/components/profile/profile-form.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /al-profile-title|font-barlow/, "the old Barlow-styled title must be gone");
  assert.match(source, /eyebrow="Tu cuenta"/);
});

test("Calendario, Noticias and Competencias each compose StudentHeaderActions into their own header instead of relying on a removed shared layout row (issue #129)", async () => {
  const [calendar, noticias, competencies] = await Promise.all([
    readFile(new URL("../src/components/calendar/app-calendar.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/noticias/noticias-view.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/learning/competencies-view.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(calendar, /headerActions/);
  assert.match(noticias, /StudentHeaderActions/);
  assert.match(competencies, /StudentHeaderActions/);
});

test("The hackathon_favorites migration is additive only - a new column and index, no destructive DDL, and only ever mentions fp_user_content_state in an explanatory comment, never in DDL (issue #131)", async () => {
  const source = await readFile(new URL("../infra/postgres/migrations/0007_hackathon_favorites.sql", import.meta.url), "utf8");
  assert.match(source, /alter table public\.hackathons\s*\n\s*add column if not exists is_favorite boolean not null default false/);
  assert.match(source, /create index if not exists hackathons_user_favorite_idx/);
  assert.doesNotMatch(source, /\bdrop\s+(table|schema)|truncate\s+table/i);
  const ddlLines = source.split(/\r?\n/).filter((line) => !line.trim().startsWith("--") && line.trim());
  assert.ok(!ddlLines.some((line) => line.includes("fp_user_content_state")), "fp_user_content_state must only appear in comments explaining it's untouched, never in an actual DDL statement");
});

test("toggleHackathonFavorite is an atomic, user-scoped UPDATE - never touches status/lifecycle columns, and returns null (not a thrown error) for a row the caller doesn't own (issue #131)", async () => {
  const source = await readFile(new URL("../src/lib/db/repositories/hackathons.ts", import.meta.url), "utf8");
  const fnSource = source.slice(source.indexOf("export async function toggleHackathonFavorite"));
  assert.match(fnSource, /UPDATE public\.hackathons SET is_favorite = NOT is_favorite WHERE id = \$1 AND user_id = \$2/, "must be a single atomic flip, not a read-then-write, and must filter by user_id");
  assert.doesNotMatch(fnSource, /\bstatus\b/, "toggling the heart must never touch the status/lifecycle column");
  assert.match(fnSource, /rows\[0\]\?\.is_favorite \?\? null/);
});

test("toggleHackathonFavoriteAction is session-gated and redirects unauthenticated callers, matching the toggleCompanyFavoriteAction pattern it mirrors (issue #131)", async () => {
  const source = await readFile(new URL("../src/lib/hackathons/actions.ts", import.meta.url), "utf8");
  assert.match(source, /"use server"/);
  assert.match(source, /const session = await getValidatedSession\(\);/);
  assert.match(source, /if \(!session\) redirect\("\/login"\);/);
  assert.match(source, /toggleHackathonFavorite\(session\.uid, hackathonId\)/, "must scope to session.uid, never a client-supplied user id");
});

test("The toggleHackathonFavorite store action applies an optimistic flip with rollback and an honest error toast on failure, mirroring toggleCompanyFavorite/toggleFpFavorite - not the unguarded fire-and-forget updateHackathon (issue #131)", async () => {
  const source = await readFile(new URL("../src/components/guest-store.tsx", import.meta.url), "utf8");
  const start = source.indexOf("toggleHackathonFavorite: (id: string)");
  const end = source.indexOf("updateHackathon: async (id: string, data: Partial<Hackathon>)");
  assert.ok(start !== -1 && end !== -1 && end > start, "toggleHackathonFavorite must be defined as its own dedicated action, before updateHackathon");
  const fn = source.slice(start, end);
  assert.match(fn, /setStore\(/, "must apply an optimistic update");
  assert.match(fn, /toggleHackathonFavoriteAction\(id\)\.then\(\(result\) => \{/);
  assert.match(fn, /if \(!result\.error\) return;/);
  assert.match(fn, /toast\.error\(/, "a failed save must surface an honest error toast");
  const rollbackAssignments = fn.match(/is_favorite: !nextValue/g) ?? [];
  assert.ok(rollbackAssignments.length >= 1, "the failure branch must flip is_favorite back, not leave the optimistic value stuck");
});

test("ReturnTypeActions declares toggleHackathonFavorite, so the store's action object type-checks against the shared interface (issue #131)", async () => {
  const source = await readFile(new URL("../src/components/store/types.ts", import.meta.url), "utf8");
  assert.match(source, /toggleHackathonFavorite: \(id: string\) => void;/);
});

test("The heart control appears in the card, the featured hero and the detail view, all driven by the same shared canToggleHackathonFavorite/toggleHackathonFavoriteFor helpers - so no surface can drift out of sync (issue #131, extended by #135)", async () => {
  const source = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");

  assert.match(source, /canToggleHackathonFavorite,[\s\S]*\} from "@\/lib\/hackathons\/hackathon-presentation";/, "guest-app.tsx must import the shared helper (issue #135), not keep a local copy");
  assert.match(source, /toggleHackathonFavoriteFor,[\s\S]*\} from "@\/lib\/hackathons\/hackathon-presentation";/);

  const heartSites = source.match(/onClick=\{\(\) => toggleHackathonFavoriteFor\(/g) ?? [];
  assert.equal(heartSites.length, 3, "the card, the hero and the detail view must all call the same dispatcher - expected exactly 3 call sites (the requirements modal was retired, folded into the detail view)");

  assert.doesNotMatch(source, /import \{[^}]*\bBookmark\b/, "the retired Bookmark icon import must be gone, not left unused");
  const heartIconUses = source.match(/<Heart className=/g) ?? [];
  assert.ok(heartIconUses.length >= 4, "Heart is used by Trabajo's CompanyCard plus the 3 hackathon surfaces");
});

test("Saving copy is consistent everywhere - Guardar / Quitar de guardados - and the old ambiguous \"Guardar para despues\" wording from the retired requirements modal is gone (issue #131)", async () => {
  const [source, cardSource] = await Promise.all([
    readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/catalog/catalog-card.tsx", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(source, /Guardar para despu[eé]s/, "the retired requirements modal's old inconsistent copy must not survive anywhere in the file");
  assert.match(cardSource, /active \? "Quitar de guardados" : "Guardar"/, "the shared card/featured heart keeps the canonical accessible labels");
  assert.match(source, /item\.is_favorite \? "Guardado en favoritos" : "Guardar en favoritos"/, "the detail action uses the same saved/unsaved meaning");
});

test("tech_opportunities-sourced events are excluded from saving with a documented reason, not silently broken or given a non-functional heart (issue #131, relocated to hackathon-presentation.ts by issue #135)", async () => {
  const source = await readFile(new URL("../src/lib/hackathons/hackathon-presentation.ts", import.meta.url), "utf8");
  const fnStart = source.indexOf("export function canToggleHackathonFavorite");
  const fnSource = source.slice(fnStart, source.indexOf("export function toggleHackathonFavoriteFor"));
  assert.match(fnSource, /sourceTable === "tech_opportunities"\) return false/);
  const precedingComment = source.slice(Math.max(0, fnStart - 700), fnStart);
  assert.match(precedingComment, /deliberately excluded/i, "the exclusion must be explained, not just present with no rationale");

  const guestAppSource = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(guestAppSource, /function canToggleHackathonFavorite/, "guest-app.tsx must not keep a second, potentially-drifting local copy");
});

test("Nueva tarea sits on the Tu lista heading row (top-right) with the status filter on its own row beneath, stays out of the global top header, and the summary tile labels are never truncated (issue #153, owner-reported follow-up)", async () => {
  const source = await readFile(new URL("../src/components/tasks/tasks-view.tsx", import.meta.url), "utf8");

  // The page-specific composer button must never live in the shared top header
  // alongside the global +/calendar/bell cluster.
  const headerStart = source.indexOf("<PageHeader");
  const headerEnd = source.indexOf("/>", source.indexOf('actions={', headerStart)) + 2;
  const headerJsx = source.slice(headerStart, headerEnd);
  assert.doesNotMatch(headerJsx, /Nueva tarea/, "the top PageHeader must not carry the page-specific composer button");
  assert.match(headerJsx, /<StudentHeaderActions \/>/, "the global icon cluster must remain there, same as every other page");

  // List card header: the composer button shares one row with the "Tu lista"
  // <h2> (top-right), and the Pendientes/Hechas/Todas filter is a separate row
  // below it - so the button stays visible next to the title instead of
  // wrapping under the filter on a narrow screen.
  const cardHeaderStart = source.indexOf(">Tu lista</h2>");
  const cardHeaderEnd = source.indexOf("{store.loadIssues", cardHeaderStart);
  const cardHeader = source.slice(cardHeaderStart, cardHeaderEnd);

  assert.match(cardHeader, /setComposerOpen\(\(open\) => !open\)/, "the exact same composer toggle handler must be reused, not reimplemented");
  assert.match(cardHeader, /FilterButton active=\{filter === "pending"\}/);
  assert.match(cardHeader, /FilterButton active=\{filter === "completed"\}/);
  assert.match(cardHeader, /FilterButton active=\{filter === "all"\}/);

  const buttonIdx = cardHeader.indexOf("Nueva tarea");
  const filterIdx = cardHeader.indexOf('FilterButton active={filter === "pending"}');
  assert.ok(buttonIdx > -1 && filterIdx > -1, "both the composer button and the filter live in the list card header");
  assert.ok(buttonIdx < filterIdx, "Nueva tarea is on the heading row, before the Pendientes/Hechas/Todas filter row");
  assert.match(
    cardHeader,
    /Tu lista<\/h2>[\s\S]*?<\/div>\s*<button type="button" onClick=\{\(\) => setComposerOpen/,
    "the composer button is a direct sibling of the heading block inside one row",
  );

  // Issue #153: the summary tiles (Pendientes/Completadas/Totales) show their
  // full label on mobile - no ellipsis.
  const summaryCard = source.slice(source.indexOf("function SummaryCard"), source.indexOf("function FilterButton"));
  assert.doesNotMatch(summaryCard, /truncate/, "summary tile labels must not be clipped with truncate");
});

test("Nuevo evento and the Google Calendar status move into the calendar's own month-navigation toolbar, next to Hoy - the top header keeps only the global icon cluster (owner-reported follow-up)", async () => {
  const source = await readFile(new URL("../src/components/calendar/app-calendar.tsx", import.meta.url), "utf8");

  const headerStart = source.indexOf("<PageHeader");
  const headerEnd = source.indexOf("/>", headerStart) + 2;
  const pageHeaderJsx = source.slice(headerStart, headerEnd);
  assert.doesNotMatch(pageHeaderJsx, /Nuevo evento/, "the top PageHeader must no longer carry the event-creation button");
  assert.doesNotMatch(pageHeaderJsx, /calendarStatus/, "the Google Calendar status must not render in the top header anymore");
  assert.match(pageHeaderJsx, /\{headerActions\}/, "the global icon cluster must remain there, same as every other page");

  assert.match(source, /statusSlot\?: React\.ReactNode;/, "CalendarHeader needs a dedicated slot for the connection status, distinct from the anchored-popover children prop used by the compact variant");
  const nonCompactButtonRow = source.slice(source.indexOf('<Button type="button" size="sm" variant="outline"'), source.indexOf("</div>\r\n    </div>\r\n  );\r\n}"));
  assert.match(nonCompactButtonRow, />Hoy<\/Button>/);
  assert.match(nonCompactButtonRow, /\{statusSlot\}/);
  assert.match(nonCompactButtonRow, /Nuevo evento/);

  const calendarViewCall = source.slice(source.indexOf("<CalendarHeader", source.indexOf("export function CalendarView")), source.indexOf("<CalendarHeader", source.indexOf("export function CalendarView")) + 300);
  assert.match(calendarViewCall, /onCreate=\{\(\) => setNewEventOpen\(true\)\}/, "must reuse the exact same handler the old header button called, not a new one");
  assert.match(calendarViewCall, /statusSlot=\{calendarStatus\}/);

  const guestApp = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  assert.match(guestApp, /headerActions=\{<StudentHeaderActions \/>\}/);
  assert.match(guestApp, /calendarStatus=\{<GoogleCalendarStatusControl \/>\}/);
});

test("GoogleCalendarStatusControl's connected/disconnected/loading states are visually distinct (green when connected, inviting when not) with unchanged underlying logic - same state variables, same effect, same disconnect handler (owner-reported follow-up)", async () => {
  const source = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  const fnStart = source.indexOf("function GoogleCalendarStatusControl");
  const fnEnd = source.indexOf("function TaskBoard");
  const fn = source.slice(fnStart, fnEnd);

  // Logic untouched: same state, same effect endpoint, same disconnect call.
  assert.match(fn, /const \[connected, setConnected\] = useState\(false\);/);
  assert.match(fn, /const \[loading, setLoading\] = useState\(true\);/);
  assert.match(fn, /const \[busy, setBusy\] = useState\(false\);/);
  assert.match(fn, /fetch\("\/api\/google\/calendar\/status", \{ cache: "no-store" \}\)/);
  assert.match(fn, /method: "DELETE"/);

  // Presentation: clearly distinct per state, not just a small dot.
  assert.match(fn, /bg-emerald-50 px-3 text-xs font-bold text-emerald-800/, "connected state must read as green/positive, not generic");
  assert.match(fn, /border-\[#f4b398\] bg-\[#fff7f3\] px-3 text-xs font-bold text-\[#c94f21\]/, "disconnected state must read as an inviting call-to-connect, not generic");
  assert.match(fn, /"Google Calendar conectado"/);
  assert.match(fn, /"Conectar Google Calendar"/);
  assert.doesNotMatch(fn, /hidden sm:inline/, "the status label must always be visible now that it lives in the calendar's own toolbar, not squeezed into a narrow global header");
});

test("Competencias' progress card sits inside PageHeader's own actions, glued to the +/calendar/bell icon cluster in the same top row - not stacked below it in its own row leaving an empty gap (owner-reported follow-up)", async () => {
  const source = await readFile(new URL("../src/components/learning/competencies-view.tsx", import.meta.url), "utf8");

  // The old two-row stack (a dedicated space-y wrapper around PageHeader
  // plus a sibling card row below it) is exactly what left the large,
  // "unprofessional" empty gap under the subtitle. That wrapper must be
  // gone - PageHeader now renders directly, and the card lives inside it.
  assert.doesNotMatch(source, /<div className="space-y-4 border-b/, "the old wrapper that stacked PageHeader and the progress card into two separate rows must be removed");

  const headerStart = source.indexOf("<PageHeader");
  const actionsIdx = source.indexOf("actions={", headerStart);
  const headerEnd = source.indexOf("\n      />", actionsIdx);
  assert.ok(headerStart > -1 && actionsIdx > headerStart && headerEnd > actionsIdx, "PageHeader must declare an actions prop");
  const actionsBlock = source.slice(actionsIdx, headerEnd);

  const cardIdx = actionsBlock.indexOf("bg-[#114b3b]");
  const iconsIdx = actionsBlock.indexOf("<StudentHeaderActions />");
  assert.ok(cardIdx > -1, "the progress card must render inside PageHeader's actions, next to the icon cluster");
  assert.ok(iconsIdx > -1 && iconsIdx > cardIdx, "the progress card must come before StudentHeaderActions in reading order - glued to its left, same top row");

  assert.match(actionsBlock, /Progreso guardado/);
  assert.match(actionsBlock, /\{progress\}%/);
  assert.match(actionsBlock, /shrink-0/, "the card must not be allowed to stretch/shrink oddly when squeezed next to the icon cluster");
});

test("Guardados is a real heart-driven filter tab, independent of and additional to Activos/Archivados/Todos - not just the heart control on its own (issue #131)", async () => {
  const source = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  const hackathonsFnStart = source.indexOf("function Hackathons(");
  const hackathonsFnEnd = source.indexOf("function HackathonsEmptyState");
  const fnSource = source.slice(hackathonsFnStart, hackathonsFnEnd);

  assert.match(fnSource, /useState<"activos" \| "archivados" \| "guardados" \| "todos">/);
  assert.match(fnSource, /const guardados = useMemo\(\(\) => sorted\.filter\(\(h\) => h\.is_favorite\), \[sorted\]\);/);
  assert.match(fnSource, /viewTab === "guardados" \? guardados/);
  assert.match(fnSource, /\{ id: "guardados", label: "Guardados", count: guardados\.length, withHeart: true \}/, "the tab must be a real filter tab with a live heart count, matching the issue's explicit ask");
});

test("Toggling the heart is wired through a distinct action from completion/status changes - completeHackathon and the Realizado button never touch is_favorite (issue #131)", async () => {
  const source = await readFile(new URL("../src/components/guest-store.tsx", import.meta.url), "utf8");
  const completeFnStart = source.indexOf("completeHackathon: async (item: Hackathon)");
  const completeFnEnd = source.indexOf("addLink:", completeFnStart);
  assert.ok(completeFnStart !== -1 && completeFnEnd > completeFnStart);
  const completeFn = source.slice(completeFnStart, completeFnEnd);
  assert.doesNotMatch(completeFn, /is_favorite/, "completing/archiving an event must never read or write is_favorite - the two concepts stay independent");
});

// ---------------------------------------------------------------------------
// Issue #120 - Courses: favorite/save, independent from Archivados
// ---------------------------------------------------------------------------

test("The course_favorites migration is additive only, and documents the tech_opportunities exclusion consistently with the sibling hackathon migration (issue #120)", async () => {
  const source = await readFile(new URL("../infra/postgres/migrations/0008_course_favorites.sql", import.meta.url), "utf8");
  assert.match(source, /alter table public\.courses\s*\r?\n\s*add column if not exists is_favorite boolean not null default false/);
  assert.match(source, /create index if not exists courses_user_favorite_idx/);
  assert.doesNotMatch(source, /\bdrop\s+(table|schema)|truncate\s+table/i);
  assert.match(source, /0007_hackathon_favorites\.sql/, "must reference the sibling migration's identical tech_opportunities decision instead of re-arguing it");
});

test("toggleCourseFavorite is an atomic, user-scoped UPDATE - never touches status/lifecycle columns, and returns null for a row the caller doesn't own (issue #120)", async () => {
  const source = await readFile(new URL("../src/lib/db/repositories/courses.ts", import.meta.url), "utf8");
  const fnSource = source.slice(source.indexOf("export async function toggleCourseFavorite"));
  assert.match(fnSource, /UPDATE public\.courses SET is_favorite = NOT is_favorite WHERE id = \$1 AND user_id = \$2/, "must be a single atomic flip, not a read-then-write, and must filter by user_id");
  assert.doesNotMatch(fnSource, /\bstatus\b/, "toggling the heart must never touch the status/lifecycle column");
  assert.match(fnSource, /rows\[0\]\?\.is_favorite \?\? null/);
});

test("toggleCourseFavoriteAction is session-gated and redirects unauthenticated callers, matching toggleCompanyFavoriteAction/toggleHackathonFavoriteAction (issue #120)", async () => {
  const source = await readFile(new URL("../src/lib/courses/actions.ts", import.meta.url), "utf8");
  assert.match(source, /"use server"/);
  assert.match(source, /const session = await getValidatedSession\(\);/);
  assert.match(source, /if \(!session\) redirect\("\/login"\);/);
  assert.match(source, /toggleCourseFavorite\(session\.uid, courseId\)/, "must scope to session.uid, never a client-supplied user id");
});

test("The toggleCourseFavorite store action applies an optimistic flip with rollback and an honest error toast on failure (issue #120)", async () => {
  const source = await readFile(new URL("../src/components/guest-store.tsx", import.meta.url), "utf8");
  const start = source.indexOf("toggleCourseFavorite: (id: string)");
  const end = source.indexOf("addHackathon: async (data: Omit<Hackathon");
  assert.ok(start !== -1 && end !== -1 && end > start, "toggleCourseFavorite must be its own dedicated action");
  const fn = source.slice(start, end);
  assert.match(fn, /setStore\(/, "must apply an optimistic update");
  assert.match(fn, /toggleCourseFavoriteAction\(id\)\.then\(\(result\) => \{/);
  assert.match(fn, /if \(!result\.error\) return;/);
  assert.match(fn, /toast\.error\(/, "a failed save must surface an honest error toast");
  assert.match(fn, /is_favorite: !nextValue/, "the failure branch must flip is_favorite back, not leave the optimistic value stuck");
});

test("ReturnTypeActions declares toggleCourseFavorite, so the store's action object type-checks against the shared interface (issue #120)", async () => {
  const source = await readFile(new URL("../src/components/store/types.ts", import.meta.url), "utf8");
  assert.match(source, /toggleCourseFavorite: \(id: string\) => void;/);
  assert.match(source, /is_favorite\?: boolean;\r?\n\s*created_at: string;\r?\n\};/, "Course must declare is_favorite, matching Hackathon's shape");
});

test("fpItemToCourse maps fp_user_content_state.is_favorite through to Course.is_favorite - the exact gap issue #120 identified (fpItemToHackathon already did this)", async () => {
  const source = await readFile(new URL("../src/lib/courses/course-presentation.ts", import.meta.url), "utf8");
  const fnStart = source.indexOf("export function fpItemToCourse(item: FpCatalogItem): Course {");
  const fnEnd = source.indexOf("export function resolveCourseById");
  const fnSource = source.slice(fnStart, fnEnd);
  assert.match(fnSource, /is_favorite: item\.is_favorite \?\? false,/);
});

test("The heart control appears in the course card and the detail page, both driven by the same canToggleCourseFavorite/toggleCourseFavoriteFor helpers (issue #120, extended by the owner-reported follow-up to #135)", async () => {
  const source = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  assert.match(source, /export function canToggleCourseFavorite\(item: Course\): boolean/);
  assert.match(source, /export function toggleCourseFavoriteFor\(item: Course, actions: ReturnTypeActions\)/);
  const heartSites = source.match(/toggleCourseFavoriteFor\((featuredCourse|item), actions\)/g) ?? [];
  assert.equal(heartSites.length, 3, "the grid card, the featured card and the detail panel all call the same dispatcher - issue #160 adds the featured hero; the detail favourite renders once, in the side panel");
});

test("tech_opportunities-sourced courses are excluded from favoriting, mirroring the identical hackathon decision (issue #120)", async () => {
  const source = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  const fnStart = source.indexOf("function canToggleCourseFavorite");
  const fnSource = source.slice(fnStart, source.indexOf("function toggleCourseFavoriteFor"));
  assert.match(fnSource, /sourceTable === "tech_opportunities"\) return false/);
});

test("Favoriting a course is wired through a distinct action from completion/archival - completeCourse and updateCourse's callers never flip is_favorite as a side effect (issue #120)", async () => {
  const source = await readFile(new URL("../src/components/guest-store.tsx", import.meta.url), "utf8");
  const completeFnStart = source.indexOf("completeCourse: async (course: Course)");
  const completeFnEnd = source.indexOf("toggleCourseFavorite: (id: string)");
  const completeFn = source.slice(completeFnStart, completeFnEnd);
  assert.doesNotMatch(completeFn, /is_favorite/, "completing/archiving a course must never read or write is_favorite - the two concepts stay independent");
});

test("Guardados is a real heart-driven filter tab in Courses, independent of and additional to Activos/Archivados/Todos (issue #120)", async () => {
  const source = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  const coursesFnStart = source.indexOf("function Courses(");
  const coursesFnEnd = source.indexOf("function coursePriorityClass");
  const fnSource = source.slice(coursesFnStart, coursesFnEnd);

  assert.match(fnSource, /useState<"activos" \| "archivados" \| "guardados" \| "todos">/);
  assert.match(fnSource, /const guardados = useMemo\(\(\) => sorted\.filter\(\(c\) => c\.is_favorite\), \[sorted\]\);/);
  assert.match(fnSource, /viewTab === "guardados" \? guardados/);
  assert.match(fnSource, /\{ id: "guardados", label: "Guardados", count: guardados\.length, withHeart: true \}/, "the tab must be a real filter tab with a live heart count");
});

test("Course favorite state survives a reload - serializeCourses passes the DB row through unfiltered, it never strips is_favorite before it reaches the client store (issue #120)", async () => {
  const source = await readFile(new URL("../src/lib/data.ts", import.meta.url), "utf8");
  const fnStart = source.indexOf("function serializeCourses");
  const fnEnd = source.indexOf("function serializeHackathons");
  const fnSource = source.slice(fnStart, fnEnd);
  assert.match(fnSource, /\.\.\.course,/, "must spread the full DB row (which now includes is_favorite) rather than picking individual fields");
});

// ---------------------------------------------------------------------------
// Owner-reported follow-up to #135/#120 - Courses: internal detail page,
// replacing CourseDetailModal outright (mirrors the hackathons detail route)
// ---------------------------------------------------------------------------

const fixtureTechCourseItem = {
  id: "t3", id_slug: "curso-frontend", categoria: "curso", nombre: "Curso Frontend",
  entidad: "MDN", area_o_tipo: null, modalidad: "Online", localidad: "Granada",
  provincia: "Granada", fecha_inicio: "2026-09-01", fecha_fin: "2026-12-01", estado: "activo",
  certificacion_o_premio: null, practicas_empresa: null, horas_totales: null, horas_practicas: null,
  coste: "Gratis", requisitos_resumen: null, encaje_daw_1_5: null, prioridad: "alta", tags: null,
  fuente_url: "https://example.org/curso", ultima_revision: null, notas: null,
  created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z",
};

const fixtureTechEventItem = { ...fixtureTechCourseItem, id: "t4", id_slug: "reto-y", categoria: "hackathon_reto", nombre: "Reto Y" };

const fixtureFpCourseItem = {
  id: "f2", id_slug: "curso-fp-react", type: "curso_basico", title: "React desde cero",
  entity: "AL-LIO", delivery_mode: "Online", location: "Granada", province: "Granada",
  start_date: "2026-09-01", end_date: "2026-11-01", status: "activo", cost: "Gratis",
  certification: null, practices: null, source_url: "https://example.org/fp-react",
  tags: null, suggested_action: "Repasar antes de empezar", notes: "Importado 2026-01-01 desde FEED.json, revisar",
  priority: "Alta", is_favorite: true, user_status: null, user_completed_at: null,
  created_at: "2026-01-01T00:00:00.000Z",
};

const fixtureOwnCourse = {
  id: "real-course-1", title: "Mi propio curso", status: "pendiente",
  created_at: "2026-01-01T00:00:00.000Z",
};

test("resolveCourseById resolves tech-/fp-/plain ids to the correct source and returns null for a wrong-category or nonexistent slug", () => {
  assert.equal(resolveCourseById("tech-curso-frontend", [], [fixtureTechCourseItem], [])?.title, "Curso Frontend");
  assert.equal(resolveCourseById("tech-reto-y", [], [fixtureTechEventItem], []), null, "a tech_opportunities row categorized as an event must not resolve on the courses route");
  assert.equal(resolveCourseById("fp-curso-fp-react", [], [], [fixtureFpCourseItem])?.title, "React desde cero");
  assert.equal(resolveCourseById("real-course-1", [fixtureOwnCourse], [], [])?.title, "Mi propio curso");
  assert.equal(resolveCourseById("tech-does-not-exist", [], [fixtureTechCourseItem], []), null);
  assert.equal(resolveCourseById("real-course-does-not-exist", [fixtureOwnCourse], [], []), null, "an id belonging to another user is simply absent from this user's already-scoped arrays, so it resolves to null exactly like a nonexistent id");
});

test("isTechCourse/isFpCourseLike agree with resolveCourseById on category, and getCoursePresentation never leaks fp_content_items' raw notes as the public description", () => {
  assert.equal(isTechCourse(fixtureTechCourseItem), true);
  assert.equal(isTechCourse(fixtureTechEventItem), false);
  assert.equal(isFpCourseLike(fixtureFpCourseItem), true);
  assert.equal(isFpCourseLike({ ...fixtureFpCourseItem, type: "hackathon" }), false);

  const course = fpItemToCourse(fixtureFpCourseItem);
  const presentation = getCoursePresentation(course);
  assert.doesNotMatch(JSON.stringify(presentation), /Importado|revisar/i, "moderation/import provenance must never reach the presentation model");
  assert.equal(presentation.title, "React desde cero");

  const techCourse = techOpportunityToCourse(fixtureTechCourseItem);
  assert.equal(techCourse.sourceTable, "tech_opportunities");
});

test("CourseDetailPage resolves the item via the already user/cycle-scoped global store and calls notFound() instead of querying by a client-supplied id", async () => {
  const source = await readFile(new URL("../src/app/(dashboard)/courses/[id]/page.tsx", import.meta.url), "utf8");
  assert.match(source, /const store = \(await getGlobalStore\(\)\) as unknown as Store;/, "must reuse the session-authenticated, cache()-deduped global store - never a second, independently-authorized query");
  assert.match(source, /resolveCourseById\(id, store\.courses, store\.techOpportunities, store\.fpContent\)/);
  assert.match(source, /if \(!item\) notFound\(\);/, "an id outside this user's authorized catalogue must 404, not render an empty/broken page");
});

test("CourseDetailView shows an honest not-found state with a way back when the id doesn't resolve, and never renders item.notes directly", async () => {
  const source = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  const fnStart = source.indexOf("export function CourseDetailView");
  const fnEnd = source.indexOf("function Hackathons(");
  const fnSource = source.slice(fnStart, fnEnd);

  assert.match(fnSource, /if \(!item\) \{/);
  assert.match(fnSource, /Ya no podemos mostrar este curso/);
  assert.match(fnSource, /<Link href="\/courses" className="al-course-empty-btn">Volver a Cursos<\/Link>/);
  assert.doesNotMatch(fnSource, /\{item\.notes\}/, "notes must never be interpolated directly into the page");
  assert.match(fnSource, /const presentation = getCoursePresentation\(item\);/);
});

test("The course detail page's official source link is gated by isSafeHttpUrl and the heart control reuses the exact shared dispatcher, same as the card", async () => {
  const source = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  const fnStart = source.indexOf("export function CourseDetailView");
  const fnEnd = source.indexOf("function Hackathons(");
  const fnSource = source.slice(fnStart, fnEnd);
  assert.match(fnSource, /\{isSafeHttpUrl\(presentation\.sourceUrl\) && \(/);
  assert.match(fnSource, /rel="noopener noreferrer"/);
  assert.match(fnSource, /onClick=\{\(\) => toggleCourseFavoriteFor\(item, actions\)\}/);
});

test("Archivado and Guardado stay fully independent for courses: is_favorite never gates the Activos/Archivados split, and completing/archiving never touches is_favorite (confirms the existing #120 guarantee the owner asked to double check)", async () => {
  const source = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");

  const archivedFnStart = source.indexOf('function isCourseArchived(course: Pick<Course, "status">) {');
  const archivedFnEnd = source.indexOf("\n}", archivedFnStart);
  const archivedFnSource = source.slice(archivedFnStart, archivedFnEnd);
  assert.doesNotMatch(archivedFnSource, /is_favorite/, "archived status must be derived purely from course.status, never from is_favorite");
  assert.match(archivedFnSource, /course\.status === "terminado" \|\| course\.status === "descartado"/, "a course becomes archived when the student marks it Terminado (or Descartado) - the same action, not a separate one");

  const coursesFnStart = source.indexOf("function Courses(");
  const coursesFnEnd = source.indexOf("function coursePriorityClass");
  const coursesFnSource = source.slice(coursesFnStart, coursesFnEnd);
  assert.match(coursesFnSource, /const guardados = useMemo\(\(\) => sorted\.filter\(\(c\) => c\.is_favorite\), \[sorted\]\);/, "Guardados is driven purely by is_favorite, independent of the Terminado-driven Archivados split");

  const storeSource = await readFile(new URL("../src/components/guest-store.tsx", import.meta.url), "utf8");
  const completeFnStart = storeSource.indexOf("completeCourse: async (course: Course)");
  const completeFnEnd = storeSource.indexOf("toggleCourseFavorite: (id: string)");
  const completeFn = storeSource.slice(completeFnStart, completeFnEnd);
  assert.doesNotMatch(completeFn, /is_favorite/, "marking a course Terminado (which archives it) must never read or write is_favorite");
});

test("FP course details expose only reviewed taught/demonstrated aptitudes, keeping them separate from event requirements", async () => {
  const repository = await readFile(new URL("../src/lib/db/repositories/fp_catalog.ts", import.meta.url), "utf8");
  const queryStart = repository.indexOf("export async function getCourseAptitudesForItems");
  const queryEnd = repository.indexOf("export type CompetencyLearningItem", queryStart);
  const querySource = repository.slice(queryStart, queryEnd);
  assert.match(querySource, /link\.tipo_relacion IN \('ensena', 'demuestra'\)/);
  assert.doesNotMatch(querySource, /tipo_relacion = 'requiere'/, "course outcomes must not be mislabeled as entry requirements");

  const aptitude = {
    id: "PRO-001",
    titulo: "Programar con variables, decisiones y bucles",
    descripcion: "Resuelve problemas básicos con código.",
    horas_estimadas: 8,
    evidencia_minima: "Ejercicio funcional",
    relation: "ensena",
    completed: true,
  };
  const mapped = fpItemToCourse({ ...fixtureFpCourseItem, courseAptitudes: [aptitude] });
  assert.deepEqual(mapped.aptitudes, [aptitude], "the authoritative catalogue mapping must survive the FP-to-course presentation conversion");
});

test("the global store loads course aptitudes and shares live completion state with event requirements", async () => {
  const dataSource = await readFile(new URL("../src/lib/data.ts", import.meta.url), "utf8");
  assert.match(dataSource, /getCourseAptitudesForItems\(courseAptitudeItemIds\)/);
  assert.match(dataSource, /const visibleCompetencyIds = \[\.\.\.new Set\(\[\.\.\.requiredCompetencyIds, \.\.\.courseAptitudeIds\]\)\]/);
  assert.match(dataSource, /courseAptitudes: \(courseAptitudesByItem\.get\(item\.id\) \?\? \[\]\)\.map/);
  assert.match(dataSource, /completed: userCompetencyStates\.has\(aptitude\.id\)/);

  const storeSource = await readFile(new URL("../src/components/guest-store.tsx", import.meta.url), "utf8");
  assert.match(storeSource, /courseAptitudes: item\.courseAptitudes\?\.map/);
  assert.match(storeSource, /aptitude\.id === skillId \? \{ \.\.\.aptitude, completed \} : aptitude/);
});

test("CourseDetailView feeds the mapped aptitudes into Qué aprenderás and Estructura del curso, with an honest fallback and no fabricated relationships (issue #160)", async () => {
  const source = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  const fnStart = source.indexOf("export function CourseDetailView");
  const fnEnd = source.indexOf("function Hackathons(");
  const fnSource = source.slice(fnStart, fnEnd);
  assert.match(fnSource, /const aptitudes = item\.aptitudes \?\? \[\];/);
  // "Qué aprenderás" is derived only from the reviewed taught aptitudes,
  // never invented copy.
  assert.match(fnSource, /aptitudes\.filter\(\(a\) => a\.relation === "ensena"\)/);
  assert.match(fnSource, /Qué aprenderás/);
  // "Estructura del curso" lists the same aptitudes as ordered steps.
  assert.match(fnSource, /Estructura del curso/);
  assert.match(fnSource, /aptitudes\.map\(\(a, i\) =>/);
  // Honest fallback when a course has no reviewed aptitudes yet.
  assert.match(fnSource, /Los objetivos concretos se publicarán antes del inicio\./);
  assert.doesNotMatch(fnSource, /requiredCompetencies/, "course outcomes must use their own relation-aware contract");
});

// ---------------------------------------------------------------------------
// Issue #135 - Events & challenges: internal detail experience
// ---------------------------------------------------------------------------

const fixtureTechEvent = {
  id: "t1", id_slug: "reto-granada", categoria: "hackathon_reto", nombre: "Reto Granada",
  entidad: "Ayuntamiento", area_o_tipo: null, modalidad: "Presencial", localidad: "Granada",
  provincia: "Granada", fecha_inicio: "2026-09-01", fecha_fin: "2026-09-02", estado: "activo",
  certificacion_o_premio: null, practicas_empresa: null, horas_totales: null, horas_practicas: null,
  coste: null, requisitos_resumen: null, encaje_daw_1_5: null, prioridad: "alta", tags: null,
  fuente_url: "https://example.org/reto", ultima_revision: null, notas: null,
  created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z",
};

const fixtureTechCourse = { ...fixtureTechEvent, id: "t2", id_slug: "curso-x", categoria: "curso", nombre: "Curso X" };

const fixtureFpEvent = {
  id: "f1", id_slug: "hackathon-fp", type: "hackathon", title: "Hackathon FP",
  entity: "AL-LIO", delivery_mode: "Online", location: "Granada", province: "Granada",
  start_date: "2026-10-01", end_date: "2026-10-02", status: "activo", cost: null,
  certification: null, practices: null, source_url: "https://example.org/fp-hackathon",
  tags: null, suggested_action: "Revisar bases del reto", notes: "Importado 2026-01-01 desde FEED.json, pendiente de revision",
  priority: "Alta", requiredCompetencies: [], is_favorite: true, user_status: null,
  user_completed_at: null, created_at: "2026-01-01T00:00:00.000Z",
};

const fixtureOwnHackathon = {
  id: "real-uuid-1", name: "Mi propio evento", status: "pendiente", priority: "media",
  is_favorite: false, created_at: "2026-01-01T00:00:00.000Z",
};

test("resolveHackathonById resolves tech-/fp-/plain ids to the correct source and returns null for a wrong-category or nonexistent slug (issue #135)", () => {
  assert.equal(resolveHackathonById("tech-reto-granada", [], [fixtureTechEvent], [])?.name, "Reto Granada");
  assert.equal(resolveHackathonById("tech-curso-x", [], [fixtureTechCourse], []), null, "a tech_opportunities row categorized as a course must not resolve on the events route");
  assert.equal(resolveHackathonById("fp-hackathon-fp", [], [], [fixtureFpEvent])?.name, "Hackathon FP");
  assert.equal(resolveHackathonById("real-uuid-1", [fixtureOwnHackathon], [], [])?.name, "Mi propio evento");
  assert.equal(resolveHackathonById("tech-does-not-exist", [], [fixtureTechEvent], []), null);
  assert.equal(resolveHackathonById("real-uuid-does-not-exist", [fixtureOwnHackathon], [], []), null, "an id belonging to another user is simply absent from this user's already-scoped arrays, so it resolves to null exactly like a nonexistent id - not found and not yours are indistinguishable by construction");
});

test("getHackathonPresentation never leaks fp_content_items' raw notes (import/moderation provenance) as the public description (issue #135, same regression class as #118)", () => {
  const hackathon = fpItemToHackathon(fixtureFpEvent);
  const presentation = getHackathonPresentation(hackathon);
  assert.equal(presentation.description, undefined, "fp_content_items-sourced events have no public description field set on this fixture, and must never fall back to notes");
  assert.doesNotMatch(JSON.stringify(presentation), /pendiente de revision|Importado/, "moderation/import provenance must never reach the presentation model");
  assert.equal(presentation.isFavorite, true);
  assert.equal(presentation.canToggleFavorite, true);
});

test("getHackathonPresentation marks tech_opportunities-sourced events as not favoritable, and techOpportunityToHackathon/isTechHackathonOrEvent agree on category (issue #135)", () => {
  assert.equal(isTechHackathonOrEvent(fixtureTechEvent), true);
  assert.equal(isTechHackathonOrEvent(fixtureTechCourse), false);
  const hackathon = techOpportunityToHackathon(fixtureTechEvent);
  const presentation = getHackathonPresentation(hackathon);
  assert.equal(presentation.canToggleFavorite, false);
  assert.equal(canToggleHackathonFavoriteShared(hackathon), false);
});

test("isFpHackathonLike only matches the event/hackathon fp_content_items types, keeping the events detail route from resolving a course-typed row", () => {
  assert.equal(isFpHackathonLike(fixtureFpEvent), true);
  assert.equal(isFpHackathonLike({ ...fixtureFpEvent, type: "curso_basico" }), false);
});

test("hackathonPublicDescription prefers item.description, and only falls back to item.notes for non-fp_content_items sources (issue #135)", () => {
  assert.equal(hackathonPublicDescription({ status: "pendiente", is_favorite: false, name: "x", created_at: "", description: "Clean copy", notes: "raw notes", sourceTable: undefined, priority: "media" }), "Clean copy");
  assert.equal(hackathonPublicDescription({ status: "pendiente", is_favorite: false, name: "x", created_at: "", notes: "own notes", sourceTable: undefined, priority: "media" }), "own notes");
  assert.equal(hackathonPublicDescription({ status: "pendiente", is_favorite: false, name: "x", created_at: "", notes: "raw import notes", sourceTable: "fp_content_items", priority: "media" }), undefined, "fp_content_items rows must never expose notes as description");
});

test("Every hackathon card and the featured hero link unconditionally to the internal /hackathons/[id] detail route - not gated by requiredCompetencies like the old 'Ver detalles' button was (issue #135)", async () => {
  const [source, cardSource] = await Promise.all([
    readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/catalog/catalog-card.tsx", import.meta.url), "utf8"),
  ]);
  const hackathonsFnStart = source.indexOf("function Hackathons(");
  const hackathonsFnEnd = source.indexOf("function HackathonsEmptyState");
  const fnSource = source.slice(hackathonsFnStart, hackathonsFnEnd);

  assert.match(fnSource, /detailHref=\{`\/hackathons\/\$\{encodeURIComponent\(item\.id\)\}`\}/, "the card must always pass its own internal detail URL");
  assert.match(fnSource, /detailHref=\{`\/hackathons\/\$\{encodeURIComponent\(featuredHackathon\.id\)\}`\}/, "the featured card must always pass the same internal detail URL");
  assert.match(cardSource, /<Link href=\{href\}/, "the shared component must render the passed URL as a real Link");
  const detailHrefStart = fnSource.indexOf('detailHref={`/hackathons/${encodeURIComponent(item.id)}`}');
  assert.doesNotMatch(fnSource.slice(Math.max(0, detailHrefStart - 180), detailHrefStart), /requiredCompetencies/, "the detail URL must not be gated by requirements");
});

test("The shared card and featured surfaces expose one expansion affordance each, without a second requirements action (owner-reported follow-up to #135, issue #164)", async () => {
  const [source, cardSource] = await Promise.all([
    readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/catalog/catalog-card.tsx", import.meta.url), "utf8"),
  ]);
  const hackathonsFnStart = source.indexOf("function Hackathons(");
  const hackathonsFnEnd = source.indexOf("function HackathonsEmptyState");
  const fnSource = source.slice(hackathonsFnStart, hackathonsFnEnd);

  assert.doesNotMatch(fnSource, /Ver requisitos/, "the card's old separate requirements-modal button must be gone - requirements now live inline on the Ver detalles page");
  assert.doesNotMatch(fnSource, /Aptitudes mínimas/, "the hero's old separate requirements-modal button must be gone for the same reason");
  assert.doesNotMatch(fnSource, /setRequirementsItemId/, "no state should exist to open a requirements modal that no longer exists");

  assert.equal((cardSource.match(/<CatalogDetailLink href=\{detailHref\}/g) ?? []).length, 2, "CatalogCard and CatalogFeaturedCard each render exactly one shared detail action");
  assert.equal((cardSource.match(/Ver detalles\s*<\/Link>/g) ?? []).length, 1, "the shared action owns one canonical label");
});

test("HackathonDetailPage resolves the item via the already user/cycle-scoped global store and calls notFound() instead of querying by a client-supplied id (issue #135)", async () => {
  const source = await readFile(new URL("../src/app/(dashboard)/hackathons/[id]/page.tsx", import.meta.url), "utf8");
  assert.match(source, /const store = \(await getGlobalStore\(\)\) as unknown as Store;/, "must reuse the session-authenticated, cache()-deduped global store - never a second, independently-authorized query");
  assert.match(source, /resolveHackathonById\(id, store\.hackathons, store\.techOpportunities, store\.fpContent\)/);
  assert.match(source, /if \(!item\) notFound\(\);/, "an id outside this user's authorized catalogue must 404, not render an empty/broken page");
});

test("HackathonDetailView shows an honest not-found state with a way back when the id doesn't resolve (issue #135)", async () => {
  const source = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  const fnStart = source.indexOf("export function HackathonDetailView");
  const fnEnd = source.indexOf("function LinksView");
  const fnSource = source.slice(fnStart, fnEnd);

  assert.match(fnSource, /if \(!item\) \{/);
  assert.match(fnSource, /Ya no podemos mostrar este evento/);
  assert.match(fnSource, /<Link href="\/hackathons" className="al-hack-empty-btn">Volver a Eventos y retos<\/Link>/);
});

test("The requirements step-by-step modal was retired (owner-reported follow-up to #135) - HackathonRequirementsModal no longer exists, and requirements render inline via RequirementRow instead", async () => {
  const source = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /function HackathonRequirementsModal/, "the modal must be removed entirely, not just left unreachable");
  assert.doesNotMatch(source, /requirementsItemId|requirementsOpen/, "no state should remain for opening a modal that no longer exists");
  assert.match(source, /function RequirementRow\(\{ competency, actions \}: \{ competency: RequiredCompetency; actions: ReturnTypeActions \}\)/);

  const viewFnStart = source.indexOf("export function HackathonDetailView");
  const viewFnEnd = source.indexOf("function LinksView");
  const viewFnSource = source.slice(viewFnStart, viewFnEnd);
  assert.match(viewFnSource, /\{requirements\.map\(\(competency\) => \(\s*<RequirementRow key=\{competency\.id\} competency=\{competency\} actions=\{actions\} \/>/, "every requirement must render inline on the page");
  assert.match(viewFnSource, /<CatalogPanel title="Recursos para prepararte">/, "the shared detail panel must hold the inline requirements");
});

test("The inline requirements section never constructs a /ruta/ URL - replaces the equivalent guard that used to cover the retired modal (issue #112, owner-reported follow-up to #135)", async () => {
  const source = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  const fnStart = source.indexOf("function RequirementRow(");
  const fnEnd = source.indexOf("export function HackathonDetailView");
  const fnSource = source.slice(fnStart, fnEnd);
  assert.doesNotMatch(fnSource, /\/ruta\//, "RequirementRow must never construct a /ruta/ URL");
  assert.doesNotMatch(fnSource, /rutaHref|Ver en tu ruta/, "the old event-level ruta CTA concept must not resurface here");
});

test("HackathonDetailView never renders item.notes directly - the description always goes through hackathonPublicDescription, same as the card and hero (issue #135)", async () => {
  const source = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  const fnStart = source.indexOf("export function HackathonDetailView");
  const fnEnd = source.indexOf("function LinksView");
  const fnSource = source.slice(fnStart, fnEnd);
  assert.match(fnSource, /const description = hackathonPublicDescription\(item\);/);
  assert.doesNotMatch(fnSource, /\{item\.notes\}/, "notes must never be interpolated directly into the page");
});

test("Each inline requirement's learning links are deduped by internal_learning_slug, and an honest fallback replaces fabricated recommendations when nothing is grounded (owner-reported follow-up to #135)", async () => {
  const source = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  const fnStart = source.indexOf("function RequirementRow(");
  const fnEnd = source.indexOf("export function HackathonDetailView");
  const fnSource = source.slice(fnStart, fnEnd);

  assert.match(fnSource, /selectAptitudeVideos\(competency\.learningItems\)/, "must reuse the same safe-video selector the old CompetencyRequirement used, not a new unfiltered pass over every learning item");
  assert.match(fnSource, /items\.findIndex\(\(candidate\) => candidate\.internal_learning_slug === learningItem\.internal_learning_slug\) === index\)/, "must dedupe by internal_learning_slug");
  assert.match(fnSource, /internalCourses\.length === 0 && referenceTitles\.length === 0 && <EmptyText>Sin curso interno disponible todavía\.<\/EmptyText>/, "an honest empty state, not a fabricated recommendation, when this specific requirement has nothing grounded");
  assert.match(fnSource, /const referenceTitles = \[\.\.\.new Set\([\s\S]*?\)\]\.slice\(0, 2\);/, "legacy references without an internal course stay capped, same as before");
});

test("The detail view's official source link is gated by isSafeHttpUrl, same as the card and hero (issue #135)", async () => {
  const source = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  const fnStart = source.indexOf("export function HackathonDetailView");
  const fnEnd = source.indexOf("function LinksView");
  const fnSource = source.slice(fnStart, fnEnd);
  assert.match(fnSource, /\{isSafeHttpUrl\(item\.url\) && \(/);
  assert.match(fnSource, /rel="noopener noreferrer"/);
});

test("The detail view heart control reuses the exact shared canToggleHackathonFavorite/toggleHackathonFavoriteFor helpers - card, hero and detail can never drift out of sync on saved state (issue #135)", async () => {
  const source = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  const heartSites = source.match(/onClick=\{\(\) => toggleHackathonFavoriteFor\(/g) ?? [];
  assert.equal(heartSites.length, 3, "card, hero and the detail view must all call the same dispatcher - expected exactly 3 call sites");
  assert.match(source, /from "@\/lib\/hackathons\/hackathon-presentation"/, "guest-app.tsx must import the shared helpers rather than keep a second local copy that could drift");
});

test("An event past its actionable date shows an honest 'ya ha finalizado' notice on the detail view instead of presenting stale registration as still open (issue #135)", async () => {
  const source = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  const fnStart = source.indexOf("export function HackathonDetailView");
  const fnEnd = source.indexOf("function LinksView");
  const fnSource = source.slice(fnStart, fnEnd);
  assert.match(fnSource, /const past = isHackathonPast\(item\);/);
  assert.match(fnSource, /\{past && <p[^>]*>Este evento ya ha finalizado\.<\/p>\}/);
});

// ---------------------------------------------------------------------------
// Issue #136 - Profile: Saved hub for hearted companies, courses, events
// ---------------------------------------------------------------------------

test("Perfil renders the Saved hub, wrapped in a real error boundary so a rendering bug there cannot take down the profile edit form above it (issue #136)", async () => {
  const profileFormSource = await readFile(new URL("../src/components/profile/profile-form.tsx", import.meta.url), "utf8");
  assert.match(profileFormSource, /import \{ SavedHub \} from "@\/components\/profile\/saved-hub";/);
  assert.match(profileFormSource, /<SavedHub \/>/);
  const savedHubIdx = profileFormSource.indexOf("<SavedHub />");
  const formIdx = profileFormSource.indexOf("<form action={formAction}");
  assert.ok(formIdx > -1 && savedHubIdx > formIdx, "the edit form must render before/outside SavedHub, not nested inside it");

  const source = await readFile(new URL("../src/components/profile/saved-hub.tsx", import.meta.url), "utf8");
  assert.match(source, /class SavedHubBoundary extends Component/, "must be a real React error boundary (class component), not a try/catch that can't catch render errors");
  assert.match(source, /static getDerivedStateFromError\(\)/);
  assert.match(source, /export function SavedHub\(\) \{\s*return \(\s*<SavedHubBoundary>\s*<SavedHubContent \/>\s*<\/SavedHubBoundary>/);
});

test("The Saved hub derives every section from the same live store the rest of the app uses - no new fetch, no parallel storage, no reimplemented merge/dedupe logic (issue #136)", async () => {
  const source = await readFile(new URL("../src/components/profile/saved-hub.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /fetch\(|useEffect\(/, "must not introduce a separate data fetch - everything comes from useStore()'s already-loaded, session-scoped data");
  assert.match(source, /const \{ store, actions \} = useStore\(\);/);
  assert.match(source, /const savedCompanies = useMemo\(\(\) => store\.companies\.filter\(\(c\) => c\.is_favorite\), \[store\.companies\]\);/);
  assert.match(source, /getDisplayCourses\(store\.courses, store\.techOpportunities, store\.fpContent\)\.filter\(\(c\) => c\.is_favorite\)/, "courses must reuse the exact same merge function Cursos itself uses, not a second parallel implementation");
  assert.match(source, /getDisplayHackathons\(store\.hackathons, store\.techOpportunities, store\.fpContent\)\.filter\(\(h\) => h\.is_favorite\)/, "events must reuse the exact same merge function Eventos y retos itself uses");
  assert.match(source, /from "@\/components\/guest-app"/, "getDisplayCourses/getDisplayHackathons must be imported, not redefined");
});

test("Unsaving from the hub calls the exact same dispatchers as the origin modules, so all surfaces stay in sync with the same optimistic-update/rollback behavior (issue #136)", async () => {
  const source = await readFile(new URL("../src/components/profile/saved-hub.tsx", import.meta.url), "utf8");
  assert.match(source, /onUnsave=\{\(\) => actions\.toggleCompanyFavorite\(company\.id\)\}/, "companies must reuse the exact same store action Trabajo uses");
  assert.match(source, /onUnsave=\{canToggleCourseFavorite\(course\) \? \(\) => toggleCourseFavoriteFor\(course, actions\) : undefined\}/, "courses must reuse the exact same dispatcher Cursos uses, including its fp_content_items/tech_opportunities branching");
  assert.match(source, /onUnsave=\{canToggleHackathonFavorite\(hackathon\) \? \(\) => toggleHackathonFavoriteFor\(hackathon, actions\) : undefined\}/, "events must reuse the exact same dispatcher Eventos y retos uses");
});

test("Each saved item links to its internal detail when one exists (events -> /hackathons/[id]) or its filtered module otherwise (companies/courses), with the official URL as a validated secondary action (issue #136)", async () => {
  const source = await readFile(new URL("../src/components/profile/saved-hub.tsx", import.meta.url), "utf8");
  assert.match(source, /primaryHref=\{`\/hackathons\/\$\{encodeURIComponent\(hackathon\.id\)\}`\}/, "events must link to the real internal detail page from issue #135");
  assert.match(source, /primaryHref=\{`\/courses\/\$\{encodeURIComponent\(course\.id\)\}`\}/, "courses must link to their own real internal detail page too (owner-reported follow-up to #135)");
  assert.match(source, /primaryHref="\/work"/, "companies still have no per-item internal detail, so they fall back to the filtered module");
  const secondaryHrefSites = source.match(/secondaryHref=\{isSafeHttpUrl\(/g) ?? [];
  assert.equal(secondaryHrefSites.length, 3, "every one of the 3 saved types must validate its external URL through isSafeHttpUrl before offering it");
});

test("The hub shows one overall empty state when nothing is saved anywhere, and a distinct per-section hint when only that module has nothing saved yet (issue #136)", async () => {
  const source = await readFile(new URL("../src/components/profile/saved-hub.tsx", import.meta.url), "utf8");
  assert.match(source, /const totalSaved = savedCompanies\.length \+ savedCourses\.length \+ savedHackathons\.length;/);
  assert.match(source, /\{totalSaved === 0 \? \(/);
  assert.match(source, /Todavía no has guardado nada/);

  const sectionStart = source.indexOf("function SavedSection(");
  const sectionSource = source.slice(sectionStart, source.indexOf("function SavedRow("));
  assert.match(sectionSource, /\{count === 0 \? \(\s*<p[^>]*>\{emptyHint\}<\/p>/, "an individually-empty section must show its own hint, distinct from the page-level empty state");
});

test("The hub caps each section's preview and offers Ver todos for longer collections, instead of rendering every saved item into the profile form (issue #136)", async () => {
  const source = await readFile(new URL("../src/components/profile/saved-hub.tsx", import.meta.url), "utf8");
  assert.match(source, /const VISIBLE_PER_SECTION = 4;/);
  assert.match(source, /\.slice\(0, VISIBLE_PER_SECTION\)/g);
  const sliceCalls = source.match(/\.slice\(0, VISIBLE_PER_SECTION\)/g) ?? [];
  assert.equal(sliceCalls.length, 3, "all three sections (companies, courses, events) must be capped");
  assert.match(source, /const hasMore = count > VISIBLE_PER_SECTION;/);
  assert.match(source, /\{hasMore \? `Ver todos \(\$\{count\}\)` : "Ver módulo"\}/);
});

test("A second user cannot reach another user's saved items through the hub - it reads only the current session's already-authorized store, introducing no new query surface (issue #136)", async () => {
  const source = await readFile(new URL("../src/components/profile/saved-hub.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /from "@\/lib\/db\/repositories/, "the hub must not query the database directly - store.companies/courses/hackathons are already session-scoped by the layout's own getGlobalStore() call");
  assert.doesNotMatch(source, /userId|user_id/, "no user id of any kind should appear here - there is nothing to scope, since the input data is already scoped");
});

// ---------------------------------------------------------------------------
// Owner-reported follow-up: the "Archivados" tab is renamed to match the
// action that actually populates it, on both Cursos and Eventos y retos -
// "Guardados" already owns the heart/favorite concept, so a second tab also
// implying "archived" was redundant/confusing. Pure copy change: the
// underlying isCourseArchived/isHackathonArchived status-driven logic, the
// "archivados" view-tab key, and independence from is_favorite are untouched
// (see the #120 Archivado/Guardado independence test above).
// ---------------------------------------------------------------------------

test("The Cursos tab formerly labelled Archivados now reads Terminado - matching the button that populates it - and its empty state copy matches", async () => {
  const source = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  const coursesFnStart = source.indexOf("function Courses(");
  const coursesFnEnd = source.indexOf("function coursePriorityClass");
  const fnSource = source.slice(coursesFnStart, coursesFnEnd);

  assert.match(fnSource, /\{ id: "archivados", label: "Terminado", count: archivados\.length \}/, "the displayed label changes; the internal \"archivados\" view-tab key does not, so isCourseArchived/status logic stays untouched");
  assert.doesNotMatch(fnSource, /label: "Archivados"/, "the old label must not survive alongside the new one");
  assert.match(fnSource, /No tienes cursos terminados/);
  assert.match(fnSource, /Cuando marques un curso como Terminado, aparecerá aquí\./);
});

test("The Eventos y retos tab formerly labelled Archivados now reads Realizado - matching that page's own completion button, so Cursos and Eventos y retos use consistent, button-matching terminology", async () => {
  const source = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  const hackathonsFnStart = source.indexOf("function Hackathons(");
  const hackathonsFnEnd = source.indexOf("function HackathonsEmptyState");
  const fnSource = source.slice(hackathonsFnStart, hackathonsFnEnd);

  assert.match(fnSource, /\{ id: "archivados", label: "Realizado", count: archivados\.length \}/, "the displayed label changes; the internal \"archivados\" view-tab key does not, so isHackathonArchived/status logic stays untouched");
  assert.doesNotMatch(fnSource, /label: "Archivados"/, "the old label must not survive alongside the new one");
});

test("No user-facing 'Archivados' label survives anywhere in the app - Cursos and Eventos y retos were the only two", async () => {
  const source = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /Archivados/, "every remaining reference to archiving must be the internal \"archivados\" key (lowercase), never the old user-visible label");
});

// ---------------------------------------------------------------------------
// Issue #123: Work -> Portales quick-search cards get a real province picker
// and a dedicated remote/teletrabajo toggle, replacing the hardcoded
// "programador java" / "Granada" example state, plus persistence of each
// platform's last search via the previously-unused quick_searches repository.
// ---------------------------------------------------------------------------

test("SPANISH_PROVINCES lists exactly the 50 provinces plus Ceuta and Melilla, with no duplicates or blanks (issue #123)", () => {
  assert.equal(SPANISH_PROVINCES.length, 52);
  assert.equal(new Set(SPANISH_PROVINCES).size, 52, "no duplicate province names");
  for (const province of SPANISH_PROVINCES) {
    assert.ok(province.trim().length > 0, "no blank entries");
  }
  for (const name of ["Granada", "Madrid", "Barcelona", "Ceuta", "Melilla"]) {
    assert.ok(SPANISH_PROVINCES.includes(name), `${name} must be present`);
  }
});

test("buildJobSearchUrl treats \"Teletrabajo\" - the exact sentinel the new remote toggle sends - as remote for all 5 headline portals (issue #123)", () => {
  const linkedin = buildJobSearchUrl("LinkedIn", "programador java", "Teletrabajo");
  assert.match(linkedin, /f_WT=2/);
  assert.doesNotMatch(linkedin, /location=Teletrabajo/i);

  const infojobs = buildJobSearchUrl("InfoJobs", "programador java", "Teletrabajo");
  assert.match(infojobs, /telecommuting=1/);

  const tecnoempleo = buildJobSearchUrl("Tecnoempleo", "programador java", "Teletrabajo");
  assert.match(tecnoempleo, /[?&]pr=(&|$)/, "province param must be cleared, not literally \"Teletrabajo\"");

  const indeed = buildJobSearchUrl("Indeed", "programador java", "Teletrabajo");
  assert.match(decodeURIComponent(indeed), /teletrabajo/i);
  assert.match(decodeURIComponent(indeed), /q=programador java teletrabajo/i);

  const jooble = buildJobSearchUrl("Jooble", "programador java", "Teletrabajo");
  assert.match(decodeURIComponent(jooble), /teletrabajo/i);
});

test("buildJobSearchUrl still supports a real province name unchanged - the URL-building layer needed no changes for issue #123 (issue #97 gap analysis)", () => {
  const url = buildJobSearchUrl("InfoJobs", "programador java", "Granada");
  assert.match(url, /provinceIds=/);
  assert.doesNotMatch(url, /telecommuting=1/);
});

test("QuickJobSearchCard no longer hardcodes an example search - the fields start genuinely empty, with a plain descriptive placeholder, not a fabricated example value (issue #123, owner-reported follow-up)", async () => {
  const source = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  const cardStart = source.indexOf("const QuickJobSearchCard = memo(");
  const cardEnd = source.indexOf("\n});", cardStart);
  const cardSource = source.slice(cardStart, cardEnd);

  assert.doesNotMatch(cardSource, /useState\("programador java"\)/, "the keyword field must not start pre-filled");
  assert.doesNotMatch(cardSource, /useState<"Granada" \| "Teletrabajo">\("Granada"\)/, "the old 2-option Granada/Teletrabajo dropdown state must be gone");
  assert.match(cardSource, /useState\(""\)/, "query starts empty");
  assert.doesNotMatch(cardSource, /programador java/i, "no invented example value anywhere, including as a placeholder - matches the plain descriptive placeholders used by every other search field in this file (e.g. 'Buscar empresa o categoria')");
  assert.match(cardSource, /placeholder="Puesto o palabra clave"/, "a plain descriptive placeholder, consistent with the rest of the app's search inputs");
});

test("The quick-search card wires a real province combobox with type-ahead filtering and a dedicated remote switch (issue #123)", async () => {
  const source = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");

  assert.match(source, /import \{ SPANISH_PROVINCES \} from "@\/lib\/deeplinks\/spanish-provinces";/);
  assert.match(source, /function ProvinceCombobox\(/);
  assert.match(source, /SPANISH_PROVINCES\.filter\(\(province\) => normalizeForProvinceSearch\(province\)\.includes\(needle\)\)/, "type-ahead filtering, the gap the issue found in FieldListbox");

  const cardStart = source.indexOf("const QuickJobSearchCard = memo(");
  const cardEnd = source.indexOf("\n});", cardStart);
  const cardSource = source.slice(cardStart, cardEnd);
  assert.match(cardSource, /<ProvinceCombobox/);
  assert.match(cardSource, /role="switch"[\s\S]*?aria-checked=\{remote\}/, "a dedicated toggle, not a 3rd dropdown option");
  assert.match(cardSource, /disabled=\{remote\}/, "the province field disables while remote is active");
});

test("ProvinceCombobox shows its placeholder while disabled instead of a stale leftover province - verified live: toggling teletrabajo on while Granada was selected still displayed 'Granada' until this was fixed (issue #123)", async () => {
  const source = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  const comboStart = source.indexOf("function ProvinceCombobox(");
  const comboEnd = source.indexOf("\nconst QuickJobSearchCard", comboStart);
  const comboSource = source.slice(comboStart, comboEnd);

  assert.match(comboSource, /\{disabled \? placeholder : value \|\| placeholder\}/, "disabled must win over a previously-selected value, not just gate the panel");
});

test("Searching persists the platform's last query/location, and loading pre-fills it from the same source on the next visit (issue #123)", async () => {
  const source = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");

  assert.match(source, /import \{ getQuickSearchesAction, saveQuickSearchAction, type SavedQuickSearch \} from "@\/lib\/work\/actions";/);
  assert.match(source, /getQuickSearchesAction\(\)\.then\(/, "Work() loads saved searches once, not per-card");
  assert.match(source, /saveQuickSearchAction\(platform, keyword, location\)\.catch\(\(\) => \{\}\)/, "save is fire-and-forget - it must never block opening the search tab");

  const cardStart = source.indexOf("const QuickJobSearchCard = memo(");
  const cardEnd = source.indexOf("\n});", cardStart);
  const cardSource = source.slice(cardStart, cardEnd);
  assert.match(cardSource, /hydrated\.current = true;/, "the saved value hydrates the fields exactly once, it does not fight the user's later edits");
  assert.match(cardSource, /onSearch\(platform, query, effectiveLocation\)/);
});

test("The empty-keyword state cannot fire a search or a save - the Buscar action is genuinely disabled, not just visually dimmed (issue #123)", async () => {
  const source = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  const cardStart = source.indexOf("const QuickJobSearchCard = memo(");
  const cardEnd = source.indexOf("\n});", cardStart);
  const cardSource = source.slice(cardStart, cardEnd);

  assert.match(cardSource, /const canSearch = query\.trim\(\)\.length > 0;/);
  assert.match(cardSource, /href=\{canSearch \? url : undefined\}/, "no href means no navigation, on top of the onClick guard");
  assert.match(cardSource, /if \(!canSearch\) \{ event\.preventDefault\(\); return; \}/);
});

test("src/lib/work/actions.ts is session-scoped, never redirects (it runs from background effects/clicks, not a form submit), and works around createQuickSearch's dead category default (issue #123)", async () => {
  const source = await readFile(new URL("../src/lib/work/actions.ts", import.meta.url), "utf8");

  assert.match(source, /"use server";/);
  assert.match(source, /const session = await getValidatedSession\(\);/g);
  assert.doesNotMatch(source, /redirect\(/, "a background save/read must degrade to an error result, not throw a Next.js redirect");
  assert.match(source, /category: "work"/, "createQuickSearch's `data.category ?? null` falls through to null unless this is passed explicitly, silently overriding the column's SQL default");
  assert.match(source, /\.filter\(\(row\) => row\.category === "work"\)/, "reads must not leak rows from an unrelated future category sharing this table");
});

test("Owner-reported follow-up: the gap between the Trabajo header and the Portales/Empresas tabs is tightened with an inline style, not a competing class, because Tailwind's space-y-6 sibling selector outranks a plain .al-work-tabs class rule", async () => {
  const source = await readFile(new URL("../src/components/guest-app.tsx", import.meta.url), "utf8");
  const workStart = source.indexOf("function Work(");
  const workEnd = source.indexOf("\nconst workBrandCss", workStart);
  const workSource = source.slice(workStart, workEnd);

  assert.match(
    workSource,
    /<div className="al-work-tabs" style=\{\{ marginTop: 8 \}\}>/,
    "an inline style is required here - a .al-work-tabs CSS rule has lower specificity than the space-y-6-generated sibling selector currently setting this element's margin-top, so a plain class override would silently lose"
  );
});

// ---------------------------------------------------------------------------
// Issue #132: production authentication - email-confirmed registration,
// password recovery with real session revocation, and Google sign-in split
// into its own minimal-scope identity flow, separate from Calendar consent.
//
// Every file touched here is "use server"/"server-only" or depends on
// Next.js request-scoped APIs (cookies/headers/redirect), none of which
// resolve under the plain node --test runner (confirmed while writing this:
// even "server-only" itself isn't an installed package - Next.js resolves
// it as bundler-only magic). Every assertion below is source-text based,
// the same established pattern already used for password-login.ts and
// demo-login.ts elsewhere in this file. The underlying SQL was verified
// separately against the live sandbox database (insert/conflict/token
// single-use/constraint behavior), not just read for shape here.
// ---------------------------------------------------------------------------

test("0009_production_authentication.sql is additive and backfills email_confirmed_at so no pre-existing account is locked out by the new confirmation requirement (issue #132)", async () => {
  const sql = await readFile(new URL("../infra/postgres/migrations/0009_production_authentication.sql", import.meta.url), "utf8");

  assert.doesNotMatch(sql, /\bdrop\s+(table|schema)\b/i);
  assert.doesNotMatch(sql, /\btruncate\s+table\b/i);
  assert.match(sql, /alter table public\.users\s*\n\s*add column if not exists email_confirmed_at timestamptz;/);
  assert.match(sql, /update public\.users\s*\n\s*set email_confirmed_at = created_at\s*\n\s*where email_confirmed_at is null;/, "existing accounts must be grandfathered in as confirmed, not locked out");
  assert.match(sql, /add column if not exists security_stamp uuid not null default gen_random_uuid\(\);/);
  assert.match(sql, /create table if not exists public\.auth_tokens/);
  assert.match(sql, /purpose\s+text\s+not null check \(purpose in \('email_confirm', 'password_reset'\)\)/);
  assert.match(sql, /token_hash\s+text\s+not null unique/, "only the hash may be persisted");
  assert.match(sql, /create table if not exists public\.external_identities/);
  assert.match(sql, /unique\(provider, provider_user_id\)/);
  assert.match(sql, /unique\(user_id, provider\)/, "one AL-LÍO account may link at most one identity per provider");
  assert.match(sql, /create table if not exists public\.rate_limit_buckets/);
});

test("createUnconfirmedUser and ensureUserByEmail together implement the decided account policy: unconfirmed by default for passwords, auto-confirmed for a verified Google identity, never un-confirming an existing account (issue #132)", async () => {
  const source = await readFile(new URL("../src/lib/db/repositories/users.ts", import.meta.url), "utf8");

  const createFnStart = source.indexOf("export async function createUnconfirmedUser");
  const createFnEnd = source.indexOf("\n}", createFnStart);
  const createFnSource = source.slice(createFnStart, createFnEnd);
  assert.match(createFnSource, /ON CONFLICT \(email\) DO NOTHING/, "must never overwrite an existing account on a duplicate registration attempt");
  assert.doesNotMatch(createFnSource, /email_confirmed_at/, "omitting the column entirely leaves it NULL - unconfirmed by default");

  const ensureFnStart = source.indexOf("export async function ensureUserByEmail");
  const ensureFnEnd = source.indexOf("\n}", ensureFnStart);
  const ensureFnSource = source.slice(ensureFnStart, ensureFnEnd);
  assert.match(ensureFnSource, /VALUES \(\$1, \$2, now\(\)\)/, "a freshly created Google-identity user is confirmed immediately");
  assert.match(ensureFnSource, /email_confirmed_at = COALESCE\(public\.users\.email_confirmed_at, now\(\)\)/, "COALESCE never un-confirms an account that already got there some other way");
});

test("resetPasswordAndRevokeSessions changes the password hash and regenerates security_stamp in one atomic statement - the two can never be applied separately (issue #132)", async () => {
  const source = await readFile(new URL("../src/lib/db/repositories/users.ts", import.meta.url), "utf8");
  const fnStart = source.indexOf("export async function resetPasswordAndRevokeSessions");
  const fnEnd = source.indexOf("\n}", fnStart);
  const fnSource = source.slice(fnStart, fnEnd);

  assert.match(fnSource, /SET password_hash = \$1, security_stamp = gen_random_uuid\(\)/);
  assert.match(fnSource, /WHERE id = \$2\s*\n\s*RETURNING security_stamp/);
});

test("issueAuthToken invalidates any earlier unused token for the same (user, purpose) before issuing a new one, and only ever persists a hash (issue #132)", async () => {
  const source = await readFile(new URL("../src/lib/auth/tokens.ts", import.meta.url), "utf8");

  assert.match(source, /await invalidateAuthTokensForPurpose\(userId, purpose\);/);
  const issueStart = source.indexOf("export async function issueAuthToken");
  const issueEnd = source.indexOf("\n}", issueStart);
  const issueSource = source.slice(issueStart, issueEnd);
  assert.ok(issueSource.indexOf("invalidateAuthTokensForPurpose") < issueSource.indexOf("randomBytes"), "invalidation must happen before the new token is generated, not after");
  assert.match(source, /createHash\("sha256"\)\.update\(rawToken\)\.digest\("hex"\)/, "the raw token itself must never be persisted, only its hash");

  assert.match(source, /const CONFIRM_TTL_MS = 24 \* 60 \* 60 \* 1_000;/);
  assert.match(source, /const RESET_TTL_MS = 60 \* 60 \* 1_000;/, "reset links live for a much shorter window than confirmation links");
});

test("consumeAuthToken distinguishes not_found/expired/already_used and claims atomically - markAuthTokenUsed only succeeds if the token is still unused (issue #132)", async () => {
  const tokensSource = await readFile(new URL("../src/lib/auth/tokens.ts", import.meta.url), "utf8");
  assert.match(tokensSource, /if \(!record\) return \{ ok: false, reason: "not_found" \};/);
  assert.match(tokensSource, /if \(record\.used_at\) return \{ ok: false, reason: "already_used" \};/);
  assert.match(tokensSource, /if \(new Date\(record\.expires_at\)\.getTime\(\) < Date\.now\(\)\) return \{ ok: false, reason: "expired" \};/);

  const repoSource = await readFile(new URL("../src/lib/db/repositories/auth_tokens.ts", import.meta.url), "utf8");
  assert.match(repoSource, /UPDATE public\.auth_tokens SET used_at = now\(\) WHERE id = \$1 AND used_at IS NULL/, "the claim itself is conditioned on still being unused, so two concurrent consumers of the same link can never both succeed");
});

test("registerAction is enumeration-safe: a new email, an existing unconfirmed email, and an existing confirmed email all return the identical generic success state (issue #132)", async () => {
  const source = await readFile(new URL("../src/lib/auth/register.ts", import.meta.url), "utf8");

  assert.match(source, /const GENERIC_SUCCESS: RegisterState = \{ error: null, submitted: true \};/);
  const actionStart = source.indexOf("export async function registerAction");
  const actionSource = source.slice(actionStart);

  assert.match(actionSource, /if \(created\) \{\s*\n\s*await sendConfirmationEmail\(created\.id, email\);\s*\n\s*return GENERIC_SUCCESS;/, "fresh registration path");
  assert.match(actionSource, /if \(existing && !existing\.email_confirmed_at\) \{\s*\n\s*await sendConfirmationEmail\(existing\.id, email\);\s*\n\s*\} else if \(existing\) \{\s*\n\s*await sendAlreadyRegisteredNotice\(email\);\s*\n\s*\}\s*\n\s*return GENERIC_SUCCESS;/, "existing-account path, either variant, still returns GENERIC_SUCCESS");
  assert.doesNotMatch(actionSource, /return \{[^}]*submitted: true[^}]*\};(?!.*GENERIC_SUCCESS)/s, "no ad-hoc success object other than the shared GENERIC_SUCCESS constant");
});

test("requestPasswordResetAction only emails a password account, never a Google-only account, but returns the same generic response either way (issue #132)", async () => {
  const source = await readFile(new URL("../src/lib/auth/password-reset.ts", import.meta.url), "utf8");
  const fnStart = source.indexOf("export async function requestPasswordResetAction");
  const fnEnd = source.indexOf("\nconst resetSchema", fnStart);
  const fnSource = source.slice(fnStart, fnEnd);

  assert.match(fnSource, /if \(user\?\.password_hash\) \{/, "a Google-only account (null password_hash) must not receive a reset email");
  assert.match(fnSource, /return GENERIC_REQUEST_SUCCESS;/g);
  const returns = fnSource.match(/return GENERIC_REQUEST_SUCCESS;/g) ?? [];
  assert.ok(returns.length >= 3, "malformed input, rate-limited, and both found/not-found branches must all funnel through the same generic return");
});

test("resetPasswordAction revokes prior sessions via resetPasswordAndRevokeSessions (not a plain password update) and immediately signs the user into a fresh session carrying the new stamp (issue #132)", async () => {
  const source = await readFile(new URL("../src/lib/auth/password-reset.ts", import.meta.url), "utf8");
  const fnStart = source.indexOf("export async function resetPasswordAction");
  const fnSource = source.slice(fnStart);

  assert.doesNotMatch(fnSource, /\bupdatePasswordHash\(/, "must use the revoking variant, not the plain password-only update");
  assert.match(fnSource, /const newStamp = await resetPasswordAndRevokeSessions\(consumed\.userId, passwordHash\);/);
  assert.match(fnSource, /securityStamp: newStamp,/, "the new session must carry the freshly regenerated stamp, not the pre-reset one");
});

test("confirmEmailToken confirms and immediately establishes a session (email confirmation doubles as first login) and distinguishes expired/already_used/invalid outcomes (issue #132)", async () => {
  const source = await readFile(new URL("../src/lib/auth/email-confirmation.ts", import.meta.url), "utf8");

  assert.match(source, /if \(result\.reason === "expired"\) return "expired";/);
  assert.match(source, /if \(result\.reason === "already_used"\) return "already_used";/);
  assert.match(source, /await confirmUserEmail\(result\.userId\);/);
  assert.match(source, /await createSession\(\{/);
  assert.match(source, /return "confirmed";/);
});

test("Real session revocation: getGlobalStore compares the session's embedded stamp against the freshly-fetched user row (no extra database round trip) and redirects to the dedicated clearing route on a mismatch (issue #132)", async () => {
  const source = await readFile(new URL("../src/lib/data.ts", import.meta.url), "utf8");

  assert.doesNotMatch(source, /clearSession/, "clearSession must not be called from this Server Component - Next.js only allows cookie mutation from a Server Action or Route Handler (caught live)");
  const fnStart = source.indexOf("export const getGlobalStore");
  const fnSource = source.slice(fnStart, fnStart + 1900);

  assert.match(fnSource, /const \[profile, pgUser\] = await Promise\.all\(\[/, "pgUser must be fetched from the SAME Promise.all already in flight, not a second query");
  assert.match(fnSource, /if \(!pgUser \|\| pgUser\.security_stamp !== session\.sv\) \{/);
  assert.match(fnSource, /redirect\("\/api\/auth\/logout-stale"\);/, "must route through the dedicated Route Handler that can actually clear the cookie - redirect() alone here would leave a stale-but-signature-valid cookie that middleware (no database access) would bounce right back to /dashboard");
});

test("Real session revocation also guards direct Server Action and API calls, not only dashboard navigation (issue #132)", async () => {
  const sessionSource = await readFile(new URL("../src/lib/auth/session.ts", import.meta.url), "utf8");
  assert.match(sessionSource, /export async function getValidatedSession\(\): Promise<SessionPayload \| null>/);
  assert.match(sessionSource, /const user = await getUserById\(session\.uid\);/);
  assert.match(sessionSource, /if \(!user \|\| user\.security_stamp !== session\.sv\) \{/);
  assert.match(sessionSource, /redirect\("\/api\/auth\/logout-stale"\);/, "a stale signed cookie must be cleared, not redirected into a middleware loop");

  const guardedBoundaries = [
    "../src/app/api/google/calendar/auth/route.ts",
    "../src/app/api/google/calendar/callback/route.ts",
    "../src/lib/auth/authorization.ts",
    "../src/lib/auth/current-user.ts",
    "../src/lib/bloc/notes-actions.ts",
    "../src/lib/companies/actions.ts",
    "../src/lib/courses/actions.ts",
    "../src/lib/fp/competency-actions.ts",
    "../src/lib/fp/resource-notes-actions.ts",
    "../src/lib/hackathons/actions.ts",
    "../src/lib/learning/actions.ts",
    "../src/lib/profile/onboarding-actions.ts",
    "../src/lib/work/actions.ts",
  ];
  for (const file of guardedBoundaries) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    assert.match(source, /getValidatedSession\(\)/, `${file} must reject a revoked session before reading or mutating user data`);
    assert.doesNotMatch(source, /\bgetSession\(\)/, `${file} must not use signature-only session verification at an authorization boundary`);
  }
});

test("Owner-reported follow-up (caught live in production): /api/auth/logout-stale actually clears the session cookie - the exact capability a Server Component's render is forbidden from doing itself, which is why getGlobalStore redirects here instead of clearing inline (issue #132)", async () => {
  const source = await readFile(new URL("../src/app/api/auth/logout-stale/route.ts", import.meta.url), "utf8");
  assert.match(source, /export async function GET\(req: Request\)/);
  assert.match(source, /await clearSession\(\);/);
  assert.match(source, /return NextResponse\.redirect\(new URL\("\/login", req\.url\)\);/);
});

test("SessionPayload requires a security stamp (sv) and verifySessionToken rejects a token missing one, and createSession requires callers to supply it explicitly (issue #132)", async () => {
  const tokenSource = await readFile(new URL("../src/lib/auth/session-token.ts", import.meta.url), "utf8");
  assert.match(tokenSource, /sv: string;/);
  assert.match(tokenSource, /if \(!payload\.uid \|\| !payload\.email \|\| !payload\.sv\) return null;/);

  const sessionSource = await readFile(new URL("../src/lib/auth/session.ts", import.meta.url), "utf8");
  assert.match(sessionSource, /export async function createSession\(user: \{ id: string; email: string; name\?: string \| null; securityStamp: string \}\)/);
  assert.match(sessionSource, /sv: user\.securityStamp,/);
});

test("Every existing createSession caller (password login, demo login) was updated to pass securityStamp - none were left calling the old two-argument-shaped signature (issue #132)", async () => {
  const passwordSource = await readFile(new URL("../src/lib/auth/password-login.ts", import.meta.url), "utf8");
  assert.match(passwordSource, /securityStamp: authenticatedUser\.security_stamp,/);
  assert.match(passwordSource, /if \(!authenticatedUser\.email_confirmed_at\) \{\s*\n\s*return \{ error: "email_not_confirmed" \};\s*\n\s*\}/, "an unconfirmed account must not be able to log in with the right password");

  const demoSource = await readFile(new URL("../src/lib/auth/demo-login.ts", import.meta.url), "utf8");
  assert.match(demoSource, /securityStamp: user\.security_stamp,/);
});

test("Calendar consent (src/app/api/google/calendar/*) now requires an existing AL-LÍO session and no longer creates or links an account - identity creation is the separate /api/auth/google/* flow's job (issue #132)", async () => {
  const authRoute = await readFile(new URL("../src/app/api/google/calendar/auth/route.ts", import.meta.url), "utf8");
  assert.match(authRoute, /const session = await getValidatedSession\(\);\s*\n\s*if \(!session\) \{/);

  const callbackRoute = await readFile(new URL("../src/app/api/google/calendar/callback/route.ts", import.meta.url), "utf8");
  assert.match(callbackRoute, /const session = await getValidatedSession\(\);\s*\n\s*if \(!session\) \{/);
  assert.doesNotMatch(callbackRoute, /ensureUserByEmail/, "the callback must not create/find a user by email any more");
  assert.doesNotMatch(callbackRoute, /createSession/, "the callback must not create a session - one must already exist to reach here");
  assert.doesNotMatch(callbackRoute, /upsertProfile/, "the placeholder 'Usuario AL-LIO'/'Granada' profile hack is gone now that this path never provisions an account");
});

test("The new Google identity sign-in flow (src/lib/google/identity.ts) requests only openid/email/profile, uses PKCE, and keeps its own cookies entirely separate from Calendar's (issue #132)", async () => {
  const source = await readFile(new URL("../src/lib/google/identity.ts", import.meta.url), "utf8");

  assert.match(source, /const SCOPES = \["openid", "email", "profile"\];/, "no calendar scope in the login/identity consent screen");
  assert.match(source, /generateCodeVerifierAsync\(\);/);
  assert.match(source, /code_challenge: codeChallenge,/);
  assert.match(source, /code_challenge_method: CodeChallengeMethod\.S256,/);
  assert.match(source, /getToken\(\{ code, codeVerifier \}\)/);

  for (const cookieName of ["d1os_google_identity_state", "d1os_google_identity_verifier", "d1os_google_identity_return"]) {
    assert.match(source, new RegExp(cookieName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${cookieName} must be distinct from Calendar's d1os_google_calendar_* cookies so the two flows can never cross-contaminate state`);
  }

  assert.match(source, /if \(!userInfo\.data\.id \|\| !userInfo\.data\.email \|\| userInfo\.data\.verified_email !== true\) \{\s*\n\s*return null;/, "only an explicitly verified Google email may resolve to an identity");
});

test("resolveOrProvisionGoogleUser links a verified Google identity to an existing password account by email instead of creating a duplicate, and only after Google itself vouches for the email (issue #132)", async () => {
  const source = await readFile(new URL("../src/lib/auth/google-signin.ts", import.meta.url), "utf8");

  assert.match(source, /const linked = await findExternalIdentity\("google", identity\.providerUserId\);/);
  assert.match(source, /const user = await getUserById\(linked\.user_id\);/, "an existing link must resolve through its immutable user_id foreign key, never a copied email");
  assert.match(source, /const existingByEmail = await getUserByEmail\(identity\.email\.toLowerCase\(\)\);/);
  assert.match(source, /const user = existingByEmail \?\? \(await ensureUserByEmail\(identity\.email, identity\.displayName\)\);/, "an existing account by email is reused, never duplicated");
  assert.match(source, /await linkExternalIdentity\(\{/);
});

test("Owner-reported follow-up (caught live): resolveOrProvisionGoogleUser confirms the email on every path, not just fresh creation - linking to a password account that registered but never confirmed must not leave it permanently unable to log in with its own password (issue #132)", async () => {
  const source = await readFile(new URL("../src/lib/auth/google-signin.ts", import.meta.url), "utf8");
  const confirmCalls = source.match(/await confirmUserEmail\(user\.id\);/g) ?? [];
  assert.equal(confirmCalls.length, 2, "both the already-linked fast path and the resolve-or-create path must confirm - a password account that registered but never confirmed, then signed in with Google, was left permanently unable to log in with its own password otherwise");
});

test("Owner-reported follow-up (caught live in production): /confirmar is a Route Handler, not a page - Next.js only allows setting cookies (session creation) from a Server Action or Route Handler, never a Server Component's render, and the old page-based /confirmar crashed with exactly that error on a real click (issue #132)", async () => {
  const routeSource = await readFile(new URL("../src/app/(auth)/confirmar/route.ts", import.meta.url), "utf8");
  assert.match(routeSource, /export async function GET\(req: Request\)/);
  assert.match(routeSource, /const result = await confirmEmailToken\(token\);/);
  assert.match(routeSource, /return NextResponse\.redirect\(new URL\("\/dashboard", baseUrl\)\);/, "success lands the visitor straight in the app - no intermediate page, matching how every other confirmation flow like this works");
  assert.match(routeSource, /return NextResponse\.redirect\(new URL\(`\/login\?error=confirm_\$\{result\}`, baseUrl\)\);/, "failure reuses the login page's existing error banner instead of a bespoke error page");

  const oldPageExists = await readFile(new URL("../src/app/(auth)/confirmar/page.tsx", import.meta.url), "utf8").then(() => true).catch(() => false);
  assert.equal(oldPageExists, false, "the broken Server Component page must be fully removed, not left alongside the route handler");

  const loginSource = await readFile(new URL("../src/components/auth/login-form.tsx", import.meta.url), "utf8");
  for (const code of ["confirm_invalid", "confirm_expired", "confirm_already_used"]) {
    assert.match(loginSource, new RegExp(`${code}: "`), `${code} must have Spanish copy in the login page's error dictionary`);
  }
});

test("GoogleLoginButton on the login page points at the new minimal-scope identity route, not the Calendar OAuth route (issue #132)", async () => {
  const source = await readFile(new URL("../src/components/auth/google-login-button.tsx", import.meta.url), "utf8");
  assert.match(source, /href="\/api\/auth\/google\/start\?next=\/dashboard"/);
  assert.doesNotMatch(source, /\/api\/google\/calendar\/auth/, "the login button must never request Calendar scope");
});

test("login-rate-limit.ts is backed by the shared rate_limit_buckets table, not an in-process Map - a bucket_key is always a digest, never a raw email or IP (issue #132)", async () => {
  const source = await readFile(new URL("../src/lib/auth/login-rate-limit.ts", import.meta.url), "utf8");

  assert.doesNotMatch(source, /globalThis/, "the old in-process Map storage must be fully gone, not left as an unused fallback");
  assert.doesNotMatch(source, /new Map\(/);
  assert.match(source, /INSERT INTO public\.rate_limit_buckets/);
  assert.match(source, /const key = digest\(`\$\{scope\}:\$\{address\}:\$\{identity\.trim\(\)\.toLowerCase\(\)\}`\);/);
  assert.match(source, /createHmac\("sha256", secret\)/, "bucket digests must be keyed so a database leak cannot be brute-forced as raw email/IP hashes");

  for (const scope of ["register", "email_confirm_resend", "password_reset_request", "password_reset_consume"]) {
    assert.match(source, new RegExp(`"${scope}"`), `${scope} must be a recognized rate-limit scope for the new endpoints`);
  }
});

test("The atomic rate-limit UPSERT resets the counter on an expired window and increments it otherwise, in one statement - no read-then-write race between concurrent requests (issue #132)", async () => {
  const source = await readFile(new URL("../src/lib/auth/login-rate-limit.ts", import.meta.url), "utf8");
  assert.match(source, /ON CONFLICT \(bucket_key\) DO UPDATE SET/);
  assert.match(source, /count = CASE WHEN public\.rate_limit_buckets\.reset_at <= now\(\) THEN 1 ELSE public\.rate_limit_buckets\.count \+ 1 END/);
  assert.match(source, /if \(row\.count > limit\) \{/);
});

test("/recuperar redirects an already-authenticated visitor away, matching /login and /register (issue #132)", async () => {
  const source = await readFile(new URL("../src/middleware.ts", import.meta.url), "utf8");
  assert.match(source, /const authPaths = \["\/login", "\/register", "\/recuperar"\];/);
  assert.match(source, /"\/recuperar",\s*\n\s*\],\s*\n\};/, "must also be in the middleware matcher, or the authPaths check above would never even run for it");
});

test("Runtime env validation enforces RESEND_API_KEY/RESEND_FROM_EMAIL together and in production, and validates GOOGLE_IDENTITY_REDIRECT_URI the same way GOOGLE_REDIRECT_URI already was (issue #132)", async () => {
  const source = await readFile(new URL("../scripts/validate-runtime-env.mjs", import.meta.url), "utf8");

  assert.match(source, /const resendValues = \[process\.env\.RESEND_API_KEY, process\.env\.RESEND_FROM_EMAIL\];/);
  assert.match(source, /if \(production && configuredResendValues !== resendValues\.length\) \{/);
  assert.match(source, /googleIdentityRedirect\.pathname\.endsWith\("\/api\/auth\/google\/callback"\)/);
});

test("Development startup loads Next.js env files and validates auth secrets before starting the server", async () => {
  const validatorSource = await readFile(new URL("../scripts/validate-runtime-env.mjs", import.meta.url), "utf8");
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.match(validatorSource, /import nextEnv from "@next\/env";/);
  assert.match(validatorSource, /const \{ loadEnvConfig \} = nextEnv;/);
  assert.match(validatorSource, /loadEnvConfig\(process\.cwd\(\), process\.env\.NODE_ENV !== "production"\);/);
  assert.match(validatorSource, /const baseUrl = parseUrl\("BASE_URL", production\);/);
  assert.match(validatorSource, /requiredSecret\("AL_LIO_RADAR_WEBHOOK_SECRET", 32, production\);/);
  assert.match(packageJson.scripts["verify:startup"], /^npm run validate:runtime && /);
  assert.equal(packageJson.devDependencies["@next/env"], "15.5.23");
});

test("The review event seed is explicit, idempotent and restricted to local demo profiles", async () => {
  const source = await readFile(new URL("../scripts/seed-local-review-event.mjs", import.meta.url), "utf8");

  assert.match(source, /AL_LIO_SEED_LOCAL_REVIEW_EVENT/);
  assert.match(source, /\["localhost", "127\.0\.0\.1", "::1"\]\.includes\(hostname\)/);
  assert.match(source, /WHERE id = ANY\(\$1::uuid\[\]\) AND role = 'user'/);
  assert.match(source, /ON CONFLICT \(user_id, id_slug\) DO UPDATE SET/);
  assert.match(source, /await client\.query\("BEGIN"\);/);
  assert.match(source, /await client\.query\("COMMIT"\);/);
  assert.doesNotMatch(source, /DELETE FROM public\.hackathons/);
});

test(".env.example documents every new production-authentication variable (issue #132)", async () => {
  const source = await readFile(new URL("../.env.example", import.meta.url), "utf8");
  for (const key of ["GOOGLE_IDENTITY_REDIRECT_URI", "RESEND_API_KEY", "RESEND_FROM_EMAIL"]) {
    assert.match(source, new RegExp(`^${key}=`, "m"), `${key} must be documented`);
  }
});

test("Email templates never interpolate raw user-supplied HTML - the recipient email is the only dynamic value and it is always escaped, and every template ships a plain-text alternative (issue #132)", async () => {
  const source = await readFile(new URL("../src/lib/email/templates.ts", import.meta.url), "utf8");
  assert.match(source, /function escapeHtml\(value: string\): string \{/);
  const escapeCalls = source.match(/const safeEmail = escapeHtml\(email\);/g) ?? [];
  assert.equal(escapeCalls.length, 2, "both the confirmation and reset templates must escape the email they embed");
  const htmlUsages = source.match(/\$\{safeEmail\}/g) ?? [];
  assert.equal(htmlUsages.length, 2, "the HTML body must render the escaped variable, not the raw email, in both templates");

  const textFields = source.match(/text: `/g) ?? [];
  assert.equal(textFields.length, 3, "confirmEmailTemplate, passwordResetTemplate and alreadyRegisteredTemplate must each return a plain-text alternative - a missing text/plain part is itself a spam signal");
});

test("sendTransactionalEmail never throws a provider error up to a caller and never logs the email body (which carries a one-time link) (issue #132)", async () => {
  const source = await readFile(new URL("../src/lib/email/send.ts", import.meta.url), "utf8");
  assert.match(source, /return \{ ok: false \};/);
  assert.doesNotMatch(source, /console\.(log|error)\([^)]*params\.html/, "the email body must never be logged");
  assert.doesNotMatch(source, /console\.(log|error)\([^)]*result\.error\)/, "logs the error's name/category, not the raw provider error object which could carry request detail");
});

test("Owner-reported follow-up: sendTransactionalEmail requires a text alternative and forwards it to Resend, and every template embeds the app's real public logo via an absolute production URL, not a bare text wordmark (issue #132)", async () => {
  const sendSource = await readFile(new URL("../src/lib/email/send.ts", import.meta.url), "utf8");
  assert.match(sendSource, /text: string;/, "text must be a required field on the params type, not optional - every caller must supply one");
  assert.match(sendSource, /text: params\.text,/, "must actually be forwarded to resend.emails.send, not just accepted and dropped");

  const templatesSource = await readFile(new URL("../src/lib/email/templates.ts", import.meta.url), "utf8");
  assert.match(templatesSource, /import \{ absolutePublicAssetUrl \} from "@\/lib\/auth\/app-url";/);
  assert.match(templatesSource, /const logoUrl = absolutePublicAssetUrl\("\/assets\/al_lio_logo_horizontal_transparent\.png"\);/);

  const appUrlSource = await readFile(new URL("../src/lib/auth/app-url.ts", import.meta.url), "utf8");
  assert.match(appUrlSource, /const base = process\.env\.PUBLIC_ASSET_BASE_URL \?\? process\.env\.BASE_URL \?\? "http:\/\/localhost:3000";/, "must fall back to BASE_URL when unset, so production needs no extra config for this to work");
  assert.match(templatesSource, /<img src="\$\{logoUrl\}" alt="AL-LÍO"/);

  for (const templateFn of ["confirmEmailTemplate", "passwordResetTemplate", "alreadyRegisteredTemplate"]) {
    assert.match(templatesSource, new RegExp(`export function ${templateFn}\\(`), `${templateFn} must exist and be exported`);
  }
});
