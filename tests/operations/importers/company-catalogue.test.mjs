// Migrated mechanically from tests/security-boundaries.test.mjs for issue #274.
// Source-level assertions intentionally protect scripts, configuration, migrations, or deployment contracts whose real execution would be unsafe or impractical in the Node suite.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { ALLOWED_DATASET_STATUSES, idSlugFor, isBlockedWebHost, isHttpUrl, isValidReviewedAt, parseDatasetSource, stableUuid, SUPPORTED_SCHEMA_VERSIONS, validateDataset } from "../../../scripts/lib/company-catalogue.mjs";

function makeRow(overrides = {}) {
  return {
    nombre: "Ejemplo Consultoría SL",
    web: "https://ejemplo-consultoria.es/",
    empleo: null,
    tipo_empleo: null,
    categoria: "Asesoría fiscal y contable",
    granada: "Sede en Granada",
    fuente: "https://ejemplo-consultoria.es/contacto",
    ...overrides,
  };
}

// A valid, owner-approved review envelope for AF/MP/TSAF-style datasets.
// DEV never needs this (see the grandfather tests below), so every other
// cycleGroup-scoped test that expects a clean `errors: []` result must
// spread this in, exactly like `makeRow()` provides valid row defaults.
function validMetadata(overrides = {}) {
  return {
    schemaVersion: 1,
    status: "approved",
    reviewedAt: "2026-08-20",
    reviewedBy: "Test Reviewer",
    ...overrides,
  };
}

test("isHttpUrl accepts only http(s) and rejects malformed/other-protocol values (issue #97)", () => {
  assert.equal(isHttpUrl("https://example.com"), true);
  assert.equal(isHttpUrl("http://example.com"), true);
  assert.equal(isHttpUrl("javascript:alert(1)"), false);
  assert.equal(isHttpUrl("not a url"), false);
  assert.equal(isHttpUrl(""), false);
});

test("isBlockedWebHost rejects job boards, social media, aggregators and link shorteners (issue #97)", () => {
  for (const url of [
    "https://www.linkedin.com/company/example",
    "https://www.infojobs.net/empresa/example",
    "https://es.indeed.com/cmp/Example",
    "https://www.instagram.com/example/",
    "https://www.facebook.com/example",
    "https://bit.ly/3abcdef",
    "https://www.google.com/search?q=example",
  ]) {
    assert.equal(isBlockedWebHost(url), true, `expected ${url} to be blocked`);
  }
  assert.equal(isBlockedWebHost("https://ejemplo-consultoria.es/"), false);
});

test("idSlugFor keeps DEV's original unprefixed scheme, exactly matching the pre-#97 identities (issue #97)", () => {
  // DEV must never change: same slug function, same UUID namespace as the
  // original hardcoded importer used for the existing 69 companies and their
  // favourites - "Ansotec" is a real row from public/data/empresas_tech_granada.md.
  assert.equal(idSlugFor("DEV", "Ansotec"), "ansotec");
  assert.equal(stableUuid("companies-v1", "ansotec"), stableUuid("companies-v1", idSlugFor("DEV", "Ansotec")));
});

test("idSlugFor namespaces new groups so the same company name can never collide with DEV or another group (issue #97)", () => {
  assert.equal(idSlugFor("AF", "Ejemplo"), "af-ejemplo");
  assert.equal(idSlugFor("MP", "Ejemplo"), "mp-ejemplo");
  assert.equal(idSlugFor("TSAF", "Ejemplo"), "tsaf-ejemplo");
  assert.equal(idSlugFor("DEV", "Ejemplo"), "ejemplo");
  const slugs = new Set(["DEV", "AF", "MP", "TSAF"].map((group) => idSlugFor(group, "Ejemplo")));
  assert.equal(slugs.size, 4, "the same company name in four different groups must produce four distinct slugs/ids");
});

