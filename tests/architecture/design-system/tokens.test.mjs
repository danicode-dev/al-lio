// Migrated mechanically from tests/security-boundaries.test.mjs for issue #274.
// Source-level assertions temporarily protect a Next.js, browser, or database boundary that the plain Node runner cannot execute; replace them when the corresponding integration harness exists.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { readProductFeatureSources } from "../../helpers/feature-sources.mjs";
import { contrastRatio, readRootTokens, resolveColor } from "../../helpers/contrast.mjs";

const GLOBALS_CSS = new URL("../../../src/app/globals.css", import.meta.url);

test("globals.css's --primary and --ring are the brand terracotta, not the default shadcn blue (issue #82)", async () => {
  const css = await readFile(new URL("../../../src/app/globals.css", import.meta.url), "utf8");

  // The old shadcn default (214 84% 38%) must be gone everywhere in this file.
  assert.doesNotMatch(css, /214\s+84%\s+38%/);

  // #E15D2D converts to hsl(16, 75%, 53%) - both --primary and --ring must
  // use it, and --primary-foreground stays white (every existing hardcoded
  // terracotta+white button in the app already assumes white text).
  assert.match(css, /--primary:\s*16\s+75%\s+53%;/);
  assert.match(css, /--ring:\s*16\s+75%\s+53%;/);
  assert.match(css, /--primary-foreground:\s*0\s+0%\s+100%;/);

  // Only primary/ring/primary-foreground changed - every other token is
  // untouched (guards against scope creep into --accent/--destructive/etc.,
  // which the issue explicitly says to leave alone unless documented).
  for (const untouched of [
    "--background: 42 30% 97%",
    "--destructive: 0 72% 47%",
    "--accent: 154 26% 88%",
    "--muted: 210 18% 92%",
    "--border: 214 15% 84%",
  ]) {
    assert.match(css, new RegExp(untouched.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `expected ${untouched} to be unchanged`);
  }
});

test("the surviving #81/daily-alerts hardcoded terracotta overrides read the fixed --primary token instead of a second, parallel hex value (issue #82, bottom navigation retired by issue #182, /more retired by issue #256)", async () => {
  const dailyAlerts = await readFile(new URL("../../../src/components/daily-alerts.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(dailyAlerts, /#E15D2D|#e15d2d|#c94f21/, "no hardcoded terracotta hex should remain once the token itself carries the brand color");
  assert.match(dailyAlerts, /text-primary"/);
  assert.match(dailyAlerts, /al-action-soft-selected/);
  assert.match(dailyAlerts, /al-action-soft/);
  assert.match(dailyAlerts, /accent-primary/);

  // Light terracotta-tint icon badges (bg-[#FBE7DD]) are a deliberate
  // separate constant, not a --primary alpha blend - left as-is on purpose,
  // not missed. See docs/architecture/decisions or the PR for the exact
  // rationale (Tailwind's bg-primary/N opacity modifier does not reproduce
  // #FBE7DD exactly).
  assert.match(dailyAlerts, /#FBE7DD|#fbe7dd/i, "the light-tint badge background is expected to remain hardcoded");
});

test("UI primitives keep the brand focus token while the default Button consumes the shared quiet action treatment (issues #82 and #166)", async () => {
  const [button, input, select, textarea, featureSources] = await Promise.all([
    readFile(new URL("../../../src/components/ui/button.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../../src/components/ui/input.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../../src/components/ui/select.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../../src/components/ui/textarea.tsx", import.meta.url), "utf8"),
    readProductFeatureSources(),
  ]);

  assert.match(button, /variant === "default" && "al-action-soft"/);
  assert.match(input, /focus-visible:ring-ring/);
  assert.match(select, /focus-visible:ring-ring/);
  assert.match(textarea, /focus-visible:ring-ring/);
  assert.match(featureSources, /al-action-soft-selected/);
});

test("globals.css declares the semantic visual-token contract and shared primitives consume it, not retired or framework-default colours (issue #362)", async () => {
  const [css, button, badge, input, select, textarea, card] = await Promise.all([
    readFile(new URL("../../../src/app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../../../src/components/ui/button.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../../src/components/ui/badge.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../../src/components/ui/input.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../../src/components/ui/select.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../../src/components/ui/textarea.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../../src/components/ui/card.tsx", import.meta.url), "utf8"),
  ]);

  const root = css.slice(css.indexOf(":root {"), css.indexOf("\n  }"));

  // The contract exists as one authoritative block and names every semantic
  // role issue #362 lists. Values live here only; downstream files reference
  // the names, never a second copy of the value.
  assert.match(css, /Semantic visual-token contract \(issue #362\)/);
  for (const token of [
    "--al-surface-raised", "--al-surface-sunken",
    "--al-text-strong", "--al-text-body", "--al-text-muted",
    "--al-text-brand-strong", "--al-text-faint", "--al-text-brand",
    "--al-border", "--al-border-strong",
    "--al-success-surface", "--al-success-text",
    "--al-warning-surface", "--al-warning-text", "--al-warning-border",
    "--al-error-surface", "--al-error-text",
    "--al-info-surface", "--al-info-text",
    "--al-saved-surface", "--al-saved-text",
    "--al-completed-surface", "--al-completed-text", "--al-completed-border",
    "--al-state-neutral-surface",
    "--al-disabled-opacity",
  ]) {
    assert.ok(new RegExp(`${token}:\\s*\\S`).test(root), `contract is missing ${token}`);
  }

  // Lifecycle "completed" stays its own token even though it shares success's
  // green today - issue #362 forbids collapsing distinct states by colour.
  assert.notEqual(css.indexOf("--al-completed-surface"), -1);
  assert.notEqual(css.indexOf("--al-success-surface"), -1);
  assert.notEqual(css.indexOf("--al-completed-surface"), css.indexOf("--al-success-surface"));

  // Bright terracotta is reserved for non-text accents; the retired shadcn blue
  // must not reappear anywhere in the file.
  assert.match(root, /--al-text-brand:\s*#e15d2d;/i);
  assert.doesNotMatch(css, /214\s+84%\s+38%/);

  // Shared primitive CSS reads token names, not raw values.
  for (const [rule, tokenRef] of [
    [".al-page-header-title", "var(--al-text-strong)"],
    [".al-page-header-eyebrow", "var(--al-text-brand-strong)"],
    [".al-page-header-subtitle", "var(--al-text-muted)"],
    [".al-field-label", "var(--al-text-strong)"],
    [".al-listbox-trigger", "var(--al-border)"],
    [".al-catalog-status-pending", "var(--al-warning-surface)"],
    [".al-catalog-status-open", "var(--al-success-surface)"],
    [".al-catalog-status-dismissed", "var(--al-error-surface)"],
    [".al-catalog-status-review", "var(--al-saved-surface)"],
    [".al-catalog-status-complete", "var(--al-completed-surface)"],
  ]) {
    const start = css.indexOf(`${rule} {`);
    assert.notEqual(start, -1, `${rule} rule not found`);
    assert.ok(css.slice(start, start + 400).includes(tokenRef), `${rule} must consume ${tokenRef}`);
  }

  // The shared custom field keeps an explicit keyboard focus treatment that
  // reads the field focus token, and it is :focus-visible (not :focus).
  const focusStart = css.indexOf(".al-listbox-trigger:focus-visible {");
  assert.notEqual(focusStart, -1, ".al-listbox-trigger:focus-visible rule is missing");
  assert.match(css.slice(focusStart, focusStart + 200), /outline:[^;]*hsl\(var\(--ring\)\)/);
  assert.doesNotMatch(css, /\.al-listbox-trigger:focus\s*\{/, "must not fall back to a bare :focus treatment");

  // One disabled-opacity source: the token. Neither the Button primitive nor
  // the shared catalogue action re-encodes the number.
  assert.match(button, /disabled:opacity-\[var\(--al-disabled-opacity\)\]/, "Button must consume --al-disabled-opacity");
  assert.doesNotMatch(button, /opacity-50/, "Button must not re-encode the disabled opacity");
  const actionDisabled = css.indexOf(".al-catalog-action:disabled {");
  assert.ok(css.slice(actionDisabled, actionDisabled + 120).includes("var(--al-disabled-opacity)"));
  assert.equal((css.match(/--al-disabled-opacity:\s*[0-9.]+/g) ?? []).length, 1, "the literal disabled opacity is declared exactly once");

  // Shared .tsx primitives carry no raw hex and no framework-default palette;
  // they route through the Tailwind token utilities.
  for (const [name, source] of [["button", button], ["badge", badge], ["input", input], ["select", select], ["textarea", textarea], ["card", card]]) {
    assert.doesNotMatch(source, /#[0-9a-fA-F]{3,8}\b/, `${name}.tsx must not hardcode a hex colour`);
  }
  assert.match(button, /bg-destructive text-destructive-foreground/, "destructive stays a distinct treatment");
  assert.match(badge, /text-muted-foreground/);
  assert.match(card, /bg-card text-card-foreground/);
});

test("every foreground the visual-token contract declares meets its WCAG threshold on the surfaces it is documented for (issue #362)", async () => {
  const tokens = await readRootTokens(GLOBALS_CSS);
  const rgb = (name) => resolveColor(tokens[name] ?? `var(${name})`, tokens);

  // Contract structure only - which role sits on which surface, and at what
  // bar. The colour values are read from globals.css, never repeated here.
  const NORMAL_TEXT = 4.5;
  const NON_TEXT = 3;

  const textPairs = [
    ["--al-text-strong", ["--al-surface-raised", "--background", "--al-state-neutral-surface"]],
    ["--al-text-body", ["--al-surface-raised"]],
    ["--al-text-muted", ["--al-surface-raised", "--background", "--al-state-neutral-surface"]],
    ["--al-text-brand-strong", ["--al-surface-raised", "--background", "--al-saved-surface"]],
    ["--al-success-text", ["--al-success-surface"]],
    ["--al-warning-text", ["--al-warning-surface"]],
    ["--al-error-text", ["--al-error-surface"]],
    ["--al-info-text", ["--al-info-surface"]],
    ["--al-saved-text", ["--al-saved-surface"]],
    ["--al-completed-text", ["--al-completed-surface"]],
  ];
  const nonTextPairs = [
    ["--al-text-faint", ["--al-surface-raised"]],
    ["--al-text-brand", ["--al-surface-raised"]],
    ["--al-accent-strong", ["--al-surface-raised"]],
    ["--ring", ["--al-surface-raised", "--background"]],
    ["--al-action-soft-focus", ["--al-surface-raised", "--background"]],
  ];

  for (const [token, surfaces] of textPairs) {
    for (const surface of surfaces) {
      const ratio = contrastRatio(rgb(token), rgb(surface));
      assert.ok(
        ratio >= NORMAL_TEXT,
        `${token} on ${surface} is ${ratio.toFixed(2)}:1, below WCAG AA ${NORMAL_TEXT}:1`,
      );
    }
  }
  for (const [token, surfaces] of nonTextPairs) {
    for (const surface of surfaces) {
      const ratio = contrastRatio(rgb(token), rgb(surface));
      assert.ok(
        ratio >= NON_TEXT,
        `${token} on ${surface} is ${ratio.toFixed(2)}:1, below the ${NON_TEXT}:1 non-text minimum`,
      );
    }
  }

  // Bright --al-text-brand is deliberately NOT strong enough for normal text -
  // that is why --al-text-brand-strong exists. Guards against a future edit
  // routing body text back to the decorative accent.
  assert.ok(
    contrastRatio(rgb("--al-text-brand"), rgb("--al-surface-raised")) < NORMAL_TEXT,
    "--al-text-brand unexpectedly reaches text AA; fold it into --al-text-brand-strong if so",
  );
});
