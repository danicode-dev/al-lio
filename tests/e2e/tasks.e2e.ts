import { test, expect, countTasksLike, E2E_TASK_PREFIX } from "./support/fixtures";
import type { Locator, Page } from "@playwright/test";

// One deterministic, obviously-E2E title per run. Cleanup targets the two
// synthetic user ids, so this only needs to be recognisable, not unique.
const RUN_ID = Math.random().toString(36).slice(2, 8);
// Neither title is a substring of the other, so an exact-name button locator
// for one never accidentally resolves the other.
const TASK_TITLE = `${E2E_TASK_PREFIX}-${RUN_ID}-created`;
const EDITED_TITLE = `${E2E_TASK_PREFIX}-${RUN_ID}-edited`;

// Wait for the Tasks server action's own POST response before trusting the UI.
async function commit(page: Page, action: Promise<unknown> | (() => Promise<unknown>)): Promise<void> {
  const run = typeof action === "function" ? action() : action;
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/tasks" &&
        response.ok(),
    ),
    run,
  ]);
}

async function openTasks(page: Page): Promise<void> {
  await page.goto("/tasks");
  await expect(page.getByRole("heading", { level: 1, name: "Tareas pendientes" })).toBeVisible();
}

function taskOpener(page: Page, title: string): Locator {
  return page.getByRole("button", { name: `Ver detalles de ${title}`, exact: true });
}

test.describe.serial("Tasks critical path", () => {
  test("user A creates a task, edits it, and the edit persists across a reload", async ({ page, loginAs }) => {
    await loginAs(page, "A");
    await openTasks(page);

    // 3. Create a task with a deterministic, E2E-recognisable title.
    await page.getByRole("button", { name: "Nueva tarea" }).click();
    const composer = page.locator("form", { has: page.getByPlaceholder("¿Qué necesitas hacer?") });
    await composer.getByPlaceholder("¿Qué necesitas hacer?").fill(TASK_TITLE);
    await commit(page, composer.getByRole("button", { name: "Guardar" }).click());

    await page.reload();
    await expect(taskOpener(page, TASK_TITLE)).toBeVisible();

    // 4. Edit the task and confirm the updated content.
    await page.getByRole("button", { name: `Editar ${TASK_TITLE}`, exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Editar tarea" });
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder("¿Qué necesitas hacer?").fill(EDITED_TITLE);
    await commit(page, dialog.getByRole("button", { name: "Guardar" }).click());
    await expect(dialog).toBeHidden();
    await expect(taskOpener(page, EDITED_TITLE)).toBeVisible();

    // 5. Reload and prove the change is served from PostgreSQL, not local state.
    await page.reload();
    await expect(taskOpener(page, EDITED_TITLE)).toBeVisible();
    await expect(taskOpener(page, TASK_TITLE)).toHaveCount(0);
    expect(await countTasksLike("A", `${E2E_TASK_PREFIX}-${RUN_ID}%`)).toBe(1);
  });

  test("user A completes the task and finds it under the completed filter", async ({ page, loginAs }) => {
    await loginAs(page, "A");
    await openTasks(page);

    // Default view is "pending": the edited task is here until it is completed.
    await expect(taskOpener(page, EDITED_TITLE)).toBeVisible();

    // 6. Mark it complete.
    await commit(page, page.getByRole("button", { name: `Completar ${EDITED_TITLE}`, exact: true }).click());

    // It leaves the pending list...
    await page.reload();
    await expect(taskOpener(page, EDITED_TITLE)).toHaveCount(0);

    // 7. ...and appears under the completed filter, still there after a reload.
    await page.getByRole("button", { name: "Mostrar completadas" }).click();
    await expect(taskOpener(page, EDITED_TITLE)).toBeVisible();
    await expect(page.getByRole("button", { name: `Reabrir ${EDITED_TITLE}`, exact: true })).toBeVisible();

    await page.reload();
    await page.getByRole("button", { name: "Mostrar completadas" }).click();
    await expect(taskOpener(page, EDITED_TITLE)).toBeVisible();
  });

  test("user B cannot observe user A's task", async ({ page, loginAs }) => {
    // A fresh browser context (Playwright default per test) - no shared cookies.
    await loginAs(page, "B");

    await openTasks(page);
    await page.getByRole("button", { name: "Mostrar totales" }).click();

    await expect(page.getByText(TASK_TITLE, { exact: false })).toHaveCount(0);
    await expect(page.getByText(EDITED_TITLE, { exact: false })).toHaveCount(0);
    expect(await countTasksLike("B", `${E2E_TASK_PREFIX}%`)).toBe(0);
  });
});
