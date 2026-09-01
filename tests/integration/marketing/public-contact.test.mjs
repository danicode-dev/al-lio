// Source-level assertion rationale: this verifies contact copy across static server-rendered and
// documentation surfaces without starting the full Next.js application.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(`../../../${path}`, import.meta.url), "utf8");

const publicContactSurfaces = [
  "src/features/legal/content/accessibility.tsx",
  "src/features/legal/content/contact.tsx",
  "src/features/legal/content/privacy.tsx",
  "src/components/landing/landing-footer.tsx",
  "README.md",
];

test("the public site publishes each verified AL-LÍO contact address for its intended purpose", async () => {
  const [contacts, contact, privacy, accessibility, footer] = await Promise.all([
    readSource("src/lib/public-contact.ts"),
    readSource("src/features/legal/content/contact.tsx"),
    readSource("src/features/legal/content/privacy.tsx"),
    readSource("src/features/legal/content/accessibility.tsx"),
    readSource("src/components/landing/landing-footer.tsx"),
  ]);

  assert.match(contacts, /general: "hola@al-lio\.app"/);
  assert.match(contacts, /support: "soporte@al-lio\.app"/);
  assert.match(contacts, /privacy: "privacidad@al-lio\.app"/);

  assert.equal(contact.match(/PUBLIC_CONTACT_EMAILS\.general/g)?.length, 4);
  assert.equal(contact.match(/PUBLIC_CONTACT_EMAILS\.support/g)?.length, 4);
  assert.equal(contact.match(/PUBLIC_CONTACT_EMAILS\.privacy/g)?.length, 4);
  assert.equal(contact.match(/mailto:summerofcode@aircury\.es/g)?.length, 2);

  assert.equal(privacy.match(/PUBLIC_CONTACT_EMAILS\.privacy/g)?.length, 4);
  assert.equal(accessibility.match(/PUBLIC_CONTACT_EMAILS\.support/g)?.length, 4);

  assert.match(footer, /PUBLIC_CONTACT_EMAILS\.general/);
});

test("no project-email placeholder remains on a public contact surface", async () => {
  const sources = await Promise.all(publicContactSurfaces.map(readSource));
  const combined = sources.join("\n");

  assert.doesNotMatch(combined, /\[correo del proyecto\]|\[project email\]/i);
});
