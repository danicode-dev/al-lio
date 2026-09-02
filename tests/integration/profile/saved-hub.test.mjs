// Migrated mechanically from tests/security-boundaries.test.mjs for issue #274.
// Source-level assertions temporarily protect a Next.js, browser, or database boundary that the plain Node runner cannot execute; replace them when the corresponding integration harness exists.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { isSafeHttpUrl } from "../../../src/lib/fp/event-cta.ts";

test("Perfil renders the Saved hub, wrapped in a real error boundary so a rendering bug there cannot take down the profile edit form above it (issue #136)", async () => {
  const profileFormSource = await readFile(new URL("../../../src/features/account/client/profile-form.tsx", import.meta.url), "utf8");
  assert.match(profileFormSource, /import \{ SavedHub \} from "\.\/saved-hub";/);
  assert.match(profileFormSource, /<SavedHub \/>/);
  const savedHubIdx = profileFormSource.indexOf("<SavedHub />");
  const formIdx = profileFormSource.indexOf("<form action={formAction}");
  assert.ok(formIdx > -1 && savedHubIdx > formIdx, "the edit form must render before/outside SavedHub, not nested inside it");

  const source = await readFile(new URL("../../../src/features/account/client/saved-hub.tsx", import.meta.url), "utf8");
  assert.match(source, /class SavedHubBoundary extends Component/, "must be a real React error boundary (class component), not a try/catch that can't catch render errors");
  assert.match(source, /static getDerivedStateFromError\(\)/);
  assert.match(source, /export function SavedHub\(\) \{\s*return \(\s*<SavedHubBoundary>\s*<SavedHubContent \/>\s*<\/SavedHubBoundary>/);
});

test("The Saved hub derives every section from the same live store the rest of the app uses - no new fetch, no parallel storage, no reimplemented merge/dedupe logic (issue #136)", async () => {
  const source = await readFile(new URL("../../../src/features/account/client/saved-hub.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /fetch\(|useEffect\(/, "must not introduce a separate data fetch - everything comes from the already-loaded, session-scoped application store");
  assert.match(source, /const \{ store \} = useApplicationStore\(\);/);
  assert.match(source, /const actions = \{ \.\.\.useCourseActions\(\), \.\.\.useEventActions\(\), \.\.\.useLearningActions\(\), \.\.\.useWorkActions\(\) \};/);
  assert.match(source, /const savedCompanies = useMemo\(\(\) => store\.companies\.filter\(\(c\) => c\.is_favorite\), \[store\.companies\]\);/);
  assert.match(source, /getDisplayCourses\(store\.courses, store\.techOpportunities, store\.fpContent\)\.filter\(\(c\) => c\.is_favorite\)/, "courses must reuse the exact same merge function Cursos itself uses, not a second parallel implementation");
  assert.match(source, /getDisplayHackathons\(store\.hackathons, store\.techOpportunities, store\.fpContent\)\.filter\(\(h\) => h\.is_favorite\)/, "events must reuse the exact same merge function Eventos y retos itself uses");
  assert.match(source, /from "@\/features\/courses"/, "getDisplayCourses/getDisplayHackathons must be imported, not redefined");
});

test("Unsaving from the hub calls the exact same dispatchers as the origin modules, so all surfaces stay in sync with the same optimistic-update/rollback behavior (issue #136)", async () => {
  const source = await readFile(new URL("../../../src/features/account/client/saved-hub.tsx", import.meta.url), "utf8");
  assert.match(source, /onUnsave=\{\(\) => actions\.toggleCompanyFavorite\(company\.id\)\}/, "companies must reuse the exact same store action Trabajo uses");
  assert.match(source, /onUnsave=\{canToggleCourseFavorite\(course\) \? \(\) => toggleCourseFavoriteFor\(course, actions\) : undefined\}/, "courses must reuse the exact same dispatcher Cursos uses, including its fp_content_items/tech_opportunities branching");
  assert.match(source, /onUnsave=\{canToggleHackathonFavorite\(hackathon\) \? \(\) => toggleHackathonFavoriteFor\(hackathon, actions\) : undefined\}/, "events must reuse the exact same dispatcher Eventos y retos uses");
});

test("Each saved item links to its internal detail when one exists (events -> /hackathons/[id]) or its filtered module otherwise (companies/courses), with the official URL as a validated secondary action (issue #136)", async () => {
  const source = await readFile(new URL("../../../src/features/account/client/saved-hub.tsx", import.meta.url), "utf8");
  assert.match(source, /primaryHref=\{`\/hackathons\/\$\{encodeURIComponent\(hackathon\.id\)\}`\}/, "events must link to the real internal detail page from issue #135");
  assert.match(source, /primaryHref=\{`\/courses\/\$\{encodeURIComponent\(course\.id\)\}`\}/, "courses must link to their own real internal detail page too (owner-reported follow-up to #135)");
  assert.match(source, /primaryHref="\/work"/, "companies still have no per-item internal detail, so they fall back to the filtered module");
  const secondaryHrefSites = source.match(/secondaryHref=\{isSafeHttpUrl\(/g) ?? [];
  assert.equal(secondaryHrefSites.length, 3, "every one of the 3 saved types must validate its external URL through isSafeHttpUrl before offering it");
});

test("The hub shows one overall empty state when nothing is saved anywhere, and a distinct per-section hint when only that module has nothing saved yet (issue #136)", async () => {
  const source = await readFile(new URL("../../../src/features/account/client/saved-hub.tsx", import.meta.url), "utf8");
  assert.match(source, /const totalSaved = savedCompanies\.length \+ savedCourses\.length \+ savedHackathons\.length;/);
  assert.match(source, /\{totalSaved === 0 \? \(/);
  assert.match(source, /Todavía no has guardado nada/);

  const sectionStart = source.indexOf("function SavedSection(");
  const sectionSource = source.slice(sectionStart, source.indexOf("function SavedRow("));
  assert.match(sectionSource, /\{count === 0 \? \(\s*<p[^>]*>\{emptyHint\}<\/p>/, "an individually-empty section must show its own hint, distinct from the page-level empty state");
});

test("The hub caps each section's preview and offers Ver todos for longer collections, instead of rendering every saved item into the profile form (issue #136)", async () => {
  const source = await readFile(new URL("../../../src/features/account/client/saved-hub.tsx", import.meta.url), "utf8");
  assert.match(source, /const VISIBLE_PER_SECTION = 4;/);
  assert.match(source, /\.slice\(0, VISIBLE_PER_SECTION\)/g);
  const sliceCalls = source.match(/\.slice\(0, VISIBLE_PER_SECTION\)/g) ?? [];
  assert.equal(sliceCalls.length, 3, "all three sections (companies, courses, events) must be capped");
  assert.match(source, /const hasMore = count > VISIBLE_PER_SECTION;/);
  assert.match(source, /\{hasMore \? `Ver todos \(\$\{count\}\)` : "Ver módulo"\}/);
});

test("A second user cannot reach another user's saved items through the hub - it reads only the current session's already-authorized store, introducing no new query surface (issue #136)", async () => {
  const source = await readFile(new URL("../../../src/features/account/client/saved-hub.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /from "@\/lib\/db\/repositories/, "the hub must not query the database directly - store.companies/courses/hackathons are already session-scoped by the layout's own getGlobalStore() call");
  assert.doesNotMatch(source, /userId|user_id/, "no user id of any kind should appear here - there is nothing to scope, since the input data is already scoped");
});
