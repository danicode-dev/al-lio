// Source-level assertion rationale: issue #373 makes the pending / error /
// success contract of every auth and onboarding form consistent and
// accessible through two shared primitives. The forms are React client
// components with useActionState; the plain Node runner cannot render them, so
// these assertions pin the wiring against the source until a component harness
// exists. Security behaviour (enumeration safety, session revocation, rate
// limiting) stays covered by production-auth / password-recovery / gate and is
// not re-tested here.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

const AUTH_FORMS = [
  "../../../src/components/auth/login-form.tsx",
  "../../../src/components/auth/register-form.tsx",
  "../../../src/components/auth/request-reset-form.tsx",
  "../../../src/components/auth/reset-password-form.tsx",
  "../../../src/components/onboarding/onboarding-form.tsx",
];
const ERROR_FORMS = AUTH_FORMS.filter((p) => !p.includes("request-reset-form")); // request-reset has no error state

test("FormAlert is one accessible error surface: announced, focus-managed, token-styled (issue #373)", async () => {
  const [component, globals] = await Promise.all([
    read("../../../src/components/ui/form-alert.tsx"),
    read("../../../src/app/globals.css"),
  ]);

  assert.match(component, /role="alert"/);
  assert.match(component, /tabIndex=\{-1\}/, "the alert must be programmatically focusable");
  assert.match(component, /useEffect\([\s\S]*?ref\.current\?\.focus\(\)[\s\S]*?\[message\]\)/, "focus must move to the alert when a message appears");
  assert.match(component, /if \(!message\) return null;/, "no empty box when there is nothing to say");
  assert.match(component, /className="al-form-alert"/);

  const rule = globals.slice(globals.indexOf(".al-form-alert {"), globals.indexOf(".al-form-alert:focus-visible"));
  assert.match(rule, /background: var\(--al-error-surface\)/);
  assert.match(rule, /color: var\(--al-error-text\)/);
  assert.doesNotMatch(rule, /#[0-9a-fA-F]{3,6}\b/, "the error surface uses the #362 semantic tokens, not raw hex");
});

test("every auth and onboarding form reports failure through FormAlert, none hand-rolls a red box (issue #373)", async () => {
  for (const path of ERROR_FORMS) {
    const src = await read(path);
    assert.match(src, /import \{ FormAlert \} from "@\/components\/ui\/form-alert"/, `${path} must use the shared FormAlert`);
    assert.match(src, /<FormAlert message=\{/, `${path} must render FormAlert for its error state`);
    assert.doesNotMatch(src, /#fecaca|#fef2f2|#dc2626/, `${path} must not keep the old red error palette`);
    assert.doesNotMatch(src, /className="auth-error"|className="onboarding-error"|role="alert"/, `${path} must delegate the alert to FormAlert, not re-declare one`);
  }

  // The recovery request is always a generic success - it has no error state
  // to surface, so it must not grow one.
  const requestReset = await read("../../../src/components/auth/request-reset-form.tsx");
  assert.doesNotMatch(requestReset, /FormAlert|state\.error/, "the enumeration-safe request form has no error branch");
});

test("every pending submit uses the shared Spinner, and it respects reduced motion (issue #373)", async () => {
  const [spinner, globals] = await Promise.all([
    read("../../../src/components/ui/spinner.tsx"),
    read("../../../src/app/globals.css"),
  ]);

  assert.match(spinner, /className="al-spinner"/);
  assert.match(spinner, /aria-hidden="true"/, "the graphic is decorative; the label carries the meaning");
  assert.match(spinner, /\{label\}/, "the label renders as text next to the spinner");

  assert.match(globals, /@keyframes al-spin/);
  assert.match(globals, /\.al-spinner \{[\s\S]*?animation: al-spin/);
  assert.match(globals, /prefers-reduced-motion: reduce\) \{\s*\n\s*\.al-spinner \{ animation-duration: 0s; \}/);

  for (const path of AUTH_FORMS) {
    const src = await read(path);
    assert.match(src, /import \{ Spinner \} from "@\/components\/ui\/spinner"/, `${path} must use the shared Spinner`);
    assert.match(src, /\?\s*\(?\s*<Spinner label="[^"]+" \/>/, `${path} must show the spinner while pending`);
  }

  // The bespoke inline spinner and its stray keyframes are gone from login.
  const login = await read("../../../src/components/auth/login-form.tsx");
  assert.doesNotMatch(login, /@keyframes spin|animation: "spin/, "login must not carry its own spinner animation any more");
});

test("auth and onboarding submits consume the canonical disabled-opacity token (issue #373)", async () => {
  const files = {
    "login-form.tsx": "../../../src/components/auth/login-form.tsx",
    "auth-page-shell.tsx": "../../../src/components/auth/auth-page-shell.tsx",
    "onboarding-form.tsx": "../../../src/components/onboarding/onboarding-form.tsx",
  };
  for (const [name, path] of Object.entries(files)) {
    const src = await read(path);
    assert.match(src, /:disabled \{ opacity: var\(--al-disabled-opacity\)/, `${name} must use --al-disabled-opacity`);
    assert.doesNotMatch(src, /:disabled \{ opacity: 0\.[0-9]/, `${name} must not hardcode a disabled opacity`);
  }
});

test("state polish did not disturb the guarded actions or the login card's own green treatment (issue #373)", async () => {
  const bindings = {
    "../../../src/components/auth/login-form.tsx": "loginWithPasswordAction",
    "../../../src/components/auth/register-form.tsx": "registerAction",
    "../../../src/components/auth/request-reset-form.tsx": "requestPasswordResetAction",
    "../../../src/components/auth/reset-password-form.tsx": "resetPasswordAction",
    "../../../src/components/onboarding/onboarding-form.tsx": "completeOnboardingAction",
  };
  for (const [path, action] of Object.entries(bindings)) {
    const src = await read(path);
    assert.match(src, new RegExp(`useActionState\\(\\s*${action}\\b`), `${path} must still drive ${action}`);
  }

  // The signed-out auth surface keeps its standalone green (issue #264 / #362
  // exclusion); this change only touched shared state primitives.
  const login = await read("../../../src/components/auth/login-form.tsx");
  assert.match(login, /background: #1F5B46/, "the login submit stays the standalone green fill");
  assert.match(login, /\/assets\/al_lio_symbol_transparent\.png/, "the login brand mark is unchanged");

  // Register's generic success copy stays enumeration-safe (one message for
  // every branch, no account-type disclosure).
  const register = await read("../../../src/components/auth/register-form.tsx");
  assert.doesNotMatch(register, /cuenta con contraseña|ya (est|existe)|no existe/i, "the confirmation must not reveal whether or how the account exists");
});
