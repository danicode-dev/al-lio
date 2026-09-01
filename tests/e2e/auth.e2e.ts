import { test, expect, E2E_USERS, syntheticPassword } from "./support/fixtures";

test.describe("authentication", () => {
  test("an anonymous visitor to /tasks lands on the login page", async ({ page }) => {
    await page.goto("/tasks");

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Bienvenido de nuevo" })).toBeVisible();
    await expect(page.getByLabel("Correo electrónico")).toBeVisible();
    await expect(page.getByRole("button", { name: "Iniciar sesión" })).toBeVisible();
  });

  test("a synthetic user signs in with a password and reaches the private app", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Correo electrónico").fill(E2E_USERS.A.email);
    await page.getByLabel("Contraseña", { exact: true }).fill(syntheticPassword());
    await page.getByRole("button", { name: "Iniciar sesión" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto("/tasks");
    await expect(page).toHaveURL(/\/tasks$/);
    await expect(page.getByRole("heading", { level: 1, name: "Tareas pendientes" })).toBeVisible();
  });

  test("a wrong password keeps the visitor on the login page with a visible error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Correo electrónico").fill(E2E_USERS.A.email);
    await page.getByLabel("Contraseña", { exact: true }).fill("definitely-not-the-password");
    await page.getByRole("button", { name: "Iniciar sesión" }).click();

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});
