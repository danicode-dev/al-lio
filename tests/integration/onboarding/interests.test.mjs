// Migrated mechanically from tests/security-boundaries.test.mjs for issue #274.
// Source-level assertions temporarily protect a Next.js, browser, or database boundary that the plain Node runner cannot execute; replace them when the corresponding integration harness exists.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Inactive interest questions are absent from onboarding and Profile without erasing the stored field (issue #192)", async () => {
  const [onboardingSource, profileSource, actionsSource, optionsSource, catalogSource, schemaSource] = await Promise.all([
    readFile(new URL("../../../src/components/onboarding/onboarding-form.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../../src/components/profile/profile-form.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../../src/lib/profile/onboarding-actions.ts", import.meta.url), "utf8"),
    readFile(new URL("../../../src/lib/profile/onboarding-options.ts", import.meta.url), "utf8"),
    readFile(new URL("../../../src/lib/db/repositories/fp_catalog.ts", import.meta.url), "utf8"),
    readFile(new URL("../../../infra/postgres/schema.sql", import.meta.url), "utf8"),
  ]);

  for (const source of [onboardingSource, profileSource]) {
    assert.doesNotMatch(source, /Te interesa|name="interests"|toggleInterest|ONBOARDING_INTEREST_OPTIONS/);
  }
  assert.doesNotMatch(actionsSource, /\binterests\b/, "saving onboarding or Profile must not overwrite historical interests");
  assert.doesNotMatch(optionsSource, /ONBOARDING_INTEREST_OPTIONS/, "the retired fixed option list must not remain as dead product logic");
  assert.doesNotMatch(catalogSource, /\binterests\b/, "catalog recommendations must not claim a dependency on inactive interest data");
  assert.match(schemaSource, /interests\s+text\[\]\s+not null default '\{\}'/, "the stored field remains available for a future personalized implementation");
});
