// Executable coverage for the pure account-surface state extracted from
// src/features/account/client/profile-form.tsx in issue #372.

import assert from "node:assert/strict";
import test from "node:test";

import {
  ACADEMIC_YEAR_OPTIONS,
  buildCycleOptions,
  canSubmitProfileChanges,
  deriveInitials,
  describeProfileSaveState,
  resolveAccountDisplayName,
  resolveProfileErrorCopy,
} from "../../../src/features/account/account-model.ts";

test("resolveProfileErrorCopy maps known keys and falls back for anything else", () => {
  assert.equal(resolveProfileErrorCopy("onboarding_invalid"), "Revisa los datos e inténtalo de nuevo.");
  assert.equal(resolveProfileErrorCopy("onboarding_save_failed"), "No se pudo guardar tu perfil. Inténtalo de nuevo.");
  assert.equal(resolveProfileErrorCopy("something_else"), "No se pudo guardar. Inténtalo de nuevo.");
  assert.equal(resolveProfileErrorCopy(null), "No se pudo guardar. Inténtalo de nuevo.");
});

test("resolveAccountDisplayName prefers the display name, then the email local-part, then a generic label", () => {
  assert.equal(resolveAccountDisplayName({ email: "a@x.com", displayName: "  Ada Lovelace " }), "Ada Lovelace");
  assert.equal(resolveAccountDisplayName({ email: "ada.king@x.com", displayName: null }), "ada.king");
  assert.equal(resolveAccountDisplayName({ email: "", displayName: "   " }), "Estudiante");
});

test("deriveInitials takes up to two uppercase initials", () => {
  assert.equal(deriveInitials("Ada Lovelace"), "AL");
  assert.equal(deriveInitials("ada"), "A");
  assert.equal(deriveInitials("ada lovelace king"), "AL");
});

test("the academic-year options are the two FP course years", () => {
  assert.deepEqual(ACADEMIC_YEAR_OPTIONS.map((option) => option.value), ["1", "2"]);
});

test("buildCycleOptions maps a cycle to its value/label pair", () => {
  assert.deepEqual(
    buildCycleOptions([{ code: "DAW", name: "Desarrollo de Aplicaciones Web" }, { code: "DAM", name: "Desarrollo Multiplataforma" }]),
    [
      { value: "DAW", label: "Desarrollo de Aplicaciones Web" },
      { value: "DAM", label: "Desarrollo Multiplataforma" },
    ],
  );
});

test("canSubmitProfileChanges needs both fields chosen and no save in flight", () => {
  assert.equal(canSubmitProfileChanges({ cycleCode: "DAW", academicYear: "1", isPending: false }), true);
  assert.equal(canSubmitProfileChanges({ cycleCode: "", academicYear: "1", isPending: false }), false);
  assert.equal(canSubmitProfileChanges({ cycleCode: "DAW", academicYear: "", isPending: false }), false);
  assert.equal(canSubmitProfileChanges({ cycleCode: "DAW", academicYear: "1", isPending: true }), false);
});

test("describeProfileSaveState collapses the save to one visible state, with pending winning", () => {
  const savedAt = Date.parse("2026-09-02T10:00:00.000Z");
  assert.equal(describeProfileSaveState({ error: null, savedAt: null }, false), "idle");
  assert.equal(describeProfileSaveState({ error: null, savedAt: null }, true), "pending");
  assert.equal(describeProfileSaveState({ error: "onboarding_invalid", savedAt: null }, false), "error");
  assert.equal(describeProfileSaveState({ error: null, savedAt }, false), "saved");
  // A fresh submit is pending even while the previous outcome is still on state.
  assert.equal(describeProfileSaveState({ error: "onboarding_save_failed", savedAt: null }, true), "pending");
  assert.equal(describeProfileSaveState({ error: null, savedAt }, true), "pending");
});
