// Migrated mechanically from tests/security-boundaries.test.mjs for issue #274.
// Source-level assertions temporarily protect a Next.js, browser, or database boundary that the plain Node runner cannot execute; replace them when the corresponding integration harness exists.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { fpItemToHackathon, getHackathonPresentation } from "../../../src/features/events/presentation/event-presentation.ts";
import { fpItemToCourse, getCoursePresentation, isFpCourseLike, isTechCourse, resolveCourseById, techOpportunityToCourse } from "../../../src/features/courses/presentation/course-presentation.ts";

const fixtureTechCourseItem = {
  id: "t3", id_slug: "curso-frontend", categoria: "curso", nombre: "Curso Frontend",
  entidad: "MDN", area_o_tipo: null, modalidad: "Online", localidad: "Granada",
  provincia: "Granada", fecha_inicio: "2026-09-01", fecha_fin: "2026-12-01", estado: "activo",
  certificacion_o_premio: null, practicas_empresa: null, horas_totales: null, horas_practicas: null,
  coste: "Gratis", requisitos_resumen: null, encaje_daw_1_5: null, prioridad: "alta", tags: null,
  fuente_url: "https://example.org/curso", ultima_revision: null, notas: null,
  created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z",
};

const fixtureTechEventItem = { ...fixtureTechCourseItem, id: "t4", id_slug: "reto-y", categoria: "hackathon_reto", nombre: "Reto Y" };

const fixtureFpCourseItem = {
  id: "f2", id_slug: "curso-fp-react", type: "curso_basico", title: "React desde cero",
  entity: "AL-LIO", delivery_mode: "Online", location: "Granada", province: "Granada",
  start_date: "2026-09-01", end_date: "2026-11-01", status: "activo", cost: "Gratis",
  certification: null, practices: null, source_url: "https://example.org/fp-react",
  tags: null, suggested_action: "Repasar antes de empezar", notes: "Importado 2026-01-01 desde FEED.json, revisar",
  priority: "Alta", is_favorite: true, user_status: null, user_completed_at: null,
  created_at: "2026-01-01T00:00:00.000Z",
};

const fixtureOwnCourse = {
  id: "real-course-1", title: "Mi propio curso", status: "pendiente",
  created_at: "2026-01-01T00:00:00.000Z",
};

const fixtureCanonicalCourse = {
  occurrenceId: "canonical-course-1",
  destination: "course",
  opportunityType: "course",
  title: "Java profesional",
  summaryShort: "Aprende Java con ejercicios verificables.",
  provider: "Official Academy",
  canonicalUrl: "https://academy.example/java",
  registrationUrl: "https://academy.example/java/enrol",
  startsAt: "2026-10-01T08:00:00.000Z",
  endsAt: "2026-12-01T17:00:00.000Z",
  attendanceMode: "online",
  durationHours: 40,
  courseDifficulty: "introductory",
  minimumEducation: "CFGS",
  otherEligibility: ["Residents in Spain"],
  credentialLevel: "Professional certificate level 3",
  priceState: "free",
  certification: "Official provider certificate",
  requirements: ["Java development environment"],
  audience: ["DAW", "DAM"],
  learningOutcomes: ["Build a Java application"],
  skillsTested: [],
  preparationTips: [],
  sourceLifecycleStatus: "registration_open",
  sourceVerifiedAt: "2026-08-28T09:00:00.000Z",
};

const fixtureCanonicalEvent = {
  ...fixtureCanonicalCourse,
  occurrenceId: "canonical-event-1",
  destination: "event",
  opportunityType: "hackathon",
  title: "Verified Hackathon 2026",
  canonicalUrl: "https://event.example/2026",
  registrationUrl: "https://event.example/2026/register",
  provider: undefined,
  organizer: "Verified Organizer",
  registrationDeadline: "2026-09-20T21:59:00.000Z",
  municipality: "Granada",
  province: "Granada",
  prize: "€1,000 jury prize",
  certification: undefined,
  otherEligibility: ["18 years or older"],
  requirements: ["Teams of 2 to 4"],
  audience: ["Students in Spain"],
  learningOutcomes: [],
  skillsTested: ["Java", "Teamwork"],
  preparationTips: ["Review the official challenge brief"],
};

