import { expect, test } from "@playwright/test";
import { GOOD_CODE, newState, setup } from "./mocks";

// Corre en el proyecto "google-off": build con NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=false (puerto 3101).
test.describe("Login con Google apagado", () => {
  for (const path of ["/login", "/sign-up"]) {
    test(`${path} solo muestra el código por correo, sin separador ni textos de Google`, async ({ page }) => {
      await setup(page, newState());
      await page.goto(path);
      await expect(page.getByRole("button", { name: "Enviar código" })).toBeVisible();
      await expect(page.getByRole("button", { name: /Google/ })).toHaveCount(0);
      await expect(page.getByText("o", { exact: true })).toHaveCount(0);
      // Ningún texto visible menciona Google.
      await expect(page.locator("main, body").first()).not.toContainText("Google");
    });
  }

  test("el login con código sigue funcionando", async ({ page }) => {
    const state = newState();
    await setup(page, state);
    await page.goto("/sign-up");
    await page.getByLabel("Correo").fill(state.email);
    await page.getByRole("button", { name: "Enviar código" }).click();
    await page.getByLabel("Dígito 1").fill(GOOD_CODE);
    await expect(page).toHaveURL(/\/perfil\/nuevo$/);
  });
});
