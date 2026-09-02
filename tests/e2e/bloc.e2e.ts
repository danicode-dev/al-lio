import { test, expect } from "./support/fixtures";
import type { Page } from "@playwright/test";

// Bloc keeps notes in client state with a 450ms debounced sync to PostgreSQL
// through its Server Actions. This journey creates a note, renames it, and
// proves the rename is served from the database after a reload; then trashes
// the note and restores it from the trash, each step surviving a reload.
const RUN_ID = Math.random().toString(36).slice(2, 8);
const NOTE_TITLE = `E2E-BLOC-${RUN_ID}`;
// Comfortably longer than the editor's 450ms autosave debounce, so a trailing
// save with the final title has flushed before the reload.
const AUTOSAVE_SETTLE_MS = 900;

async function openBloc(page: Page): Promise<void> {
  await page.goto("/bloc");
  await expect(page.getByRole("heading", { level: 1, name: "Bloc de notas" })).toBeVisible();
  await expect(page.getByText("Cargando notas...")).toBeHidden();
}

function sidebar(page: Page) {
  return page.locator(".al-bloc-sidebar");
}

function noteCard(page: Page) {
  return sidebar(page).getByRole("button", { name: NOTE_TITLE });
}

async function waitForBlocSync(page: Page, trigger: () => Promise<unknown> | unknown): Promise<void> {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/bloc" &&
      response.ok(),
  );
  await trigger();
  await responsePromise;
}

test.describe.serial("Bloc note persistence and recovery", () => {
  test("create a note, rename it, and the rename survives a reload", async ({ page, loginAs }) => {
    await loginAs(page, "A");
    await openBloc(page);

    await sidebar(page).getByRole("button", { name: "Nueva nota" }).click();
    const titleInput = page.locator("input.al-bloc-title-input");
    await expect(titleInput).toBeVisible();

    await waitForBlocSync(page, () => titleInput.fill(NOTE_TITLE));
    await expect(page.getByText("Guardado automáticamente")).toBeVisible();
    await page.waitForTimeout(AUTOSAVE_SETTLE_MS);

    await page.reload();
    await openBloc(page);
    await expect(noteCard(page)).toBeVisible();
    await noteCard(page).click();
    await expect(page.locator("input.al-bloc-title-input")).toHaveValue(NOTE_TITLE);
  });

  test("trash the note, it leaves the list, then restore it from the trash", async ({ page, loginAs }) => {
    await loginAs(page, "A");
    await openBloc(page);
    await expect(noteCard(page)).toBeVisible();

    const row = sidebar(page).locator(".al-bloc-note-row", { hasText: NOTE_TITLE });
    await waitForBlocSync(page, () => row.getByRole("button", { name: "Eliminar nota" }).click());

    await page.reload();
    await openBloc(page);
    await expect(noteCard(page)).toHaveCount(0);

    await page.getByRole("button", { name: "Ver papelera" }).click();
    const trash = page.getByRole("dialog", { name: "Papelera" });
    await expect(trash).toBeVisible();
    await expect(trash.getByText(NOTE_TITLE)).toBeVisible();

    const trashRow = trash.locator(".al-bloc-trash-row", { hasText: NOTE_TITLE });
    await waitForBlocSync(page, () => trashRow.getByRole("button", { name: "Restaurar" }).click());
    await trash.getByRole("button", { name: "Cerrar" }).click();

    await page.reload();
    await openBloc(page);
    await expect(noteCard(page)).toBeVisible();
  });
});