test("resolveCourseById resolves tech-/fp-/plain ids to the correct source and returns null for a wrong-category or nonexistent slug", () => {
  assert.equal(resolveCourseById("tech-curso-frontend", [], [fixtureTechCourseItem], [])?.title, "Curso Frontend");
  assert.equal(resolveCourseById("tech-reto-y", [], [fixtureTechEventItem], []), null, "a tech_opportunities row categorized as an event must not resolve on the courses route");
  assert.equal(resolveCourseById("fp-curso-fp-react", [], [], [fixtureFpCourseItem])?.title, "React desde cero");
  assert.equal(resolveCourseById("real-course-1", [fixtureOwnCourse], [], [])?.title, "Mi propio curso");
  assert.equal(resolveCourseById("tech-does-not-exist", [], [fixtureTechCourseItem], []), null);
  assert.equal(resolveCourseById("real-course-does-not-exist", [fixtureOwnCourse], [], []), null, "an id belonging to another user is simply absent from this user's already-scoped arrays, so it resolves to null exactly like a nonexistent id");
});

test("isTechCourse/isFpCourseLike agree with resolveCourseById on category, and getCoursePresentation never leaks fp_content_items' raw notes as the public description", () => {
  assert.equal(isTechCourse(fixtureTechCourseItem), true);
  assert.equal(isTechCourse(fixtureTechEventItem), false);
  assert.equal(isFpCourseLike(fixtureFpCourseItem), true);
  assert.equal(isFpCourseLike({ ...fixtureFpCourseItem, type: "hackathon" }), false);

  const course = fpItemToCourse(fixtureFpCourseItem);
  const presentation = getCoursePresentation(course);
  assert.doesNotMatch(JSON.stringify(presentation), /Importado|revisar/i, "moderation/import provenance must never reach the presentation model");
  assert.equal(presentation.title, "React desde cero");

  const techCourse = techOpportunityToCourse(fixtureTechCourseItem);
  assert.equal(techCourse.sourceTable, "tech_opportunities");
});

test("verified opportunities mode reads accepted canonical course/event facts and suppresses unclassified legacy rows (issue #200)", async () => {
  const source = await readFile(new URL("../../../src/features/learning/server/catalogue-repository.ts", import.meta.url), "utf8");
  assert.match(source, /AL_LIO_VERIFIED_OPPORTUNITIES_ONLY/);
  assert.match(source, /LEFT JOIN public\.radar_content_occurrences canonical/);
  assert.match(source, /LEFT JOIN public\.radar_content_entities entity/);
  assert.match(source, /canonical\.publication_decision = 'accepted'/);
  assert.match(source, /entity\.destination in \('course', 'event'\)/);
  assert.match(source, /canonical\.course_difficulty as canonical_course_difficulty/);
  assert.match(source, /canonical\.minimum_education as canonical_minimum_education/);
  assert.match(source, /canonical\.other_eligibility as canonical_other_eligibility/);
  assert.match(source, /canonical\.credential_level as canonical_credential_level/);
  assert.match(source, /canonical\.registration_url as canonical_registration_url/);
  assert.match(source, /state\.status in \('saved', 'started', 'completed'\)/, "saved student state keeps an item reachable while preserving lifecycle separation");
});

test("verified opportunities mode keeps a dated accepted course visible when the source does not state a lifecycle (issue #250)", async () => {
  const source = await readFile(new URL("../../../src/features/learning/server/catalogue-repository.ts", import.meta.url), "utf8");
  assert.match(source, /entity\.destination = 'course'/);
  assert.match(source, /canonical\.source_lifecycle_status is null/);
  assert.match(
    source,
    /coalesce\(\s*canonical\.registration_deadline,\s*canonical\.ends_at,\s*canonical\.starts_at\s*\) >= now\(\)/,
    "an unknown lifecycle remains absent and visibility is bounded by the verified registration or course date",
  );
  assert.match(
    source,
    /entity\.destination <> 'event'[\s\S]*canonical\.starts_at is not null/,
    "events retain their separate stricter start/end-date boundary",
  );
});

