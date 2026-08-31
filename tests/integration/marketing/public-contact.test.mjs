// Source-level assertion rationale: this verifies contact copy across static server-rendered and
// documentation surfaces without starting the full Next.js application.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(`../../../${path}`, import.meta.url), "utf8");

const publicContactSurfaces = [
  "src/app/(legal)/accesibilidad/page.tsx",
  "src/app/(legal)/contacto/page.tsx",
  "src/app/(legal)/privacidad/page.tsx",
  "src/app/en/accesibilidad/page.tsx",
  "src/app/en/contacto/page.tsx",
  "src/app/en/privacidad/page.tsx",
  "src/components/landing/landing-footer.tsx",
  "README.md",
];

test("the public site publishes each verified AL-LÍO contact address for its intended purpose", async () => {
  const [contacts, esContact, enContact, esPrivacy, enPrivacy, esAccessibility, enAccessibility, footer] =
    await Promise.all([
      readSource("src/lib/public-contact.ts"),
      readSource("src/app/(legal)/contacto/page.tsx"),
      readSource("src/app/en/contacto/page.tsx"),
      readSource("src/app/(legal)/privacidad/page.tsx"),
      readSource("src/app/en/privacidad/page.tsx"),
      readSource("src/app/(legal)/accesibilidad/page.tsx"),
      readSource("src/app/en/accesibilidad/page.tsx"),
      readSource("src/components/landing/landing-footer.tsx"),
    ]);

  assert.match(contacts, /general: "hola@al-lio\.app"/);
  assert.match(contacts, /support: "soporte@al-lio\.app"/);
  assert.match(contacts, /privacy: "privacidad@al-lio\.app"/);

  for (const source of [esContact, enContact]) {
    assert.match(source, /PUBLIC_CONTACT_EMAILS\.general/);
    assert.match(source, /PUBLIC_CONTACT_EMAILS\.support/);
    assert.match(source, /PUBLIC_CONTACT_EMAILS\.privacy/);
    assert.match(source, /mailto:summerofcode@aircury\.es/);
  }

  for (const source of [esPrivacy, enPrivacy]) {
    assert.match(source, /PUBLIC_CONTACT_EMAILS\.privacy/);
  }

  for (const source of [esAccessibility, enAccessibility]) {
    assert.match(source, /PUBLIC_CONTACT_EMAILS\.support/);
  }

  assert.match(footer, /PUBLIC_CONTACT_EMAILS\.general/);
});

test("no project-email placeholder remains on a public contact surface", async () => {
  const sources = await Promise.all(publicContactSurfaces.map(readSource));
  const combined = sources.join("\n");

  assert.doesNotMatch(combined, /\[correo del proyecto\]|\[project email\]/i);
});
