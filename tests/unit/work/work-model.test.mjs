// Executable coverage for the pure Work state helpers extracted from
// work-feature.tsx in issue #369.

import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveQuickSearchFields,
  filterApplicationsByStatus,
  filterCompanies,
  firstQuickSearchPerPlatform,
  normalizeVerifiedJobsPayload,
} from "../../../src/features/work/client/work-model.ts";

test("deriveQuickSearchFields maps a bare Teletrabajo location to the remote switch", () => {
  assert.deepEqual(deriveQuickSearchFields(undefined), { keyword: "", province: "", remote: false });
  assert.deepEqual(
    deriveQuickSearchFields({ keyword: "java", location: "Teletrabajo" }),
    { keyword: "java", province: "", remote: true },
  );
  // Accents and case are ignored when detecting the remote sentinel.
  assert.deepEqual(
    deriveQuickSearchFields({ keyword: "java", location: "  teletrabájo " }),
    { keyword: "java", province: "", remote: true },
  );
});

test("deriveQuickSearchFields pre-selects any other non-empty location as the province", () => {
  assert.deepEqual(
    deriveQuickSearchFields({ keyword: "dev", location: "Granada" }),
    { keyword: "dev", province: "Granada", remote: false },
  );
  assert.deepEqual(
    deriveQuickSearchFields({ keyword: "dev", location: null }),
    { keyword: "dev", province: "", remote: false },
  );
  assert.deepEqual(
    deriveQuickSearchFields({ keyword: "dev", location: "" }),
    { keyword: "dev", province: "", remote: false },
  );
});

test("firstQuickSearchPerPlatform keeps the first saved search per platform", () => {
  const rows = [
    { platform: "LinkedIn", keyword: "a", location: null },
    { platform: "LinkedIn", keyword: "b", location: "Granada" },
    { platform: "Indeed", keyword: "c", location: null },
  ];
  const map = firstQuickSearchPerPlatform(rows);
  assert.deepEqual(Object.keys(map).sort(), ["Indeed", "LinkedIn"]);
  assert.equal(map.LinkedIn.keyword, "a");
  assert.equal(map.Indeed.keyword, "c");
});

test("filterCompanies applies the favourites view and a case-insensitive name/category search", () => {
  const companies = [
    { id: "1", nombre: "Acme Robotics", categoria: "Hardware", is_favorite: true },
    { id: "2", nombre: "Globex", categoria: "Consultoría de software", is_favorite: false },
    { id: "3", nombre: "Initech", categoria: null, is_favorite: true },
  ];

  assert.deepEqual(
    filterCompanies(companies, { search: "", favoritesOnly: false }).map((c) => c.id),
    ["1", "2", "3"],
  );
  assert.deepEqual(
    filterCompanies(companies, { search: "", favoritesOnly: true }).map((c) => c.id),
    ["1", "3"],
  );
  assert.deepEqual(
    filterCompanies(companies, { search: "  SOFTWARE ", favoritesOnly: false }).map((c) => c.id),
    ["2"],
  );
  assert.deepEqual(
    filterCompanies(companies, { search: "initech", favoritesOnly: false }).map((c) => c.id),
    ["3"],
  );
});

test("filterApplicationsByStatus returns everything for an empty status and matches exactly otherwise", () => {
  const apps = [
    { id: "a", status: "applied" },
    { id: "b", status: "interview" },
    { id: "c", status: "applied" },
  ];
  assert.deepEqual(filterApplicationsByStatus(apps, "").map((a) => a.id), ["a", "b", "c"]);
  assert.deepEqual(filterApplicationsByStatus(apps, "applied").map((a) => a.id), ["a", "c"]);
  assert.deepEqual(filterApplicationsByStatus(apps, "offer").map((a) => a.id), []);
});

test("normalizeVerifiedJobsPayload coerces a missing or malformed payload to the disabled/empty state", () => {
  assert.deepEqual(normalizeVerifiedJobsPayload(undefined), { enabled: false, jobs: [] });
  assert.deepEqual(normalizeVerifiedJobsPayload(null), { enabled: false, jobs: [] });
  assert.deepEqual(normalizeVerifiedJobsPayload({}), { enabled: false, jobs: [] });
  assert.deepEqual(normalizeVerifiedJobsPayload({ enabled: 1, jobs: "nope" }), { enabled: true, jobs: [] });

  const jobs = [{ id: "j1" }, { id: "j2" }];
  assert.deepEqual(normalizeVerifiedJobsPayload({ enabled: true, jobs }), { enabled: true, jobs });
});
