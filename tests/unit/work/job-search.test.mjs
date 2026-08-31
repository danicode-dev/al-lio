// Migrated mechanically from tests/security-boundaries.test.mjs for issue #274.

import assert from "node:assert/strict";

import test from "node:test";

import { buildJobSearchUrl } from "../../../src/lib/deeplinks/job-search-urls.ts";
import { SPANISH_PROVINCES } from "../../../src/lib/deeplinks/spanish-provinces.ts";

test("SPANISH_PROVINCES lists exactly the 50 provinces plus Ceuta and Melilla, with no duplicates or blanks (issue #123)", () => {
  assert.equal(SPANISH_PROVINCES.length, 52);
  assert.equal(new Set(SPANISH_PROVINCES).size, 52, "no duplicate province names");
  for (const province of SPANISH_PROVINCES) {
    assert.ok(province.trim().length > 0, "no blank entries");
  }
  for (const name of ["Granada", "Madrid", "Barcelona", "Ceuta", "Melilla"]) {
    assert.ok(SPANISH_PROVINCES.includes(name), `${name} must be present`);
  }
});

test("buildJobSearchUrl treats \"Teletrabajo\" - the exact sentinel the new remote toggle sends - as remote for all 5 headline portals (issue #123)", () => {
  const linkedin = buildJobSearchUrl("LinkedIn", "programador java", "Teletrabajo");
  assert.match(linkedin, /f_WT=2/);
  assert.doesNotMatch(linkedin, /location=Teletrabajo/i);

  const infojobs = buildJobSearchUrl("InfoJobs", "programador java", "Teletrabajo");
  assert.match(infojobs, /telecommuting=1/);

  const tecnoempleo = buildJobSearchUrl("Tecnoempleo", "programador java", "Teletrabajo");
  assert.match(tecnoempleo, /[?&]pr=(&|$)/, "province param must be cleared, not literally \"Teletrabajo\"");

  const indeed = buildJobSearchUrl("Indeed", "programador java", "Teletrabajo");
  assert.match(decodeURIComponent(indeed), /teletrabajo/i);
  assert.match(decodeURIComponent(indeed), /q=programador java teletrabajo/i);

  const jooble = buildJobSearchUrl("Jooble", "programador java", "Teletrabajo");
  assert.match(decodeURIComponent(jooble), /teletrabajo/i);
});

test("buildJobSearchUrl still supports a real province name unchanged - the URL-building layer needed no changes for issue #123 (issue #97 gap analysis)", () => {
  const url = buildJobSearchUrl("InfoJobs", "programador java", "Granada");
  assert.match(url, /provinceIds=/);
  assert.doesNotMatch(url, /telecommuting=1/);
});
