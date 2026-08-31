// Migrated mechanically from tests/security-boundaries.test.mjs for issue #274.
// Source-level assertions temporarily protect a Next.js, browser, or database boundary that the plain Node runner cannot execute; replace them when the corresponding integration harness exists.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("No user-facing 'Archivados' label survives anywhere in the app - Cursos and Eventos y retos were the only two", async () => {
  const source = await readFile(new URL("../../../src/components/guest-app.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /Archivados/, "every remaining reference to archiving must be the internal \"archivados\" key (lowercase), never the old user-visible label");
});
