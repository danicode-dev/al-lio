import { test, expect } from "./support/fixtures";
import type { Page } from "@playwright/test";

// The synthetic profiles are provisioned as cycle DAW / year 1 (see
// support/fixtures.ts). This journey moves user A to DAM / year 2, proves the
// change is served from PostgreSQL after a reload, and proves user B still sees
// their own untouched profile.
const START_CYCLE = "Desarrollo de Aplicaciones Web";
const NEW_CYCLE = "Desarrollo de Aplicaciones Multiplataforma";

async function openProfile(page: Page): Promise<void> {
  await page.goto("/profile");
  await expect(page.getByRole("heading", { level: 1, name: "Tu perfil" })).toBeVisible();
}

function listboxValue(page: Page, id: "cycleCode" | "academicYear") {
  return page.locator(`#${id} .al-listbox-value`);
}

async function pickOption(page: Page, id: "cycleCode" | "academicYear", optionName: string): Promise<void> {
  await page.locator(`#${id}`).click();
  await page.getByRole("option", { name: optionName, exact: true }).click();
}

// Save and wait for the profile Server Action's own POST before trusting the UI.
async function save(page: Page): Promise<void> {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/profile" &&
      response.ok(),
  );
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await responsePromise;
  await expect(page.getByText("Guardado", { exact: true })).toBeVisible();
}

test.describe.serial("Profile cycle and year changes persist and stay user-scoped", () => {
  test("user A changes cycle and year, and the change survives a reload", async ({ page, loginAs }) => {
    await loginAs(page, "A");
    await openProfile(page);

    await expect(listboxValue(page, "cycleCode")).toHaveText(START_CYCLE);
    await expect(listboxValue(page, "academicYear")).toHaveText("1º curso");

    await pickOption(page, "cycleCode", NEW_CYCLE);
    await pickOption(page, "academicYear", "2º curso");
    await save(page);

    await page.reload();
    await expect(listboxValue(page, "cycleCode")).toHaveText(NEW_CYCLE);
    await expect(listboxValue(page, "academicYear")).toHaveText("2º curso");
  });

  test("user B still sees their own provisioned profile, not user A's change", async ({ page, loginAs }) => {
    await loginAs(page, "B");
    await openProfile(page);

    await expect(listboxValue(page, "cycleCode")).toHaveText(START_CYCLE);
    await expect(listboxValue(page, "academicYear")).toHaveText("1º curso");
  });
});