test("parseDatasetSource reads the legacy DEV markdown block and the new JSON envelope shape (issue #97)", () => {
  const md = "# Title\n\n```json\n[{\"nombre\":\"A\"}]\n```\n";
  assert.deepEqual(parseDatasetSource(md, "public/data/empresas_tech_granada.md"), { cycleGroupInFile: null, rows: [{ nombre: "A" }] });

  const bareArray = JSON.stringify([{ nombre: "A" }]);
  assert.deepEqual(parseDatasetSource(bareArray, "data/companies/x.json"), { cycleGroupInFile: null, rows: [{ nombre: "A" }] });

  assert.throws(() => parseDatasetSource("not json", "data/companies/x.json"));
  assert.throws(() => parseDatasetSource("# no code block here", "public/data/empresas_tech_granada.md"));
});

test("parseDatasetSource preserves schemaVersion, status, reviewedAt and reviewedBy from the JSON envelope (issue #97)", () => {
  const envelope = JSON.stringify({
    cycleGroup: "AF",
    schemaVersion: 1,
    status: "pending_owner_review",
    reviewedAt: "2026-08-20",
    reviewedBy: "Claude session - pending Daniel's approval",
    companies: [{ nombre: "A" }],
  });
  assert.deepEqual(parseDatasetSource(envelope, "data/companies/administracion-finanzas.json"), {
    cycleGroupInFile: "AF",
    schemaVersion: 1,
    status: "pending_owner_review",
    reviewedAt: "2026-08-20",
    reviewedBy: "Claude session - pending Daniel's approval",
    rows: [{ nombre: "A" }],
  });

  // A JSON envelope missing the review fields must surface them as null
  // (present-but-missing), not silently omit them - validateDataset relies
  // on this to tell "legacy source" (undefined) apart from "envelope
  // source with an incomplete review block" (null).
  const incomplete = JSON.stringify({ cycleGroup: "MP", companies: [{ nombre: "A" }] });
  const parsedIncomplete = parseDatasetSource(incomplete, "data/companies/marketing-publicidad.json");
  assert.equal(parsedIncomplete.schemaVersion, null);
  assert.equal(parsedIncomplete.status, null);
  assert.equal(parsedIncomplete.reviewedAt, null);
  assert.equal(parsedIncomplete.reviewedBy, null);
});

test("validateDataset accepts a well-formed AF/MP/TSAF dataset (issue #97)", () => {
  for (const cycleGroup of ["AF", "MP", "TSAF"]) {
    const secondRow = makeRow({ nombre: "Segunda Empresa", web: "https://segunda-empresa.es/", fuente: "https://segunda-empresa.es/contacto" });
    const { errors, records } = validateDataset({ cycleGroupInFile: cycleGroup, rows: [makeRow(), secondRow], cycleGroup, ...validMetadata() });
    assert.deepEqual(errors, [], `unexpected errors for ${cycleGroup}: ${errors.join("; ")}`);
    assert.equal(records.length, 2);
    assert.equal(records[0].cycle_group, cycleGroup);
    assert.equal(records[0].id_slug, idSlugFor(cycleGroup, "Ejemplo Consultoría SL"));
  }
});

test("validateDataset rejects an unknown cycle group (issue #97)", () => {
  const { errors, records } = validateDataset({ cycleGroupInFile: null, rows: [makeRow()], cycleGroup: "MARKETING" });
  assert.match(errors.join("\n"), /Unknown cycle group/);
  assert.deepEqual(records, []);
});

test("validateDataset rejects a mismatch between the dataset's declared cycleGroup and --cycle-group (issue #97)", () => {
  const { errors } = validateDataset({ cycleGroupInFile: "MP", rows: [makeRow()], cycleGroup: "AF" });
  assert.match(errors.join("\n"), /declares cycleGroup="MP".*--cycle-group="AF"/);
});