test("verified opportunities mode bounds lifecycle-null events by their explicit dates (issue #252)", async () => {
  const source = await readFile(new URL("../../../src/features/learning/server/catalogue-repository.ts", import.meta.url), "utf8");
  assert.match(
    source,
    /entity\.destination = 'event'[\s\S]*canonical\.source_lifecycle_status is null[\s\S]*canonical\.starts_at is not null/,
    "an event without a source lifecycle still requires an explicit start date",
  );
  assert.match(
    source,
    /entity\.destination = 'event'[\s\S]*coalesce\(canonical\.ends_at, canonical\.starts_at\) >= now\(\)/,
    "an event without a source lifecycle cannot remain visible after its verified end date",
  );
  assert.match(
    source,
    /canonical\.registration_deadline is null\s*or canonical\.registration_deadline >= now\(\)/,
    "a stated registration deadline must still be current, while a genuinely unstated deadline stays absent",
  );
});

test("legacy opportunity migration is additive, auditable and cannot self-certify a CSV row as verified (issue #200)", async () => {
  const [migration, reportText] = await Promise.all([
    readFile(new URL("../../../infra/postgres/migrations/0013_trustworthy_opportunity_catalogue.sql", import.meta.url), "utf8"),
    readFile(new URL("../../../docs/audits/legacy-opportunities-2026-08-28.json", import.meta.url), "utf8"),
  ]);
  const report = JSON.parse(reportText);
  assert.match(migration, /legacy_opportunity_migration_audit/);
  assert.match(migration, /classification <> 'verified_migratable' or canonical_occurrence_id is not null/);
  assert.doesNotMatch(migration, /drop table|truncate table/i);
  assert.equal(report.summary.totalRows, report.rows.length);
  assert.equal(report.summary.classificationCounts.verified_migratable, 0);
  assert.ok(report.rows.every((row) => row.reasonCodes.length > 0 && /^[0-9a-f]{64}$/.test(row.snapshotFingerprint)));
  assert.ok(report.rows.some((row) => row.classification === "source_only"));
  assert.ok(report.rows.some((row) => row.classification === "expired_historical"));
});

test("canonical course facts override contradictory legacy fields without collapsing education, difficulty or credential level (issue #200)", () => {
  const mapped = fpItemToCourse({
    ...fixtureFpCourseItem,
    title: "Wrong legacy title",
    status: "empezado",
    description: "Request information",
    notes: "Internal priority: high",
    canonical: fixtureCanonicalCourse,
  });
  const presentation = getCoursePresentation(mapped);

  assert.equal(mapped.status, "pendiente", "legacy catalogue lifecycle must not become student progress");
  assert.equal(presentation.title, "Java profesional");
  assert.equal(presentation.description, "Aprende Java con ejercicios verificables.");
  assert.equal(presentation.courseDifficulty, "introductory");
  assert.equal(presentation.minimumEducation, "CFGS");
  assert.equal(presentation.credentialLevel, "Professional certificate level 3");
  assert.equal(presentation.sourceUrl, "https://academy.example/java/enrol");
  assert.doesNotMatch(JSON.stringify(presentation), /Request information|Internal priority/i);
});

test("canonical event presentation keeps exact edition, registration, eligibility and prize facts separate (issue #200)", () => {
  const mapped = fpItemToHackathon({
    ...fixtureFpCourseItem,
    type: "hackathon",
    title: "Legacy listing",
    description: "Editorial guess",
    status: "revisar",
    canonical: fixtureCanonicalEvent,
  });
  const presentation = getHackathonPresentation(mapped);

  assert.equal(mapped.status, "pendiente", "objective lifecycle must not be coerced into per-user completion");
  assert.equal(presentation.title, "Verified Hackathon 2026");
  assert.equal(presentation.registrationDeadline, "2026-09-20T21:59:00.000Z");
  assert.equal(presentation.sourceUrl, "https://event.example/2026/register");
  assert.deepEqual(presentation.otherEligibility, ["18 years or older"]);
  assert.deepEqual(presentation.requirements, ["Teams of 2 to 4"]);
  assert.equal(presentation.prize, "€1,000 jury prize");
  assert.equal(presentation.certification, undefined);
  assert.doesNotMatch(JSON.stringify(presentation), /Editorial guess|revisar/i);
});
