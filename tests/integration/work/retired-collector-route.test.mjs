import assert from "node:assert/strict";
import test from "node:test";

import { GET } from "../../../src/app/api/collect/route.ts";

test("The retired collector route remains an inert 410 compatibility boundary (issue #334)", async () => {
  const response = GET();

  assert.equal(response.status, 410);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), {
    error: "gone",
    detail: "This endpoint has been retired.",
  });
});