test("validateDataset requires nombre, web, categoria, granada and fuente (issue #97)", () => {
  for (const field of ["nombre", "web", "categoria", "granada", "fuente"]) {
    const { errors } = validateDataset({ cycleGroupInFile: null, rows: [makeRow({ [field]: null })], cycleGroup: "AF" });
    assert.ok(errors.some((e) => e.includes(`${field} is required`)), `expected a "${field} is required" error, got: ${errors.join("; ")}`);
  }
});

test("validateDataset rejects non-http(s) web and blocked hosts, including LinkedIn and InfoJobs (issue #97)", () => {
  const badProtocol = validateDataset({ cycleGroupInFile: null, rows: [makeRow({ web: "ftp://example.com" })], cycleGroup: "AF" });
  assert.match(badProtocol.errors.join("\n"), /web must be an http\(s\) URL/);

  const linkedin = validateDataset({ cycleGroupInFile: null, rows: [makeRow({ web: "https://www.linkedin.com/company/example" })], cycleGroup: "AF" });
  assert.match(linkedin.errors.join("\n"), /web points to a job board\/social\/aggregator\/shortener host/);

  const infojobs = validateDataset({ cycleGroupInFile: null, rows: [makeRow({ web: "https://www.infojobs.net/empresa/example" })], cycleGroup: "AF" });
  assert.match(infojobs.errors.join("\n"), /web points to a job board\/social\/aggregator\/shortener host/);
});

test("validateDataset allows empleo to be absent, and validates it the same way as web when present (issue #97)", () => {
  const withoutEmpleo = validateDataset({ cycleGroupInFile: null, rows: [makeRow({ empleo: null, tipo_empleo: null })], cycleGroup: "AF", ...validMetadata() });
  assert.deepEqual(withoutEmpleo.errors, []);
  assert.equal(withoutEmpleo.records[0].empleo_url, null);

  const officialEmpleo = validateDataset({
    cycleGroupInFile: null,
    rows: [makeRow({ empleo: "https://ejemplo-consultoria.es/empleo", tipo_empleo: "Portal oficial" })],
    cycleGroup: "AF",
    ...validMetadata(),
  });
  assert.deepEqual(officialEmpleo.errors, []);
  assert.equal(officialEmpleo.records[0].empleo_url, "https://ejemplo-consultoria.es/empleo");

  const linkedinEmpleo = validateDataset({
    cycleGroupInFile: null,
    rows: [makeRow({ empleo: "https://www.linkedin.com/jobs/search?keywords=example", tipo_empleo: "LinkedIn búsqueda" })],
    cycleGroup: "AF",
  });
  assert.match(linkedinEmpleo.errors.join("\n"), /empleo points to a job board\/social\/aggregator\/shortener host/);

  const orphanTipoEmpleo = validateDataset({ cycleGroupInFile: null, rows: [makeRow({ empleo: null, tipo_empleo: "Portal oficial" })], cycleGroup: "AF" });
  assert.match(orphanTipoEmpleo.errors.join("\n"), /tipo_empleo is set but empleo is empty/);
});

test("validateDataset grandfathers DEV's historical LinkedIn/InfoJobs empleo links instead of rejecting the 69 existing rows (issue #97)", () => {
  const row = makeRow({ empleo: "https://www.linkedin.com/jobs/search/?keywords=Example", tipo_empleo: "LinkedIn búsqueda" });
  const dev = validateDataset({ cycleGroupInFile: null, rows: [row], cycleGroup: "DEV" });
  assert.deepEqual(dev.errors, [], `DEV must not reject historical LinkedIn empleo links: ${dev.errors.join("; ")}`);
  assert.equal(dev.records[0].empleo_url, "https://www.linkedin.com/jobs/search/?keywords=Example", "DEV's empleo_url must pass through unchanged");

  // The same row would be rejected for any new group - the grandfather
  // clause is DEV-only, not a general loosening of the policy.
  const af = validateDataset({ cycleGroupInFile: null, rows: [row], cycleGroup: "AF" });
  assert.match(af.errors.join("\n"), /empleo points to a job board\/social\/aggregator\/shortener host/);
});

