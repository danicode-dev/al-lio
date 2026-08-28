import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  RADAR_MAX_BATCH_ITEMS,
  RADAR_SUPPORTED_SCHEMA_VERSIONS,
  radarDeliverySchema,
} from "../src/lib/radar/contract.ts";
import {
  legacyLifecycleStatus,
  radarV4ProjectionDestinations,
  resolveRadarV4Fact,
} from "../src/lib/radar/v4-projection.ts";

const fixtures = join(process.cwd(), "tests", "fixtures", "radar-v4");

function fixture(name) {
  return JSON.parse(readFileSync(join(fixtures, name), "utf8"));
}

test("the same protected receiver accepts strict v3 and complete or partial v4", () => {
  for (const name of ["strict-v3.json", "complete-v4.json", "partial-v4.json", "conflicting-v4.json"]) {
    const parsed = radarDeliverySchema.safeParse(fixture(name));
    assert.equal(parsed.success, true, name);
  }
  assert.deepEqual([...RADAR_SUPPORTED_SCHEMA_VERSIONS], [2, 3, 4]);
});

test("v4 rejects a missing publication-critical fact and its evidence atomically", () => {
  const delivery = fixture("partial-v4.json");
  delivery.items[0].facts.provider = null;
  delivery.items[0].factStates["facts.provider"] = "not_stated";
  delivery.items[0].evidence = delivery.items[0].evidence.filter((entry) => entry.fieldPath !== "facts.provider");
  assert.equal(radarDeliverySchema.safeParse(delivery).success, false);
});

test("v4 rejects present facts without value-matching field evidence", () => {
  const delivery = fixture("partial-v4.json");
  delivery.items[0].evidence.find((entry) => entry.fieldPath === "facts.title").valueHash = "0".repeat(64);
  assert.equal(radarDeliverySchema.safeParse(delivery).success, false);
});

test("v4 is strict and rejects transport fields that were not versioned", () => {
  const delivery = fixture("partial-v4.json");
  delivery.items[0].userState = "started";
  assert.equal(radarDeliverySchema.safeParse(delivery).success, false);
});

test("an explicitly verified empty list is distinct from a fact that was not stated", () => {
  const delivery = fixture("partial-v4.json");
  delivery.items[0].factStates["facts.requirements"] = "verified";
  delivery.items[0].evidence.push({
    fieldPath: "facts.requirements",
    origin: "authoritative_source",
    kind: "official_document",
    url: "https://example.edu/cursos/java-parcial",
    observedAt: "2026-08-28T07:05:00.000Z",
    valueHash: "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
    authorityRank: 100,
  });
  assert.equal(radarDeliverySchema.safeParse(delivery).success, true);
});

test("derived public copy requires explicit provenance", () => {
  const delivery = fixture("partial-v4.json");
  delivery.items[0].derived.whyRelevant = "Encaja con DAW.";
  assert.equal(radarDeliverySchema.safeParse(delivery).success, false);
});

test("batch limits remain unchanged", () => {
  const delivery = fixture("partial-v4.json");
  delivery.items = Array.from({ length: RADAR_MAX_BATCH_ITEMS + 1 }, () => delivery.items[0]);
  assert.equal(radarDeliverySchema.safeParse(delivery).success, false);
});

test("missing extraction never erases the last-known-good fact", () => {
  const result = resolveRadarV4Fact({
    currentValue: "Resumen verificado por la fuente oficial.",
    currentAuthorityRank: 100,
    incomingValue: null,
    incomingAuthorityRank: null,
    observationState: "source_unavailable",
  });
  assert.equal(result.value, "Resumen verificado por la fuente oficial.");
  assert.equal(result.applyIncoming, false);
  assert.equal(result.conflict, false);
});

test("a lower-authority conflict keeps last-known-good and is quarantinable", () => {
  const result = resolveRadarV4Fact({
    currentValue: "Resumen verificado por la fuente oficial.",
    currentAuthorityRank: 100,
    incomingValue: fixture("conflicting-v4.json").items[0].facts.summaryShort,
    incomingAuthorityRank: 50,
    observationState: "verified",
  });
  assert.equal(result.value, "Resumen verificado por la fuente oficial.");
  assert.equal(result.applyIncoming, false);
  assert.equal(result.conflict, true);
  assert.equal(result.resolution, "kept_last_known_good");
});

test("only explicit verified removal can clear a known fact", () => {
  const result = resolveRadarV4Fact({
    currentValue: "Certificado oficial",
    currentAuthorityRank: 80,
    incomingValue: null,
    incomingAuthorityRank: 100,
    observationState: "verified_removed",
  });
  assert.equal(result.value, null);
  assert.equal(result.applyIncoming, true);
  assert.equal(result.resolution, "accepted_higher_authority");
});

test("v4 projection is disabled by default and invalid flags fail closed", () => {
  assert.deepEqual([...radarV4ProjectionDestinations("")], []);
  assert.deepEqual([...radarV4ProjectionDestinations("news,course")], ["news", "course"]);
  assert.throws(() => radarV4ProjectionDestinations("job"), /Unsupported/);
});

test("source lifecycle is not confused with user state or internal priority", () => {
  assert.equal(legacyLifecycleStatus("registration_open"), "abierto");
  assert.equal(legacyLifecycleStatus("registration_closed"), null);
  assert.equal(legacyLifecycleStatus("cancelled"), null);
});

test("compatibility projection reuses the legacy UUID and never mutates student state", () => {
  const repository = readFileSync(join(process.cwd(), "src", "lib", "db", "repositories", "radar-v4.ts"), "utf8");
  assert.match(repository, /WHERE radar_semantic_key = \$1 LIMIT 1/);
  assert.match(repository, /UPDATE public\.fp_content_items SET[\s\S]+WHERE id = \$20/);
  assert.doesNotMatch(repository, /(UPDATE|DELETE FROM|INSERT INTO) public\.fp_user_content_state/);
});

test("identity corrections resolve through auditable canonical aliases", () => {
  const repository = readFileSync(join(process.cwd(), "src", "lib", "db", "repositories", "radar-v4.ts"), "utf8");
  assert.match(repository, /radar_content_identity_aliases/);
  assert.match(repository, /canonical-entity-key-transition/);
  assert.match(repository, /canonical-occurrence-key-transition/);
  assert.match(repository, /uniqueCandidates\.size > 1/);
});
