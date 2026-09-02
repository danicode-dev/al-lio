// Executable coverage for the pure Events catalogue model extracted from
// events-feature.tsx in issue #367. Featured selection is covered separately in
// tests/unit/events/lifecycle.test.mjs (the @/lib/fp/event-lifecycle helper).

import assert from "node:assert/strict";
import test from "node:test";

import {
  hackathonAptitudeProgress,
  hackathonStatusLabel,
  hackathonStatusPillClass,
  isCompetencyDone,
  isHackathonArchived,
  opportunityLifecycleLabel,
  sortHackathonsByStart,
} from "../../../src/features/events/client/event-catalogue-model.ts";

test("hackathonStatusLabel maps known statuses and passes unknown ones through", () => {
  assert.equal(hackathonStatusLabel("inscripcion_abierta"), "Inscripción abierta");
  assert.equal(hackathonStatusLabel("realizado"), "Realizado");
  assert.equal(hackathonStatusLabel("revisar_futura_edicion"), "Revisar");
  assert.equal(hackathonStatusLabel("algo_raro"), "algo_raro");
});

test("hackathonStatusPillClass maps every lifecycle status to a catalogue status class", () => {
  assert.equal(hackathonStatusPillClass("inscripcion_abierta"), "al-catalog-status-open");
  assert.equal(hackathonStatusPillClass("pendiente"), "al-catalog-status-pending");
  assert.equal(hackathonStatusPillClass("realizado"), "al-catalog-status-complete");
  assert.equal(hackathonStatusPillClass("revisar_futura_edicion"), "al-catalog-status-review");
  assert.equal(hackathonStatusPillClass("descartado"), "al-catalog-status-dismissed");
});

test("opportunityLifecycleLabel maps known lifecycle values only", () => {
  assert.equal(opportunityLifecycleLabel("registration_open"), "Inscripción abierta");
  assert.equal(opportunityLifecycleLabel("evergreen"), "Disponible sin convocatoria");
  assert.equal(opportunityLifecycleLabel(undefined), undefined);
  assert.equal(opportunityLifecycleLabel("not-a-status"), undefined);
});

test("isCompetencyDone reads the explicit completed flag", () => {
  assert.equal(isCompetencyDone({ completed: true }), true);
  assert.equal(isCompetencyDone({ completed: false }), false);
  assert.equal(isCompetencyDone({}), false);
});

test("isHackathonArchived classifies realizado/descartado as archived", () => {
  assert.equal(isHackathonArchived({ status: "realizado" }), true);
  assert.equal(isHackathonArchived({ status: "descartado" }), true);
  assert.equal(isHackathonArchived({ status: "inscripcion_abierta" }), false);
  assert.equal(isHackathonArchived({ status: "pendiente" }), false);
});

test("sortHackathonsByStart orders by start date ascending, undated last, without mutating the input", () => {
  const input = [
    { id: "late", start_at: "2026-12-01" },
    { id: "undated" },
    { id: "early", start_at: "2026-01-15T09:00:00.000Z" },
    { id: "mid", start_at: "2026-06-01" },
  ];
  const snapshot = [...input];

  const sorted = sortHackathonsByStart(input);

  assert.deepEqual(sorted.map((h) => h.id), ["early", "mid", "late", "undated"]);
  assert.deepEqual(input, snapshot, "the source array must not be reordered in place");
});

test("hackathonAptitudeProgress separates required from recommended and deduplicates resources", () => {
  const item = {
    requiredCompetencies: [
      {
        id: "req-done",
        obligatoria_para_item: true,
        completed: true,
        preparationResources: [{ id: "r1", user_status: "completed" }, { id: "r2", user_status: "started" }],
      },
      {
        id: "req-pending",
        obligatoria_para_item: true,
        completed: false,
        preparationResources: [{ id: "r1", user_status: "completed" }],
      },
      {
        id: "reco-done",
        obligatoria_para_item: false,
        completed: true,
        preparationResources: [{ id: "r3", user_status: null }],
      },
    ],
  };

  const progress = hackathonAptitudeProgress(item);

  assert.equal(progress.requiredTotal, 2);
  assert.equal(progress.requiredDone, 1);
  assert.equal(progress.done, 1);
  assert.equal(progress.total, 2);
  assert.equal(progress.recommendedTotal, 1);
  assert.equal(progress.recommendedDone, 1);
  // r1 appears in two competencies but is counted once.
  assert.equal(progress.resourcesCompleted, 1);
  assert.equal(progress.resourcesStarted, 1);
});

test("hackathonAptitudeProgress is safe for an event with no requirements", () => {
  const progress = hackathonAptitudeProgress({});
  assert.equal(progress.total, 0);
  assert.equal(progress.requiredTotal, 0);
  assert.equal(progress.recommendedTotal, 0);
  assert.equal(progress.resourcesStarted, 0);
  assert.equal(progress.resourcesCompleted, 0);
});