test("validateDataset flags duplicate names/slugs as errors and duplicate domains as a warning (issue #97)", () => {
  const dupName = validateDataset({
    cycleGroupInFile: null,
    rows: [makeRow(), makeRow({ web: "https://otra-web.es/" })],
    cycleGroup: "AF",
  });
  assert.match(dupName.errors.join("\n"), /duplicate company name/);

  const dupDomain = validateDataset({
    cycleGroupInFile: null,
    rows: [makeRow(), makeRow({ nombre: "Otra Empresa Real", web: "https://ejemplo-consultoria.es/otra-pagina" })],
    cycleGroup: "AF",
    ...validMetadata(),
  });
  assert.deepEqual(dupDomain.errors, [], "a shared domain alone must not block the import");
  assert.match(dupDomain.warnings.join("\n"), /already uses domain/);
});

test("validateDataset refuses a slug that already exists in the database under a different cycle_group (issue #97)", () => {
  const { errors } = validateDataset({
    cycleGroupInFile: null,
    rows: [makeRow({ nombre: "Ya Existe" })],
    cycleGroup: "MP",
    existingIdentities: new Map([[idSlugFor("MP", "Ya Existe"), "AF"]]),
  });
  assert.match(errors.join("\n"), /already exists in the database under cycle_group="AF".*refusing to move it to "MP"/);
});

test("validateDataset does not write any records when any row is invalid - one bad row invalidates the whole file for the caller (issue #97)", () => {
  const { errors, records } = validateDataset({
    cycleGroupInFile: null,
    rows: [makeRow(), makeRow({ nombre: "Segunda", web: "https://www.linkedin.com/company/segunda" })],
    cycleGroup: "AF",
  });
  assert.ok(errors.length > 0);
  // records is still returned for diagnostics, but the importer (see
  // scripts/import-companies.mjs) checks errors.length before ever opening a
  // transaction, so a non-empty errors array must be treated as "write
  // nothing" by every caller.
  assert.ok(records.length < 2, "the invalid row must not produce a writable record");
});

test("validateDataset rejects javascript: and other non-http(s) fuente, mirroring the web policy (issue #97)", () => {
  const jsScheme = validateDataset({ cycleGroupInFile: null, rows: [makeRow({ fuente: "javascript:alert(1)" })], cycleGroup: "AF", ...validMetadata() });
  assert.match(jsScheme.errors.join("\n"), /fuente must be an http\(s\) URL/);
  assert.equal(jsScheme.records.length, 0, "a javascript: fuente must never produce a writable record");

  const badProtocol = validateDataset({ cycleGroupInFile: null, rows: [makeRow({ fuente: "ftp://example.com" })], cycleGroup: "AF", ...validMetadata() });
  assert.match(badProtocol.errors.join("\n"), /fuente must be an http\(s\) URL/);
});

test("validateDataset rejects fuente pointing to LinkedIn/InfoJobs for every group except DEV (issue #97)", () => {
  const linkedin = validateDataset({
    cycleGroupInFile: null,
    rows: [makeRow({ fuente: "https://www.linkedin.com/company/example" })],
    cycleGroup: "AF",
    ...validMetadata(),
  });
  assert.match(linkedin.errors.join("\n"), /fuente points to a job board\/social\/aggregator\/shortener host/);
  assert.equal(linkedin.records.length, 0);

  const infojobs = validateDataset({
    cycleGroupInFile: null,
    rows: [makeRow({ fuente: "https://www.infojobs.net/empresa/example" })],
    cycleGroup: "MP",
    ...validMetadata(),
  });
  assert.match(infojobs.errors.join("\n"), /fuente points to a job board\/social\/aggregator\/shortener host/);

  // DEV grandfather: 2 of the real 69 rows cite a LinkedIn/InfoJobs page as
  // their historical research source (public/data/empresas_tech_granada.md -
  // "FIDESOL" and "Minsait / Indra Group"). DEV needs no review envelope.
  const devRow = makeRow({ fuente: "https://www.linkedin.com/company/fidesol-centro-tecnologico/" });
  const dev = validateDataset({ cycleGroupInFile: null, rows: [devRow], cycleGroup: "DEV" });
  assert.deepEqual(dev.errors, [], `DEV must not reject a historical LinkedIn fuente: ${dev.errors.join("; ")}`);
});

