// Migrated mechanically from tests/security-boundaries.test.mjs for issue #274.

import assert from "node:assert/strict";

import test from "node:test";

import { cleanNewsText } from "../../../src/lib/news/text.ts";

test("news summaries remove active markup and respect the display limit", () => {
  assert.equal(
    cleanNewsText('<script>alert(1)</script><p>Official &amp; relevant update</p>'),
    "Official & relevant update",
  );
  assert.equal(cleanNewsText("A".repeat(400), 40), "A".repeat(40));
  assert.equal(cleanNewsText("   "), undefined);
});
