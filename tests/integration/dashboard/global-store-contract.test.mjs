import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Source-level assertion rationale: getGlobalStore is a cached Next.js server
// boundary coupled to authentication and PostgreSQL. This focused contract test
// verifies its client payload without inventing a second runtime composition.
test("The global store omits dormant opportunity, quick-link and reminder fields (issue #340)", async () => {
  const [dataSource, storeTypes] = await Promise.all([
    readFile(new URL("../../../src/lib/data.ts", import.meta.url), "utf8"),
    readFile(new URL("../../../src/components/store/types.ts", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(dataSource, /\bgetOpportunitiesByUser\b/);
  assert.doesNotMatch(dataSource, /\bgetQuickLinksByUser\b/);
  for (const field of ["opportunities", "links", "reminders"]) {
    assert.doesNotMatch(dataSource, new RegExp(`^\\s{4}${field}:`, "m"));
    assert.doesNotMatch(storeTypes, new RegExp(`^\\s{2}${field}:`, "m"));
  }
  assert.doesNotMatch(storeTypes, /export type (?:Opportunity|QuickLink)\b/);

  // These similarly named catalogue slices are active and must not be
  // confused with the retired user-opportunity field.
  assert.match(dataSource, /^\s{4}techOpportunities:/m);
  assert.match(dataSource, /^\s{4}fpContent:/m);
  assert.match(storeTypes, /^\s{2}techOpportunities: TechOpportunity\[\];/m);
  assert.match(storeTypes, /^\s{2}fpContent: FpCatalogItem\[\];/m);
});