test("validateDataset requires schemaVersion, status, reviewedAt and reviewedBy for every group except DEV (issue #97)", () => {
  for (const cycleGroup of ["AF", "MP", "TSAF"]) {
    const { errors } = validateDataset({ cycleGroupInFile: null, rows: [makeRow()], cycleGroup });
    assert.match(errors.join("\n"), /schemaVersion must be one of/, `${cycleGroup}: expected a schemaVersion error`);
    assert.match(errors.join("\n"), /status must be one of/, `${cycleGroup}: expected a status error`);
    assert.match(errors.join("\n"), /reviewedAt must be a valid/, `${cycleGroup}: expected a reviewedAt error`);
    assert.match(errors.join("\n"), /reviewedBy is required/, `${cycleGroup}: expected a reviewedBy error`);
  }

  // DEV predates this envelope entirely and must never require it.
  const dev = validateDataset({ cycleGroupInFile: null, rows: [makeRow()], cycleGroup: "DEV" });
  assert.deepEqual(dev.errors, [], `DEV must not require a review envelope: ${dev.errors.join("; ")}`);
});

test("validateDataset rejects an unsupported schemaVersion (issue #97)", () => {
  for (const bad of [2, 0, "1", null, undefined]) {
    const { errors } = validateDataset({ cycleGroupInFile: null, rows: [makeRow()], cycleGroup: "AF", ...validMetadata({ schemaVersion: bad }) });
    assert.match(errors.join("\n"), new RegExp(`schemaVersion must be one of ${SUPPORTED_SCHEMA_VERSIONS.join(", ")}`), `expected schemaVersion=${JSON.stringify(bad)} to be rejected`);
  }
});

test("validateDataset rejects an unrecognized status value (issue #97)", () => {
  const { errors } = validateDataset({ cycleGroupInFile: null, rows: [makeRow()], cycleGroup: "AF", ...validMetadata({ status: "looks_good_to_me" }) });
  assert.match(errors.join("\n"), new RegExp(`status must be one of ${ALLOWED_DATASET_STATUSES.join(", ")}`));
});

test("validateDataset rejects a malformed or impossible reviewedAt (issue #97)", () => {
  for (const bad of ["not-a-date", "2026-13-40", "2026-02-30", "25-08-2026", "2026-08-25T00:00:00Z", null, "", 20260825]) {
    const { errors } = validateDataset({ cycleGroupInFile: null, rows: [makeRow()], cycleGroup: "AF", ...validMetadata({ reviewedAt: bad }) });
    assert.match(errors.join("\n"), /reviewedAt must be a valid/, `expected reviewedAt=${JSON.stringify(bad)} to be rejected`);
    assert.equal(isValidReviewedAt(bad), false);
  }
  assert.equal(isValidReviewedAt("2026-08-25"), true);
});

test("validateDataset rejects a missing or blank reviewedBy (issue #97)", () => {
  for (const bad of [null, undefined, "", "   "]) {
    const { errors } = validateDataset({ cycleGroupInFile: null, rows: [makeRow()], cycleGroup: "AF", ...validMetadata({ reviewedBy: bad }) });
    assert.match(errors.join("\n"), /reviewedBy is required/, `expected reviewedBy=${JSON.stringify(bad)} to be rejected`);
  }
});

