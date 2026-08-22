import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { signSessionToken, verifySessionToken } from "../src/lib/auth/session-token.ts";
import { isValidRadarItemId } from "../src/lib/radar/item-id.ts";
import { createRadarSignature, radarSignaturesMatch } from "../src/lib/radar/signature.ts";
import { cleanNewsText } from "../src/lib/news/text.ts";
import {
  applicationIdSchema,
  applicationUpdateInputSchema,
  manualApplicationInputSchema,
} from "../src/lib/job-radar/validation.ts";

const validSessionSecret = "session-test-secret-with-32-characters";

async function withSessionEnvironment(callback) {
  const previousSecret = process.env.SESSION_SECRET;
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.SESSION_SECRET = validSessionSecret;
  process.env.NODE_ENV = "test";

  try {
    await callback();
  } finally {
    if (previousSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSecret;

    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
}

test("session tokens verify only with an intact signature and future expiry", async () => {
  await withSessionEnvironment(async () => {
    const payload = {
      uid: "11111111-1111-4111-8111-111111111111",
      email: "student@example.test",
      name: "Test Student",
      exp: Math.floor(Date.now() / 1000) + 300,
    };

    const token = await signSessionToken(payload);
    assert.deepEqual(await verifySessionToken(token), payload);

    const [body, signature] = token.split(".");
    const replacement = signature.startsWith("a") ? "b" : "a";
    const tamperedToken = `${body}.${replacement}${signature.slice(1)}`;
    assert.equal(await verifySessionToken(tamperedToken), null);
  });
});

test("expired and malformed session tokens are rejected", async () => {
  await withSessionEnvironment(async () => {
    const expired = await signSessionToken({
      uid: "22222222-2222-4222-8222-222222222222",
      email: "expired@example.test",
      exp: Math.floor(Date.now() / 1000) - 1,
    });

    assert.equal(await verifySessionToken(expired), null);
    assert.equal(await verifySessionToken("not-a-session-token"), null);
    assert.equal(await verifySessionToken(null), null);
  });
});

test("production session signing requires a sufficiently long secret", async () => {
  const previousSecret = process.env.SESSION_SECRET;
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.SESSION_SECRET = "too-short";
  process.env.NODE_ENV = "production";

  try {
    await assert.rejects(
      signSessionToken({
        uid: "33333333-3333-4333-8333-333333333333",
        email: "student@example.test",
        exp: Math.floor(Date.now() / 1000) + 300,
      }),
      /SESSION_SECRET/,
    );
  } finally {
    if (previousSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSecret;

    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

test("Radar signatures bind timestamp, delivery identifier and exact body", () => {
  const secret = "radar-test-secret-with-at-least-32-characters";
  const timestamp = "2026-08-22T10:00:00.000Z";
  const deliveryId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const body = '{"schemaVersion":2,"items":[]}';
  const signature = createRadarSignature(secret, timestamp, deliveryId, body);

  assert.match(signature, /^v1=[0-9a-f]{64}$/);
  assert.equal(radarSignaturesMatch(signature, signature), true);
  assert.equal(
    radarSignaturesMatch(signature, createRadarSignature(secret, timestamp, deliveryId, `${body} `)),
    false,
  );
  assert.equal(radarSignaturesMatch(signature, "v1=invalid"), false);
});

test("Radar item identifiers stay inside the PostgreSQL bigint boundary", () => {
  assert.equal(isValidRadarItemId("1"), true);
  assert.equal(isValidRadarItemId("0001"), true);
  assert.equal(isValidRadarItemId("9223372036854775807"), true);
  assert.equal(isValidRadarItemId("9223372036854775808"), false);
  assert.equal(isValidRadarItemId("-1"), false);
  assert.equal(isValidRadarItemId("1 OR 1=1"), false);
});

test("news summaries remove active markup and respect the display limit", () => {
  assert.equal(
    cleanNewsText('<script>alert(1)</script><p>Official &amp; relevant update</p>'),
    "Official & relevant update",
  );
  assert.equal(cleanNewsText("A".repeat(400), 40), "A".repeat(40));
  assert.equal(cleanNewsText("   "), undefined);
});

test("manual job applications accept only bounded HTTPS input", () => {
  const valid = manualApplicationInputSchema.safeParse({
    company_name: "Example Company",
    company_url: "https://example.com/careers",
    job_title: "Junior Developer",
    job_url: "https://example.com/jobs/123",
  });
  assert.equal(valid.success, true);

  for (const companyUrl of ["http://example.com", "javascript:alert(1)", "data:text/html,test"]) {
    assert.equal(
      manualApplicationInputSchema.safeParse({
        company_name: "Example Company",
        company_url: companyUrl,
        job_title: "Junior Developer",
      }).success,
      false,
    );
  }
});

test("job application updates reject invalid identifiers and states", () => {
  assert.equal(applicationIdSchema.safeParse("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa").success, true);
  assert.equal(applicationIdSchema.safeParse("1 OR 1=1").success, false);
  assert.equal(applicationUpdateInputSchema.safeParse({ status: "aplicada" }).success, true);
  assert.equal(applicationUpdateInputSchema.safeParse({ status: "invalid" }).success, false);
  assert.equal(applicationUpdateInputSchema.safeParse({ note: "" }).success, false);
});

test("Job Radar API routes use non-redirecting authentication and generic errors", async () => {
  const routes = [
    "src/app/api/job-radar/route.ts",
    "src/app/api/job-radar/[id]/route.ts",
    "src/app/api/job-radar/sync/route.ts",
  ];

  for (const route of routes) {
    const source = await readFile(new URL(`../${route}`, import.meta.url), "utf8");
    assert.match(source, /tryGetCurrentUserId/);
    assert.match(source, /status:\s*401/);
    assert.doesNotMatch(source, /\bgetCurrentUserId\b/);
    assert.doesNotMatch(source, /error:\s*String\(/);
  }
});

test("learning saves do not invalidate or recreate the active video route", async () => {
  const [actionsSource, playerHookSource] = await Promise.all([
    readFile(new URL("../src/lib/learning/actions.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/ruta/use-youtube-player.ts", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(actionsSource, /revalidatePath\(`\/aprende\//);
  assert.doesNotMatch(
    playerHookSource,
    /\[youtubeRef\?\.type,\s*youtubeRef\?\.id,\s*initialTimeSeconds/,
  );
});

test("learning notes are saved atomically and mirrored to Bloc", async () => {
  const [actionsSource, repositorySource] = await Promise.all([
    readFile(new URL("../src/lib/learning/actions.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/db/repositories/learning.ts", import.meta.url), "utf8"),
  ]);

  assert.match(actionsSource, /addLearningNoteToBloc/);
  assert.match(repositorySource, /withTransaction/);
  assert.match(repositorySource, /INSERT INTO public\.fp_learning_notes/);
  assert.match(repositorySource, /INSERT INTO public\.bloc_notes/);
  assert.match(repositorySource, /ON CONFLICT \(user_id, source_type, source_id\)/);
});
