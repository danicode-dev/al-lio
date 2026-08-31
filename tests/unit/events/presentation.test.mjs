// Migrated mechanically from tests/security-boundaries.test.mjs for issue #274.

import assert from "node:assert/strict";

import test from "node:test";

import { canToggleHackathonFavorite as canToggleHackathonFavoriteShared, fpItemToHackathon, getHackathonPresentation, hackathonPublicDescription, isFpHackathonLike, isTechHackathonOrEvent, resolveHackathonById, techOpportunityToHackathon } from "../../../src/lib/hackathons/hackathon-presentation.ts";

const fixtureTechEvent = {
  id: "t1", id_slug: "reto-granada", categoria: "hackathon_reto", nombre: "Reto Granada",
  entidad: "Ayuntamiento", area_o_tipo: null, modalidad: "Presencial", localidad: "Granada",
  provincia: "Granada", fecha_inicio: "2026-09-01", fecha_fin: "2026-09-02", estado: "activo",
  certificacion_o_premio: null, practicas_empresa: null, horas_totales: null, horas_practicas: null,
  coste: null, requisitos_resumen: null, encaje_daw_1_5: null, prioridad: "alta", tags: null,
  fuente_url: "https://example.org/reto", ultima_revision: null, notas: null,
  created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z",
};

const fixtureTechCourse = { ...fixtureTechEvent, id: "t2", id_slug: "curso-x", categoria: "curso", nombre: "Curso X" };

const fixtureFpEvent = {
  id: "f1", id_slug: "hackathon-fp", type: "hackathon", title: "Hackathon FP",
  entity: "AL-LIO", delivery_mode: "Online", location: "Granada", province: "Granada",
  start_date: "2026-10-01", end_date: "2026-10-02", status: "activo", cost: null,
  certification: null, practices: null, source_url: "https://example.org/fp-hackathon",
  tags: null, suggested_action: "Revisar bases del reto", notes: "Importado 2026-01-01 desde FEED.json, pendiente de revision",
  priority: "Alta", requiredCompetencies: [], is_favorite: true, user_status: null,
  user_completed_at: null, created_at: "2026-01-01T00:00:00.000Z",
};

const fixtureOwnHackathon = {
  id: "real-uuid-1", name: "Mi propio evento", status: "pendiente", priority: "media",
  is_favorite: false, created_at: "2026-01-01T00:00:00.000Z",
};

test("resolveHackathonById resolves tech-/fp-/plain ids to the correct source and returns null for a wrong-category or nonexistent slug (issue #135)", () => {
  assert.equal(resolveHackathonById("tech-reto-granada", [], [fixtureTechEvent], [])?.name, "Reto Granada");
  assert.equal(resolveHackathonById("tech-curso-x", [], [fixtureTechCourse], []), null, "a tech_opportunities row categorized as a course must not resolve on the events route");
  assert.equal(resolveHackathonById("fp-hackathon-fp", [], [], [fixtureFpEvent])?.name, "Hackathon FP");
  assert.equal(resolveHackathonById("real-uuid-1", [fixtureOwnHackathon], [], [])?.name, "Mi propio evento");
  assert.equal(resolveHackathonById("tech-does-not-exist", [], [fixtureTechEvent], []), null);
  assert.equal(resolveHackathonById("real-uuid-does-not-exist", [fixtureOwnHackathon], [], []), null, "an id belonging to another user is simply absent from this user's already-scoped arrays, so it resolves to null exactly like a nonexistent id - not found and not yours are indistinguishable by construction");
});

test("getHackathonPresentation never leaks fp_content_items' raw notes (import/moderation provenance) as the public description (issue #135, same regression class as #118)", () => {
  const hackathon = fpItemToHackathon(fixtureFpEvent);
  const presentation = getHackathonPresentation(hackathon);
  assert.equal(presentation.description, undefined, "fp_content_items-sourced events have no public description field set on this fixture, and must never fall back to notes");
  assert.doesNotMatch(JSON.stringify(presentation), /pendiente de revision|Importado/, "moderation/import provenance must never reach the presentation model");
  assert.equal(presentation.isFavorite, true);
  assert.equal(presentation.canToggleFavorite, true);
});

test("getHackathonPresentation marks tech_opportunities-sourced events as not favoritable, and techOpportunityToHackathon/isTechHackathonOrEvent agree on category (issue #135)", () => {
  assert.equal(isTechHackathonOrEvent(fixtureTechEvent), true);
  assert.equal(isTechHackathonOrEvent(fixtureTechCourse), false);
  const hackathon = techOpportunityToHackathon(fixtureTechEvent);
  const presentation = getHackathonPresentation(hackathon);
  assert.equal(presentation.canToggleFavorite, false);
  assert.equal(canToggleHackathonFavoriteShared(hackathon), false);
});

test("isFpHackathonLike only matches the event/hackathon fp_content_items types, keeping the events detail route from resolving a course-typed row", () => {
  assert.equal(isFpHackathonLike(fixtureFpEvent), true);
  assert.equal(isFpHackathonLike({ ...fixtureFpEvent, type: "curso_basico" }), false);
});

test("hackathonPublicDescription prefers item.description, and only falls back to item.notes for non-fp_content_items sources (issue #135)", () => {
  assert.equal(hackathonPublicDescription({ status: "pendiente", is_favorite: false, name: "x", created_at: "", description: "Clean copy", notes: "raw notes", sourceTable: undefined, priority: "media" }), "Clean copy");
  assert.equal(hackathonPublicDescription({ status: "pendiente", is_favorite: false, name: "x", created_at: "", notes: "own notes", sourceTable: undefined, priority: "media" }), "own notes");
  assert.equal(hackathonPublicDescription({ status: "pendiente", is_favorite: false, name: "x", created_at: "", notes: "raw import notes", sourceTable: "fp_content_items", priority: "media" }), undefined, "fp_content_items rows must never expose notes as description");
});
