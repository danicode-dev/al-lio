// Source-level assertion rationale: the transactional email HTML is a pure
// string builder with no runtime behaviour to execute; asserting on the
// source keeps the brand palette from drifting back to the old orange
// without standing up a mail-rendering harness.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readTemplates = () =>
  readFile(new URL("../../../src/lib/email/templates.ts", import.meta.url), "utf8");

test("transactional emails use the green AL-LÍO palette, never the retired orange (issue #291)", async () => {
  const source = await readTemplates();

  assert.doesNotMatch(source, /#E15D2D|#e15d2d|#E9A23B|#e9a23b/, "no orange/amber may remain in the email templates");
  assert.match(source, /background:#1F5B46;color:#ffffff;/, "the solid button is the standalone green fill");
  assert.match(source, /height:3px;background:#1F5B46/, "the card keeps the green top accent used by the login card");
  assert.match(source, /background:#F7F3EC/, "the email ground is the same cream as the login page");
  assert.doesNotMatch(source, /Menos planes\. Más acción\.|Granada, España/, "the retired slogan/locality lockup is gone");
  assert.match(
    source,
    /Proyecto desarrollado gracias a la beca Aircury Summer of Code 2026 de Aircury SL\./,
    "the footer matches the login and landing footer",
  );
});

test("the palette change did not touch the delivery path or the safety contract (issue #291)", async () => {
  const [templates, send] = await Promise.all([
    readTemplates(),
    readFile(new URL("../../../src/lib/email/send.ts", import.meta.url), "utf8"),
  ]);

  // Still exactly three templates, each still returning a plain-text part.
  assert.equal((templates.match(/text: `/g) ?? []).length, 3);
  for (const fn of ["confirmEmailTemplate", "passwordResetTemplate", "alreadyRegisteredTemplate"]) {
    assert.match(templates, new RegExp(`export function ${fn}\\(`));
  }
  // The recipient email is still the only interpolated value and still escaped.
  assert.equal((templates.match(/const safeEmail = escapeHtml\(email\);/g) ?? []).length, 2);
  // send.ts is untouched by this change.
  assert.match(send, /text: params\.text,/);
  assert.doesNotMatch(send, /console\.(log|error)\([^)]*params\.html/);
});
