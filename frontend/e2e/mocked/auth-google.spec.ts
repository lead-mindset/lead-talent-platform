import { expect, test } from "@playwright/test";
import { newState, setup } from "./mocks";

// Servidor de siempre (puerto 3100): NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=true.
// El caso apagado está en auth-google.google-off.spec.ts, con su propio build.
test.describe("Login con Google encendido", () => {
  for (const [path, label] of [
    ["/login", "Entrar con Google"],
    ["/sign-up", "Registrarme con Google"],
  ] as const) {
    test(`${path} muestra el código por correo, el separador y Google`, async ({ page }) => {
      await setup(page, newState());
      await page.goto(path);
      await expect(page.getByRole("button", { name: "Enviar código" })).toBeVisible();
      await expect(page.getByText("o", { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: label })).toBeVisible();
      await expect(page.getByText("Google queda como atajo")).toBeVisible();
    });
  }
});
