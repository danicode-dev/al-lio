// Executable coverage for the pure Bloc note list/filter selection split from
// bloc-notepad.tsx in issue #370.

import assert from "node:assert/strict";
import test from "node:test";

import {
  dropPhantomNote,
  selectTabNotes,
  searchNotes,
  countFavorites,
} from "../../../src/lib/bloc/note-selection.ts";

const note = (over = {}) => ({
  id: "n1",
  title: "Nota",
  contentText: "",
  favorite: false,
  updated_at: "2026-08-01T00:00:00.000Z",
  ...over,
});

test("dropPhantomNote removes only the phantom id and always returns a copy", () => {
  const notes = [note({ id: "a" }), note({ id: "phantom" }), note({ id: "b" })];
  assert.deepEqual(dropPhantomNote(notes, "phantom").map((n) => n.id), ["a", "b"]);

  const passthrough = dropPhantomNote(notes, null);
  assert.deepEqual(passthrough.map((n) => n.id), ["a", "phantom", "b"]);
  assert.notEqual(passthrough, notes, "must not hand back the caller's array");
});

test("selectTabNotes filters favourites, orders Recientes by edit time, and keeps Todas untouched", () => {
  const notes = [
    note({ id: "old-fav", favorite: true, updated_at: "2026-01-01T00:00:00.000Z" }),
    note({ id: "new-plain", favorite: false, updated_at: "2026-09-01T00:00:00.000Z" }),
    note({ id: "mid-fav", favorite: true, updated_at: "2026-05-01T00:00:00.000Z" }),
  ];

  assert.deepEqual(selectTabNotes(notes, "todas").map((n) => n.id), ["old-fav", "new-plain", "mid-fav"]);
  assert.deepEqual(selectTabNotes(notes, "favoritas").map((n) => n.id), ["old-fav", "mid-fav"]);
  // Recientes is purely chronological - a favourited older note still sorts
  // after a newer plain one.
  assert.deepEqual(selectTabNotes(notes, "recientes").map((n) => n.id), ["new-plain", "mid-fav", "old-fav"]);
});

test("searchNotes matches title or body case-insensitively, trims the query, and returns all for an empty one", () => {
  const notes = [
    note({ id: "a", title: "Repaso de bucles", contentText: "for, while" }),
    note({ id: "b", title: "Ideas", contentText: "montar un servidor en casa" }),
    note({ id: "c", title: "Lista de la compra", contentText: "" }),
  ];

  assert.deepEqual(searchNotes(notes, "").map((n) => n.id), ["a", "b", "c"]);
  assert.deepEqual(searchNotes(notes, "   ").map((n) => n.id), ["a", "b", "c"]);
  assert.deepEqual(searchNotes(notes, "BUCLES").map((n) => n.id), ["a"]);
  assert.deepEqual(searchNotes(notes, " servidor ").map((n) => n.id), ["b"]);
  assert.deepEqual(searchNotes(notes, "nada de esto"), []);
});

test("countFavorites counts the favourited notes", () => {
  assert.equal(countFavorites([note({ favorite: true }), note({ favorite: false }), note({ favorite: true })]), 2);
  assert.equal(countFavorites([]), 0);
});