test("a pending_owner_review dataset always fails validation, dry-run or not - it is never writable (issue #97)", () => {
  const pending = validMetadata({ status: "pending_owner_review" });
  const secondRow = makeRow({ nombre: "Segunda Empresa", web: "https://segunda-empresa.es/", fuente: "https://segunda-empresa.es/contacto" });
  const { errors, records } = validateDataset({ cycleGroupInFile: "AF", rows: [makeRow(), secondRow], cycleGroup: "AF", ...pending });

  assert.match(errors.join("\n"), /status is "pending_owner_review" - the dataset must be status="approved"/);
  // The importer (scripts/import-companies.mjs) checks errors.length before
  // ever reaching the --dry-run branch or opening a transaction - so this
  // non-empty errors array is what makes "pending" unwritable in practice,
  // identically under --dry-run and under a real (non-dry-run) invocation.
  assert.ok(errors.length > 0);
  // The rows themselves are otherwise perfectly well-formed, proving it is
  // specifically the approval gate blocking the write, not broken data -
  // this is exactly what lets --dry-run usefully validate a pending dataset.
  assert.equal(records.length, 2, "well-formed rows still produce diagnostic records while pending; the importer's errors.length check is what blocks the write, not empty records");
});

test("a fully approved, valid dataset validates cleanly and reproduces identical records across repeated runs - idempotent import (issue #97)", () => {
  const approved = validMetadata({ status: "approved" });
  const rows = [makeRow(), makeRow({ nombre: "Segunda Empresa", web: "https://segunda-empresa.es/", fuente: "https://segunda-empresa.es/contacto" })];

  const firstRun = validateDataset({ cycleGroupInFile: "AF", rows, cycleGroup: "AF", ...approved });
  assert.deepEqual(firstRun.errors, [], `unexpected errors on an approved dataset: ${firstRun.errors.join("; ")}`);
  assert.equal(firstRun.records.length, 2);

  // Re-running the importer against the exact same approved source (a
  // retry, or CI re-running the same command) must target the exact same
  // rows every time - same `id`/`id_slug`/`sort_order` - because that is
  // what makes `ON CONFLICT (id_slug) DO UPDATE` in
  // scripts/import-companies.mjs a genuine no-op on the second run instead
  // of a duplicate or a drift.
  const secondRun = validateDataset({ cycleGroupInFile: "AF", rows, cycleGroup: "AF", ...approved });
  assert.deepEqual(secondRun.records, firstRun.records, "validating the same approved source twice must produce byte-identical records");
  assert.equal(firstRun.records[0].id, stableUuid("companies-v1", idSlugFor("AF", "Ejemplo Consultoría SL")));
});

test("import-companies.mjs forwards the review envelope into validateDataset and still gates every write on validation errors (issue #97)", async () => {
  const source = await readFile(new URL("../../../scripts/import-companies.mjs", import.meta.url), "utf8");

  assert.match(
    source,
    /\{ cycleGroupInFile, rows, schemaVersion, status, reviewedAt, reviewedBy \} = parseDatasetSource/,
    "the CLI must destructure the full review envelope out of parseDatasetSource's return value",
  );
  assert.match(
    source,
    /schemaVersion,\s*status,\s*reviewedAt,\s*reviewedBy,\s*\}\);/,
    "the CLI must forward the review envelope into validateDataset",
  );

  // The "no rows written on any error" gate must still run before both the
  // --dry-run branch and the BEGIN transaction - this is the single choke
  // point that makes an unapproved/invalid dataset unwritable regardless of
  // how it was invoked.
  const errorGateIndex = source.indexOf("if (errors.length > 0)");
  const dryRunIndex = source.indexOf("if (dryRun)");
  const beginIndex = source.indexOf('client.query("BEGIN")');
  assert.ok(errorGateIndex > -1 && dryRunIndex > -1 && beginIndex > -1, "expected to find the error gate, the --dry-run branch and the BEGIN transaction");
  assert.ok(errorGateIndex < dryRunIndex, "the errors.length gate must run before the --dry-run branch");
  assert.ok(dryRunIndex < beginIndex, "the --dry-run branch must return before any transaction is opened");
});
