// Source-level assertion rationale: the twelve legal route files are Next.js
// App Router pages that cannot be rendered by the plain Node runner. These
// assertions pin that every Spanish route has an English counterpart, that
// both compose the shared Legal public API with a matching document name and
// language, and that canonical/alternate metadata is derived from the pure
// route registry rather than the rendered document body (issue #374).

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../../${path}`, import.meta.url), "utf8");

// document name -> the frozen Spanish slug used for both the (legal)/ and en/ folders
const DOCUMENTS = {
  accessibility: "accesibilidad",
  contact: "contacto",
  cookies: "cookies",
  privacy: "privacidad",
  project: "proyecto",
  terms: "terminos",
};

test("every Spanish legal route has an English counterpart, both composing the Legal public API with a matching name/lang", async () => {
  for (const [name, slug] of Object.entries(DOCUMENTS)) {
    for (const [lang, path] of [
      ["es", `src/app/(legal)/${slug}/page.tsx`],
      ["en", `src/app/en/${slug}/page.tsx`],
    ]) {
      const source = await read(path);
      assert.match(source, /from "@\/features\/legal"/, `${path} must import the Legal public entry point`);
      assert.match(
        source,
        new RegExp(`getLegalMetadata\\("${name}", "${lang}"\\)`),
        `${path} must export metadata for ${name}/${lang}`,
      );
      assert.match(
        source,
        new RegExp(`<LegalDocumentPage name="${name}" lang="${lang}" />`),
        `${path} must render the ${name}/${lang} document`,
      );
      assert.doesNotMatch(source, /getValidatedSession|requireAdminUser/, `${path} is a public page, not gated`);
    }
  }
});

test("the content registry exposes exactly the six documents named by the type", async () => {
  const [registry, types] = await Promise.all([
    read("src/features/legal/content/index.ts"),
    read("src/features/legal/types.ts"),
  ]);
  for (const name of Object.keys(DOCUMENTS)) {
    assert.match(registry, new RegExp(`\\b${name}:`), `content/index.ts registers ${name}`);
    assert.match(types, new RegExp(`"${name}"`), `LegalDocumentName includes ${name}`);
  }
  assert.match(registry, /satisfies Record<LegalDocumentName, LegalDocument>/, "the registry is checked against the name union");
});

test("legal metadata is derived from the pure route registry, not from the rendered document body", async () => {
  const metadata = await read("src/features/legal/metadata.ts");
  assert.match(metadata, /import \{ LEGAL_ROUTES \} from "@\/features\/legal\/routes"/);
  assert.doesNotMatch(metadata, /legalDocuments/, "getLegalMetadata must not pull the JSX content modules");
  assert.match(metadata, /canonical: route\[lang\]\.href/);
  assert.match(metadata, /es: route\.es\.href/);
  assert.match(metadata, /en: route\.en\.href/);
});
