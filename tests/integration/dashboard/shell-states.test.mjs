// Source-level assertion rationale: issue #363 requires the Dashboard shell to
// report loading, empty and partial-failure states honestly, through the #362
// semantic contract rather than a local palette, and without destroying data.
// These states need a Next.js render plus a store to exercise; reading the
// boundary files and the Dashboard components as text is the executable
// boundary (tests/README.md taxonomy options 5 and 6).

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

const FAILURE_FILES = [
  "../../../src/components/dashboard/dashboard-view.tsx",
  "../../../src/components/dashboard/dashboard-calendar.tsx",
  "../../../src/components/dashboard/dashboard-progress.tsx",
  "../../../src/components/dashboard/dashboard-todo.tsx",
  "../../../src/app/(dashboard)/error.tsx",
];

test("Dashboard failure and loading states consume the #362 semantic tokens, not a local palette (issue #363)", async () => {
  const sources = await Promise.all(FAILURE_FILES.map(read));

  for (const [index, source] of sources.entries()) {
    assert.doesNotMatch(source, /\b(amber|emerald|rose|red|yellow)-\d{2,3}\b/, `${FAILURE_FILES[index]} still uses a raw Tailwind status palette`);
  }
  // The partial-failure banner and the page error boundary read the warning family.
  const [view, , , , errorBoundary] = sources;
  assert.match(view, /var\(--al-warning-surface\)/);
  assert.match(view, /var\(--al-warning-text\)/);
  assert.match(errorBoundary, /var\(--al-warning-surface\)/);
  assert.match(errorBoundary, /var\(--al-text-strong\)/);
  assert.match(errorBoundary, /var\(--al-text-muted\)/);

  // The removed file re-declared --primary / --ring at a divergent value; the
  // Dashboard now inherits the one :root contract.
  await assert.rejects(read("../../../src/components/dashboard/dashboard-surface.ts"), /ENOENT/);
  for (const file of ["../../../src/components/dashboard/dashboard-todo.tsx", "../../../src/components/dashboard/dashboard-calendar.tsx"]) {
    const source = await read(file);
    assert.doesNotMatch(source, /dashboardLightSurface|--primary"|--ring"/, `${file} must not pin a local token palette`);
  }

  const loading = await read("../../../src/app/(dashboard)/loading.tsx");
  assert.match(loading, /role="status"/, "the skeleton must announce itself as a loading status");
  assert.match(loading, /var\(--al-state-neutral-surface\)/, "the skeleton must use a neutral surface token");
  assert.doesNotMatch(loading, /#[0-9a-fA-F]{3,8}\b/, "the skeleton must not hardcode a placeholder colour");
});

test("Dashboard failure states are non-destructive and name what failed without faking data (issue #363)", async () => {
  const [view, calendar, progress, todo, errorBoundary] = await Promise.all(FAILURE_FILES.map(read));

  // The top banner is an alert, names the affected sections and offers a
  // non-mutating retry (router.refresh, not a write).
  assert.match(view, /role="alert"/);
  assert.match(view, /loadIssues\.map\(\(issue\) => issueLabels\[issue\]\)\.join\(", "\)/, "the banner must list which sections failed");
  assert.match(view, /El resto de la información sigue disponible/);
  assert.match(view, /onClick=\{\(\) => router\.refresh\(\)\}/);
  assert.doesNotMatch(view, /addTask|updateTask|deleteTask|actions\./, "the failure banner must not call a mutation");

  // Each per-card failure state says the saved data is untouched, and never
  // renders a zero/placeholder value as if it were real.
  assert.match(calendar, /El calendario puede estar incompleto/);
  assert.match(progress, /Tus datos guardados no se han modificado/);
  assert.match(progress, /if \(!loadFailed\) return null;/, "an absent-but-not-failed roadmap renders nothing, not an empty shell");
  assert.match(todo, /Tus tareas siguen guardadas/);
  assert.match(errorBoundary, /Tus datos no se han modificado/);
  assert.match(errorBoundary, /onClick=\{reset\}/, "the page error boundary retries via reset(), never a data write");

  // The empty (no-data) state is distinct from the failure state.
  assert.match(todo, /loadFailed \? \([\s\S]*?\) : latestTasks\.length \? [\s\S]*? : \(/, "empty and failed are separate branches");
  assert.match(todo, /Empieza con una tarea/, "the genuine empty state invites a first task rather than mimicking data");
});
