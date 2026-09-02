// Executable coverage for the pure learning player/progress/note state split
// from learning-player.tsx and aprende/[slug]/page.tsx in issue #368.

import assert from "node:assert/strict";
import test from "node:test";

import {
  PROGRESS_SAVE_THRESHOLD_SECONDS,
  parseLearningSeekParam,
  resolveInitialSeekSeconds,
  shouldSaveProgress,
  insertNoteSorted,
} from "../../../src/features/learning/domain/player-progress.ts";

test("parseLearningSeekParam accepts a bounded non-negative integer and rejects everything else", () => {
  assert.equal(parseLearningSeekParam("90"), 90);
  assert.equal(parseLearningSeekParam("0"), 0);
  assert.equal(parseLearningSeekParam(["120", "ignored"]), 120);
  assert.equal(parseLearningSeekParam("172800"), 172800); // exactly 48h
  assert.equal(parseLearningSeekParam(undefined), null);
  assert.equal(parseLearningSeekParam(""), null);
  assert.equal(parseLearningSeekParam("-5"), null);
  assert.equal(parseLearningSeekParam("1.5"), null);
  assert.equal(parseLearningSeekParam("abc"), null);
  assert.equal(parseLearningSeekParam("172801"), null); // past the 48h cap
});

test("resolveInitialSeekSeconds lets an explicit deep-link seek win, including zero", () => {
  assert.equal(resolveInitialSeekSeconds(300, { status: "started", last_position_seconds: 120 }), 300);
  assert.equal(resolveInitialSeekSeconds(0, { status: "started", last_position_seconds: 120 }), 0);
});

test("resolveInitialSeekSeconds resumes only for an unfinished resource past the first few seconds", () => {
  assert.equal(resolveInitialSeekSeconds(null, { status: "completed", last_position_seconds: 400 }), 0);
  assert.equal(resolveInitialSeekSeconds(null, { status: "started", last_position_seconds: 3 }), 0);
  assert.equal(resolveInitialSeekSeconds(null, { status: "started", last_position_seconds: 5 }), 0);
  assert.equal(resolveInitialSeekSeconds(null, { status: "started", last_position_seconds: 120 }), 120);
});

test("shouldSaveProgress throttles until the position advances the threshold, unless forced", () => {
  assert.equal(PROGRESS_SAVE_THRESHOLD_SECONDS, 15);
  assert.equal(shouldSaveProgress(30, 10, false), true);
  assert.equal(shouldSaveProgress(25, 10, false), true); // exactly the threshold
  assert.equal(shouldSaveProgress(20, 10, false), false);
  assert.equal(shouldSaveProgress(20, 10, true), true);
});

test("insertNoteSorted returns a new list ordered by video timestamp", () => {
  const notes = [{ timestamp_seconds: 10, body: "a" }, { timestamp_seconds: 30, body: "c" }];
  const next = insertNoteSorted(notes, { timestamp_seconds: 20, body: "b" });
  assert.deepEqual(next.map((n) => n.timestamp_seconds), [10, 20, 30]);
  assert.equal(notes.length, 2, "the source list is not mutated");
});
