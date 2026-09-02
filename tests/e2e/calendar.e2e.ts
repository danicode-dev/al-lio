import { test, expect, countTasksLike, E2E_TASK_PREFIX } from "./support/fixtures";
import type { Page } from "@playwright/test";

// AL-LÍO has no standalone local-events table: the "local" calendar is the
// month view of the student's own dated items. This journey uses a dated task
// - the create/edit/delete path that works with no Google Calendar consent -
// and checks it appears on /calendar, its detail dialog deep-links to the
// exact task, and the change survives a reload.
const RUN_ID = Math.random().toString(36).slice(2, 8);
const EVENT_TITLE = `${E2E_TASK_PREFIX}-CAL-${RUN_ID}`;
const TODAY = new Date().toISOString().slice(0, 10);

async function commitTasks(page: Page, trigger: () => Promise<unknown> | unknown): Promise<void> {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/tasks" &&
      response.ok(),
  );
  await trigger();
  await responsePromise;
}

async function createDatedTask(page: Page): Promise<void> {
  await page.goto("/tasks");
  await expect(page.getByRole("heading", { level: 1, name: "Tareas pendientes" })).toBeVisible();
  await page.getByRole("button", { name: "Nueva tarea" }).click();
  const composer = page.locator("form", { has: page.getByPlaceholder("¿Qué necesitas hacer?") });
  await composer.getByPlaceholder("¿Qué necesitas hacer?").fill(EVENT_TITLE);
  await composer.getByLabel("Fecha de la tarea").fill(TODAY);
  await commitTasks(page, () => composer.getByRole("button", { name: "Guardar" }).click());
}

async function openCalendar(page: Page): Promise<void> {
  await page.goto("/calendar");
  await expect(page.getByRole("heading", { level: 1, name: "Calendario" })).toBeVisible();
}

test.describe.serial("Local Calendar create / view / delete without Google", () => {
  test("a dated task appears on the calendar and its detail dialog deep-links to the task", async ({ page, loginAs }) => {
    await loginAs(page, "A");
    await createDatedTask(page);

    await openCalendar(page);

    // The event shows on the calendar (grid pill and today's agenda row).
    const event = page.getByRole("button", { name: EVENT_TITLE }).first();
    await expect(event).toBeVisible();

    // Nothing navigates on the first click: it opens the shared detail dialog.
    await event.click();
    const dialog = page.getByRole("dialog", { name: EVENT_TITLE });
    await expect(dialog).toBeVisible();

    // The dialog action deep-links to that exact task, not a bare list page.
    const action = dialog.getByRole("link", { name: "Abrir tarea" });
    await expect(action).toHaveAttribute("href", /\/tasks\?task=/);
    await action.click();

    await expect(page).toHaveURL(/\/tasks(\?task=.*)?$/);
    await expect(page.getByRole("dialog", { name: "Detalle de la tarea" })).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Detalle de la tarea" }).getByText(EVENT_TITLE)).toBeVisible();
  });

  test("the calendar event is still there after a reload, and disappears once the task is deleted", async ({ page, loginAs }) => {
    await loginAs(page, "A");

    await openCalendar(page);
    await expect(page.getByRole("button", { name: EVENT_TITLE }).first()).toBeVisible();

    // Reload proves it is served from PostgreSQL, not client state.
    await page.reload();
    await expect(page.getByRole("button", { name: EVENT_TITLE }).first()).toBeVisible();

    // Delete the underlying task...
    await page.goto("/tasks");
    await commitTasks(page, () => page.getByRole("button", { name: `Eliminar ${EVENT_TITLE}`, exact: true }).click());
    expect(await countTasksLike("A", `${E2E_TASK_PREFIX}-CAL-${RUN_ID}%`)).toBe(0);

    // ...and it is gone from the calendar, before and after a reload.
    await openCalendar(page);
    await expect(page.getByRole("button", { name: EVENT_TITLE })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("button", { name: EVENT_TITLE })).toHaveCount(0);
  });
});
