import { test, expect } from "./support/fixtures";

// One agreed phone width. The authenticated shell only renders the mobile
// header below the `md` breakpoint (768px).
test.use({ viewport: { width: 390, height: 844 } });

// The supported first-level destinations and their labels, in the order the
// shared navigation model (src/components/nav-destinations.ts) declares them.
const DESTINATIONS: ReadonlyArray<readonly [href: string, label: string]> = [
  ["/dashboard", "Inicio"],
  ["/roadmap", "Competencias"],
  ["/tasks", "Tareas"],
  ["/bloc", "Bloc"],
  ["/noticias", "Noticias"],
  ["/work", "Trabajo"],
  ["/courses", "Cursos"],
  ["/hackathons", "Eventos y retos"],
  ["/calendar", "Calendario"],
];

test.describe("Authenticated mobile navigation menu", () => {
  test("every supported destination is reachable through the mobile menu, and picking one navigates and closes it", async ({ page, loginAs }) => {
    await loginAs(page, "A");

    const menu = page.getByRole("navigation", { name: "Navegación móvil" });
    await expect(menu).toBeHidden();

    await page.getByRole("button", { name: "Abrir navegación" }).click();
    await expect(menu).toBeVisible();

    for (const [href, label] of DESTINATIONS) {
      const link = menu.getByRole("link", { name: label, exact: true });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", href);
    }

    await menu.getByRole("link", { name: "Calendario", exact: true }).click();
    await expect(page).toHaveURL(/\/calendar$/);
    await expect(menu).toBeHidden();

    // The menu still opens from another route and still lists everything.
    await page.getByRole("button", { name: "Abrir navegación" }).click();
    await expect(menu).toBeVisible();
    for (const [, label] of DESTINATIONS) {
      await expect(menu.getByRole("link", { name: label, exact: true })).toBeVisible();
    }
  });
});
