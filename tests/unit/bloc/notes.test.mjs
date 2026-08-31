// Migrated mechanically from tests/security-boundaries.test.mjs for issue #274.

import assert from "node:assert/strict";

import test from "node:test";

import { toIsoTimestamp } from "../../../src/lib/bloc/timestamps.ts";
import { compareByRecentFirst, sortByRecentFirst } from "../../../src/lib/bloc/notes-sort.ts";
import { buildNoteExportHtml } from "../../../src/lib/bloc/note-export.ts";

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
