import { expect, test } from "@playwright/test";
import { GOOD_CODE, completedState, loginViaUi, newState, setup } from "./mocks";

test.describe("Login y sign-up", () => {
  test("el login muestra las dos tarjetas y lleva al sign-up", async ({ page }) => {
    await setup(page, newState());
    await page.goto("/login");
    await expect(page.getByText("¿Eres estudiante?")).toBeVisible();
    await expect(page.getByText("¿Ya tienes cuenta?")).toBeVisible();
    await page.getByRole("link", { name: "Crear mi perfil" }).click();
    await expect(page).toHaveURL(/\/sign-up$/);
    await expect(page.getByRole("heading", { name: "Crea tu perfil" })).toBeVisible();
  });

  test("el sign-up tiene link de vuelta al login", async ({ page }) => {
    await setup(page, newState());
    await page.goto("/sign-up");
    await page.getByRole("link", { name: "Inicia sesión" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("valida el correo antes de pedir el código", async ({ page }) => {
    const state = newState();
    await setup(page, state);
    await page.goto("/login");
    await page.getByLabel("Correo").fill("no-es-un-correo");
    await page.getByRole("button", { name: "Enviar código" }).click();
    await expect(page.locator("#otp-email-error")).toBeVisible();
    expect(state.otpRequests).toHaveLength(0);
  });

  test("persona nueva: pide código, se equivoca, acierta y va al wizard", async ({ page }) => {
    const state = newState();
    await setup(page, state);
    await page.goto("/sign-up");
    await page.getByLabel("Correo").fill(state.email);
    await page.getByRole("button", { name: "Enviar código" }).click();

    await expect(page.getByText(`Enviamos un código a ${state.email}`)).toBeVisible();
    expect(state.otpRequests).toHaveLength(1);
    expect(state.otpRequests[0]).toMatchObject({ email: state.email, create_user: true });

    await page.getByLabel("Dígito 1").fill("000000");
    await expect(page.getByText("El código no es válido o ya expiró.")).toBeVisible();

    await page.getByLabel("Dígito 1").fill(GOOD_CODE);
    await expect(page).toHaveURL(/\/perfil\/nuevo$/);
    await expect(page.getByRole("heading", { name: "Tu espacio en LEAD" })).toBeVisible();
  });

  test("persona con perfil completo entra directo a su perfil", async ({ page }) => {
    const state = completedState();
    await setup(page, state);
    await loginViaUi(page, state);
    await expect(page).toHaveURL(/\/perfil$/);
    await expect(page.getByRole("heading", { name: "Valeria Mendoza" })).toBeVisible();
  });

  test("equivocarse de pantalla no importa: login con correo nuevo va al wizard", async ({ page }) => {
    const state = newState();
    await setup(page, state);
    await loginViaUi(page, state);
    await expect(page).toHaveURL(/\/perfil\/nuevo$/);
  });

  test("si el backend está apagado, lo dice", async ({ page }) => {
    const state = newState({ profileError: "network" });
    await setup(page, state);
    await loginViaUi(page, state);
    await expect(page.getByText(/No pudimos conectar con el backend/)).toBeVisible();
  });

  test("si el correo no está confirmado, muestra el aviso", async ({ page }) => {
    const state = newState({ profileError: "unconfirmed" });
    await setup(page, state);
    await loginViaUi(page, state);
    await expect(page).toHaveURL(/\/login\?confirmar=1$/);
    await expect(page.getByText("Confirma tu correo para continuar.")).toBeVisible();
  });

  test("reenviar código espera 60 segundos", async ({ page }) => {
    const state = newState();
    await setup(page, state);
    await page.goto("/login");
    await page.getByLabel("Correo").fill(state.email);
    await page.getByRole("button", { name: "Enviar código" }).click();
    await expect(page.getByRole("button", { name: /Reenviar en (59|60)s/ })).toBeDisabled();
  });

  test("cerrar sesión vuelve al login", async ({ page }) => {
    const state = completedState();
    await setup(page, state);
    await loginViaUi(page, state);
    await expect(page).toHaveURL(/\/perfil$/);
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
