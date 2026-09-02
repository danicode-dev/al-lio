// Executable coverage for the pure Courses catalogue model extracted from
// courses-feature.tsx in issue #366. These replace the source-slicing that the
// integration suites used to do for ordering, filtering and featured selection.

import assert from "node:assert/strict";
import test from "node:test";

import {
  canToggleCourseFavorite,
  capitalizeFirst,
  courseHeroImage,
  courseStatusClass,
  isCourseArchived,
  opportunityLifecycleLabel,
  selectFeaturedCourse,
  sortCoursesByStart,
  toggleCourseFavoriteFor,
} from "../../../src/features/courses/client/course-catalogue-model.ts";

const course = (over = {}) => ({
  id: "c1",
  title: "Curso",
  status: "pendiente",
  is_favorite: false,
  ...over,
});

test("sortCoursesByStart orders by start date ascending, undated last, without mutating the input", () => {
  const input = [
    course({ id: "late", fecha_inicio: "2026-12-01" }),
    course({ id: "undated" }),
    course({ id: "early", start_at: "2026-01-15T09:00:00.000Z" }),
    course({ id: "mid", fecha_inicio: "2026-06-01" }),
  ];
  const snapshot = [...input];

  const sorted = sortCoursesByStart(input);

  assert.deepEqual(sorted.map((c) => c.id), ["early", "mid", "late", "undated"]);
  assert.deepEqual(input, snapshot, "the source array must not be reordered in place");
});

test("selectFeaturedCourse prefers the soonest not-yet-started course, breaking ties by priority", () => {
  const pool = [
    course({ id: "started", status: "empezado", fecha_inicio: "2020-01-01" }),
    course({ id: "soon-low", prioridad: "baja", fecha_inicio: "2026-09-10" }),
    course({ id: "soon-high", prioridad: "alta", fecha_inicio: "2026-09-10" }),
    course({ id: "later", prioridad: "alta", fecha_inicio: "2026-12-01" }),
  ];

  assert.equal(selectFeaturedCourse(pool, "2026-09-01")?.id, "soon-high");
});

test("selectFeaturedCourse falls back to the highest-priority active course when nothing is upcoming", () => {
  const pool = [
    course({ id: "old-media", prioridad: "media", fecha_inicio: "2026-01-01" }),
    course({ id: "old-alta", prioridad: "alta", fecha_inicio: "2025-06-01" }),
  ];

  assert.equal(selectFeaturedCourse(pool, "2026-09-01")?.id, "old-alta");
});

test("selectFeaturedCourse never features archived or finished courses and returns null when the pool is empty", () => {
  assert.equal(selectFeaturedCourse([], "2026-09-01"), null);
  assert.equal(
    selectFeaturedCourse([course({ status: "terminado" }), course({ status: "descartado" })], "2026-09-01"),
    null,
  );
});

test("isCourseArchived classifies terminado/descartado as archived", () => {
  assert.equal(isCourseArchived({ status: "terminado" }), true);
  assert.equal(isCourseArchived({ status: "descartado" }), true);
  assert.equal(isCourseArchived({ status: "empezado" }), false);
  assert.equal(isCourseArchived({ status: "pendiente" }), false);
});

test("courseHeroImage is deterministic, family-aware and in range", () => {
  const a = courseHeroImage(course({ id: "abc", title: "Java backend" }));
  const b = courseHeroImage(course({ id: "abc", title: "Java backend" }));
  assert.equal(a, b, "same identity must resolve to the same asset");
  assert.match(a, /^\/assets\/cursos\/curso-hero-desarrollo-[1-5]\.jpg$/);

  assert.match(courseHeroImage(course({ id: "m", title: "Campaña de marketing" })), /curso-hero-marketing-[1-6]\.jpg$/);
  assert.match(courseHeroImage(course({ id: "d", title: "Entrenamiento deportivo" })), /curso-hero-deporte-[1-7]\.jpg$/);
  assert.match(courseHeroImage(course({ id: "a", title: "Gestión contable y factura" })), /curso-hero-administracion-[1-5]\.jpg$/);
  assert.match(courseHeroImage(course({ id: "g", title: "Cocina creativa" })), /curso-hero-generico-[1-6]\.jpg$/);
});

test("courseStatusClass and opportunityLifecycleLabel map known values only", () => {
  assert.equal(courseStatusClass("empezado"), "al-course-chip-terracotta");
  assert.match(courseStatusClass("terminado"), /emerald/);
  assert.equal(courseStatusClass("pausado"), "al-course-chip-amber");
  assert.match(courseStatusClass("descartado"), /red/);
  assert.equal(courseStatusClass("pendiente"), "");

  assert.equal(opportunityLifecycleLabel("registration_open"), "Inscripción abierta");
  assert.equal(opportunityLifecycleLabel("evergreen"), "Disponible sin convocatoria");
  assert.equal(opportunityLifecycleLabel(undefined), undefined);
  assert.equal(opportunityLifecycleLabel("not-a-status"), undefined);
});

test("capitalizeFirst upper-cases the first character only, tolerating empty input", () => {
  assert.equal(capitalizeFirst("pendiente"), "Pendiente");
  assert.equal(capitalizeFirst(""), "");
});

test("canToggleCourseFavorite / toggleCourseFavoriteFor honour the per-origin favouriting rules", () => {
  assert.equal(canToggleCourseFavorite(course({ sourceTable: "tech_opportunities" })), false);
  assert.equal(canToggleCourseFavorite(course({ sourceTable: "fp_content_items", id_slug: "curso-x" })), true);
  assert.equal(canToggleCourseFavorite(course({ sourceTable: "fp_content_items" })), false);
  assert.equal(canToggleCourseFavorite(course({})), true);

  const calls = [];
  const actions = {
    toggleFpFavorite: (slug, next) => calls.push(["fp", slug, next]),
    toggleCourseFavorite: (id) => calls.push(["course", id]),
  };

  toggleCourseFavoriteFor(course({ sourceTable: "fp_content_items", id_slug: "curso-x", is_favorite: false }), actions);
  toggleCourseFavoriteFor(course({ id: "plain-1" }), actions);

  assert.deepEqual(calls, [["fp", "curso-x", true], ["course", "plain-1"]]);
});
