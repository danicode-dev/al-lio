// Executable coverage for the landing ecosystem-diagram content model, plus a
// source-level check of bilingual module-copy parity (issue #374).
//
// Source-level assertion rationale: the landing i18n dictionary is a large
// React/JSX module the plain Node runner cannot import; the parity assertion
// scans its text. The structural model (LANDING_MODULES) is framework-free and
// is executed directly.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { LANDING_MODULES } from "../../../src/features/marketing/domain/modules.ts";

const MODULE_KEYS = ["tareas", "calendario", "cursos", "bloc", "eventos", "trabajo", "noticias", "competencias"];

test("LANDING_MODULES is the eight app areas, each with an icon, split evenly between the two columns", () => {
  assert.equal(LANDING_MODULES.length, 8);
  assert.deepEqual([...LANDING_MODULES].map((module) => module.key).sort(), [...MODULE_KEYS].sort());
  assert.equal(new Set(LANDING_MODULES.map((module) => module.key)).size, 8, "keys are unique");
  assert.equal(LANDING_MODULES.filter((module) => module.side === "left").length, 4);
  assert.equal(LANDING_MODULES.filter((module) => module.side === "right").length, 4);
  assert.ok(LANDING_MODULES.every((module) => module.icon), "every module carries a diagram icon");
});

test("the landing dictionary gives every module a label and description in both Spanish and English", async () => {
  const i18n = await readFile(new URL("../../../src/components/landing/i18n.ts", import.meta.url), "utf8");
  for (const key of MODULE_KEYS) {
    const entries = i18n.match(new RegExp(`\\b${key}: \\{ label: "[^"]+", description: "[^"]+" \\}`, "g")) ?? [];
    assert.equal(entries.length, 2, `${key} must appear once in the Spanish and once in the English module block`);
  }
});
