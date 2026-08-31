// Migrated mechanically from tests/security-boundaries.test.mjs for issue #274.
// Source-level assertions temporarily protect a Next.js, browser, or database boundary that the plain Node runner cannot execute; replace them when the corresponding integration harness exists.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Task editing preserves critical priority and optional due time", async () => {
  const source = await readFile(new URL("../../../src/features/tasks/client/tasks-view.tsx", import.meta.url), "utf8");

  assert.match(source, /useState<Task\["priority"\]>\(task\.priority\)/);
  assert.match(source, /<option value="critica">Prioridad crítica<\/option>/);
  assert.match(source, /task\.due_at\?\.includes\("T"\)/);
  assert.match(source, /type="time"/);
  assert.match(source, /`\$\{dueDate\}\$\{dueTime \? `T\$\{dueTime\}` : ""\}`/);
  assert.doesNotMatch(source, /task\.priority === "critica" \? "alta"/);
});

test("Task edit waits for persistence and keeps the dialog open after failure", async () => {
  const [viewSource, storeSource] = await Promise.all([
    readFile(new URL("../../../src/features/tasks/client/tasks-view.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../../src/features/tasks/client/use-task-actions.ts", import.meta.url), "utf8"),
  ]);

  assert.match(viewSource, /await actions\.updateTask\(dialogTask\.id, data\);\s+setTaskDialog\(null\);/);
  assert.match(viewSource, /No se pudo guardar la tarea/);
  assert.match(viewSource, /\{saving \? "Guardando…" : "Guardar"\}/);

  assert.match(storeSource, /if \(!response\.ok\) throw new Error\(response\.error\)/);
  assert.match(storeSource, /patchById\(current\.tasks, id, previousTask\)/);
  assert.match(storeSource, /throw error;/);
});

test("Task rows open one shared detail/edit dialog and keep the existing edit form reusable", async () => {
  const source = await readFile(new URL("../../../src/features/tasks/client/tasks-view.tsx", import.meta.url), "utf8");

  assert.match(source, /type TaskDialogMode = "view" \| "edit"/);
  assert.match(source, /aria-label=\{`Ver detalles de \$\{task\.title\}`\}/);
  assert.match(source, /onOpen=\{\(\) => setTaskDialog\(\{ taskId: task\.id, mode: "view" \}\)\}/);
  assert.match(source, /onEdit=\{\(\) => setTaskDialog\(\{ taskId: task\.id, mode: "edit" \}\)\}/);
  assert.match(source, /function TaskDialog\(/);
  assert.match(source, /Detalle de la tarea/);
  assert.match(source, /setMode\("edit"\)/);
  assert.match(source, /task\.description \|\| "Sin descripción añadida\."/);
  assert.doesNotMatch(source, /function EditTaskDialog\(/, "view and edit must not drift into separate modal implementations");
});

test("The three task summary tiles are the only status filters, while Nueva tarea stays on the Tu lista heading row", async () => {
  const source = await readFile(new URL("../../../src/features/tasks/client/tasks-view.tsx", import.meta.url), "utf8");

  // The page-specific composer button must never live in the shared top header
  // alongside the global +/calendar/bell cluster.
  const headerStart = source.indexOf("<PageHeader");
  const headerEnd = source.indexOf("/>", source.indexOf('actions={', headerStart)) + 2;
  const headerJsx = source.slice(headerStart, headerEnd);
  assert.doesNotMatch(headerJsx, /Nueva tarea/, "the top PageHeader must not carry the page-specific composer button");
  assert.match(headerJsx, /<StudentHeaderActions \/>/, "the global icon cluster must remain there, same as every other page");

  // List card header: the composer button still shares one row with "Tu lista",
  // but the duplicated Pendientes/Hechas/Todas control row is gone.
  const cardHeaderStart = source.indexOf(">Tu lista</h2>");
  const cardHeaderEnd = source.indexOf("{store.loadIssues", cardHeaderStart);
  const cardHeader = source.slice(cardHeaderStart, cardHeaderEnd);

  assert.match(cardHeader, /setComposerOpen\(\(open\) => !open\)/, "the exact same composer toggle handler must be reused, not reimplemented");
  assert.doesNotMatch(cardHeader, /FilterButton|>Hechas<|>Todas</, "the repeated compact filter row must stay removed");
  assert.match(
    cardHeader,
    /Tu lista<\/h2>[\s\S]*?<\/div>\s*<button type="button" onClick=\{\(\) => setComposerOpen/,
    "the composer button is a direct sibling of the heading block inside one row",
  );

  // Issue #153: the summary tiles (Pendientes/Completadas/Totales) show their
  // full label on mobile - no ellipsis.
  for (const filter of ["pending", "completed", "all"]) {
    assert.match(source, new RegExp(`active=\\{filter === "${filter}"\\}[\\s\\S]*?onClick=\\{\\(\\) => setFilter\\("${filter}"\\)\\}`));
  }
  const summaryCard = source.slice(source.indexOf("function SummaryCard"), source.indexOf("function EmptyState"));
  assert.match(summaryCard, /<button type="button"/);
  assert.match(summaryCard, /aria-pressed=\{active\}/);
  assert.doesNotMatch(summaryCard, /truncate/, "summary tile labels must not be clipped with truncate");
  assert.doesNotMatch(source, /function FilterButton/, "there must be one filter implementation, not two");
});
