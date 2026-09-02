// Source-level assertion rationale: issue #364 polishes the visible Tasks
// states - token migration, honest create/edit failure handling, loading and
// empty states. TasksView is a client component driven by the page-scoped
// store and useActionState; the plain Node runner cannot render it, so these
// assertions pin the presentation and mutation-state wiring against the
// source. The data serializer and the store contract stay covered by the
// accompanying unit test and page-scoped-loading test; the create/edit/persist
// journey stays covered by tests/e2e/tasks.e2e.ts - not duplicated here.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Tasks presentation is on the #362 semantic token contract, not a private palette (issue #364)", async () => {
  const [view, loading] = await Promise.all([
    read("../../../src/features/tasks/client/tasks-view.tsx"),
    read("../../../src/features/tasks/tasks-loading.tsx"),
  ]);

  for (const [name, src] of [["tasks-view", view], ["tasks-loading", loading]]) {
    assert.doesNotMatch(src, /\b(bg|text|border|ring)-(red|sky|amber|emerald|green|rose|blue|slate)-\d{2,3}\b/, `${name} still uses a raw Tailwind palette`);
    assert.doesNotMatch(src, /(bg|text|border)-\[#[0-9a-fA-F]{3,8}\]|ring-\[#/, `${name} still hardcodes a hex colour class`);
  }

  // Category chips and the summary tiles read the feedback / lifecycle families.
  assert.match(view, /diario:.*--al-info-surface.*--al-info-text/s);
  assert.match(view, /urgente:.*--al-warning-surface.*--al-warning-text/s);
  assert.match(view, /semanal:.*--al-success-surface.*--al-success-text/s);

  // Loading skeleton: neutral token + announced.
  assert.match(loading, /role="status"/);
  assert.match(loading, /bg-\[var\(--al-state-neutral-surface\)\]/);
  assert.doesNotMatch(loading, /#[0-9a-fA-F]{3,8}/);

  // Disabled and focus go through the canonical tokens.
  assert.doesNotMatch(view, /disabled:opacity-50\b/);
  assert.match(view, /disabled:opacity-\[var\(--al-disabled-opacity\)\]/);
  assert.match(view, /focus-visible:ring-ring/);
});

test("the create composer keeps the student's input when the task cannot be saved, and blocks a double submit (issue #364)", async () => {
  const view = await read("../../../src/features/tasks/client/tasks-view.tsx");

  const submitStart = view.indexOf("async function submit(event: FormEvent<HTMLFormElement>)");
  const submitBody = view.slice(submitStart, view.indexOf("\n  }", submitStart));

  assert.match(submitBody, /if \(!cleanTitle \|\| composerSubmitting\) return;/, "a second submit while one is in flight is ignored");
  assert.match(submitBody, /setComposerSubmitting\(true\);/);
  // The field resets and the close only run AFTER the await resolves - a
  // rejected create leaves every value in place.
  assert.ok(
    submitBody.indexOf("await actions.addTask(") < submitBody.indexOf('setTitle("")'),
    "the form must not be cleared before the task is persisted",
  );
  assert.match(submitBody, /\} catch \{[\s\S]*?\} finally \{\s*\n\s*setComposerSubmitting\(false\);/, "the submitting guard is always released; the catch leaves the form untouched");
  assert.match(submitBody, /composerToggleRef\.current\?\.focus\(\);/, "focus returns to the Nueva tarea toggle after a successful create");

  assert.match(view, /disabled=\{!title\.trim\(\) \|\| composerSubmitting\}/, "the Guardar button is disabled while the create is in flight");
});

test("the edit dialog waits for persistence, keeps itself open on failure, and reports through the shared alert (issue #364)", async () => {
  const view = await read("../../../src/features/tasks/client/tasks-view.tsx");

  assert.match(view, /import \{ FormAlert \} from "@\/components\/ui\/form-alert"/);
  assert.match(view, /<FormAlert message=\{error \|\| null\} \/>/, "the dialog error is the shared FormAlert, not a bespoke red box");
  assert.doesNotMatch(view, /role="alert" className="rounded-xl bg-red/, "the old inline red alert is gone");

  const dialogSubmit = view.slice(view.indexOf("async function submit(event: FormEvent<HTMLFormElement>) {", view.indexOf("function TaskDialog(")));
  assert.match(dialogSubmit, /if \(!cleanTitle \|\| saving\) return;/, "a second dialog submit while saving is ignored");
  assert.match(dialogSubmit, /catch \{[\s\S]*?setError\([\s\S]*?setSaving\(false\);/, "a failed save re-enables the form and keeps the dialog mounted with the input intact");
  // Success closes the dialog; the mount/unmount effect restores focus to the
  // control that opened it.
  assert.match(view, /await actions\.updateTask\(dialogTask\.id, data\);\s+setTaskDialog\(null\);/);
  assert.match(view, /previousActiveElement\?\.focus\(\);/, "closing the dialog returns focus to the row control that opened it");
});

test("loading, load-failure, empty and no-filtered-results are four distinct states (issue #364)", async () => {
  const view = await read("../../../src/features/tasks/client/tasks-view.tsx");

  // A page-scoped load failure is its own branch with non-destructive copy,
  // separate from a genuinely empty list.
  assert.match(view, /store\.loadIssues\?\.includes\("tasks"\) \? \(\s*\n\s*<EmptyState title="No se pudieron cargar tus tareas" description="Tus datos siguen guardados\./);

  // The empty copy is filter-specific, so "no pending" never reads like "no
  // tasks at all".
  for (const key of ["pending", "completed", "all"]) {
    assert.match(view, new RegExp(`${key}: \\{ title: "[^"]+", description: "[^"]+" \\}`), `emptyStateCopy.${key} is missing`);
  }
  assert.match(view, /No tienes tareas pendientes/);
  assert.match(view, /Todavía no has completado tareas/);
  assert.match(view, /Todavía no tienes tareas/);
});
