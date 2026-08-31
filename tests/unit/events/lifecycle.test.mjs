// Migrated mechanically from tests/security-boundaries.test.mjs for issue #274.

import assert from "node:assert/strict";

import test from "node:test";

import { fpUserStatusToHackathonStatus, isPreparationComplete, selectFeaturedHackathon } from "../../../src/lib/fp/event-lifecycle.ts";

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
