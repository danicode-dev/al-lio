// Executable coverage for the pure legal route registry (issue #374).
// LEGAL_ROUTES is framework- and JSX-free, so this runs it directly instead of
// scanning route source text. The `getLegalMetadata` derivation on top of it is
// pinned source-level in tests/architecture/legal/route-wiring.test.mjs.

import assert from "node:assert/strict";
import test from "node:test";

import { LEGAL_ROUTES } from "../../../src/features/legal/routes.ts";

const LEGAL_NAMES = ["accessibility", "contact", "cookies", "privacy", "project", "terms"];

// The established Spanish slugs are frozen (non-goal: "Replacing the
// established Spanish route slugs").
const ES_SLUG = {
  accessibility: "/accesibilidad",
  contact: "/contacto",
  cookies: "/cookies",
  privacy: "/privacidad",
  project: "/proyecto",
  terms: "/terminos",
};

test("LEGAL_ROUTES registers exactly the six documents, each with a Spanish and an English variant", () => {
  assert.deepEqual(Object.keys(LEGAL_ROUTES).sort(), [...LEGAL_NAMES].sort());
  for (const name of LEGAL_NAMES) {
    assert.deepEqual(Object.keys(LEGAL_ROUTES[name]).sort(), ["en", "es"]);
    for (const lang of ["es", "en"]) {
      const route = LEGAL_ROUTES[name][lang];
      for (const field of ["metadataTitle", "href", "altHref", "title", "kicker"]) {
        assert.equal(typeof route[field], "string", `${name}.${lang}.${field}`);
        assert.ok(route[field].trim().length > 0, `${name}.${lang}.${field} is non-empty`);
      }
    }
  }
});

test("every document's two variants are bilingual mirrors: /en prefixes the frozen Spanish slug and altHref cross-links", () => {
  for (const name of LEGAL_NAMES) {
    const { es, en } = LEGAL_ROUTES[name];
    assert.equal(es.href, ES_SLUG[name], `${name} keeps its established Spanish slug`);
    assert.doesNotMatch(es.href, /^\/en\//, `${name} Spanish href is not under /en`);
    assert.equal(en.href, `/en${es.href}`, `${name} English href is /en + the Spanish slug`);
    assert.equal(es.altHref, en.href, `${name} Spanish altHref points at the English route`);
    assert.equal(en.altHref, es.href, `${name} English altHref points back at the Spanish route`);
  }
});

test("the metadata titles differ per language except where the term is shared", () => {
  for (const name of LEGAL_NAMES) {
    const { es, en } = LEGAL_ROUTES[name];
    if (name === "cookies") {
      assert.equal(es.metadataTitle, en.metadataTitle, "Cookies is the same word in both languages");
    } else {
      assert.notEqual(es.metadataTitle, en.metadataTitle, `${name} has a translated metadata title`);
    }
  }
});
