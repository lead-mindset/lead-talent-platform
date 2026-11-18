import { expect, test } from "@playwright/test";
import { newState, setup } from "./mocks";

test.describe("Rutas del módulo 1", () => {
  for (const path of ["/inicio", "/eventos", "/personas", "/admin", "/empresa", "/login/board"]) {
    test(`${path} está oculta y sin sesión termina en el login`, async ({ page }) => {
      await setup(page, newState());
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
    });
  }

  test("/perfil sin sesión manda al login", async ({ page }) => {
    await setup(page, newState());
    await page.goto("/perfil");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("la landing lleva al sign-up", async ({ page }) => {
    await setup(page, newState());
    await page.goto("/");
    await page.getByRole("link", { name: "Crear mi perfil" }).first().click();
    await expect(page).toHaveURL(/\/sign-up$/);
  });
});
