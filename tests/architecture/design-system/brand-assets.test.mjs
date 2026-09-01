// Source-level assertion rationale: this is a static-asset architecture guard
// for issue #359. The risk it protects is a canonical brand file being deleted,
// an active asset reference silently breaking, or a reference to a retired
// variant coming back. None of that has a runtime boundary the plain Node
// runner can execute, so inspecting the file tree and source text is the
// correct boundary (taxonomy option 5/6). Keep it in sync with
// public/assets/README.md.

import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");
const rel = (path) => relative(root, path).split(sep).join("/");

// Canonical brand assets: one per supported context. Removing any of these is
// a breaking change and must update this list and public/assets/README.md.
const CANONICAL_ASSETS = [
  "public/assets/al_lio_icon_black.png",
  "src/app/icon.png",
  "public/assets/al_lio_logo_horizontal.png",
  "public/assets/al_lio_logo_horizontal_transparent.png",
  "public/assets/al_lio_symbol.png",
  "public/assets/al_lio_symbol_transparent.png",
  "public/assets/al_lio_wordmark.png",
  "public/assets/al_lio_kinetic_background_dark.png",
];

// Every active consumer found in the #359 audit: the file must still exist and
// still name the asset, so a rename or move cannot silently 404 in production.
const ACTIVE_REFERENCES = [
  ["src/app/layout.tsx", "/assets/al_lio_icon_black.png"],
  ["src/app/manifest.ts", "/assets/al_lio_icon_black.png"],
  ["src/app/favicon.ico/route.ts", "al_lio_icon_black.png"],
  ["src/features/marketing/presentation/ecosystem-diagram.tsx", "/assets/al_lio_icon_black.png"],
  ["src/components/app-sidebar.tsx", "/assets/al_lio_logo_horizontal.png"],
  ["src/components/app-sidebar.tsx", "/assets/al_lio_symbol.png"],
  ["src/components/mobile-header-navigation.tsx", "/assets/al_lio_logo_horizontal.png"],
  ["src/components/onboarding/onboarding-brand-panel.tsx", "/assets/al_lio_logo_horizontal_transparent.png"],
  ["src/components/auth/auth-page-shell.tsx", "/assets/al_lio_symbol_transparent.png"],
  ["src/components/auth/login-form.tsx", "/assets/al_lio_symbol_transparent.png"],
  ["src/components/landing/landing-header.tsx", "/assets/al_lio_wordmark.png"],
  ["src/components/landing/landing-footer.tsx", "/assets/al_lio_wordmark.png"],
  ["src/lib/email/templates.ts", "/assets/al_lio_wordmark.png"],
  ["src/components/dashboard/dashboard-next-step.tsx", "/assets/al_lio_kinetic_background_dark.png"],
];

// Retired by #359: the file must be gone and no source file may reference it
// again (a stale import path would 404 at runtime).
const RETIRED_ASSETS = [
  { path: "public/al-lio-logo.png", token: "al-lio-logo.png" },
  { path: "public/assets/al_lio_favicon_dark_circle_512.png", token: "al_lio_favicon_dark_circle_512" },
  { path: "public/assets/al_lio_logo_horizontal_white_transparent.png", token: "al_lio_logo_horizontal_white_transparent" },
  { path: "public/assets/al_lio_logo_slogan_transparente_1060x360.png", token: "al_lio_logo_slogan_transparente" },
];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx|js|jsx|mjs|css)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const sourceFiles = walk(join(root, "src"));

test("issue #359: every canonical brand asset still exists", () => {
  for (const asset of CANONICAL_ASSETS) {
    assert.ok(existsSync(join(root, asset)), `canonical brand asset is missing: ${asset}`);
  }
});

test("issue #359: the App Router favicon stays byte-identical to the canonical mark", () => {
  const iconFile = readFileSync(join(root, "src/app/icon.png"));
  const canonical = readFileSync(join(root, "public/assets/al_lio_icon_black.png"));
  assert.ok(iconFile.equals(canonical), "src/app/icon.png must be a byte copy of public/assets/al_lio_icon_black.png");
});

test("issue #359: every active brand-asset reference still resolves", () => {
  for (const [file, token] of ACTIVE_REFERENCES) {
    assert.ok(existsSync(join(root, file)), `consumer file is missing: ${file}`);
    assert.ok(read(file).includes(token), `${file} no longer references ${token}`);
  }
});

test("issue #359: retired brand variants stay deleted and unreferenced", () => {
  for (const { path, token } of RETIRED_ASSETS) {
    assert.equal(existsSync(join(root, path)), false, `retired asset came back: ${path}`);
  }
  for (const file of sourceFiles) {
    const source = readFileSync(file, "utf8");
    for (const { token, path } of RETIRED_ASSETS) {
      assert.equal(source.includes(token), false, `${rel(file)} references retired asset ${path} (token "${token}")`);
    }
  }
});

test("issue #359: public/assets/README.md documents every al_lio_* brand file present", () => {
  const readme = read("public/assets/README.md");
  const brandFiles = readdirSync(join(root, "public/assets")).filter((name) => /^al_lio_.*\.(png|jpg|jpeg|svg)$/.test(name));
  assert.ok(brandFiles.length >= 7, `expected the al_lio_* brand family, found ${brandFiles.length} files`);
  for (const name of brandFiles) {
    assert.ok(readme.includes(name), `public/assets/README.md does not document ${name}`);
  }
  // The root-level legacy logo must not silently reappear undocumented.
  if (existsSync(join(root, "public/al-lio-logo.png"))) {
    assert.ok(readme.includes("al-lio-logo.png"), "public/al-lio-logo.png exists but is not documented");
  }
});
