import { expect, test } from "@playwright/test";
import { completedState, loginViaUi, setup } from "./mocks";

test.describe("Perfil y CV", () => {
  test("muestra los datos del perfil", async ({ page }) => {
    const state = completedState();
    await setup(page, state);
    await loginViaUi(page, state);
    await expect(page.getByRole("heading", { name: "Valeria Mendoza" })).toBeVisible();
    await expect(page.getByText("UTEC · Computer Science · Egreso 2029")).toBeVisible();
    await expect(page.getByText("Lima, Perú")).toBeVisible();
    await expect(page.getByText("★ Python")).toBeVisible();
    await expect(page.getByText("Tu perfil es privado. Solo tú lo ves.")).toBeVisible();
  });

  test("subir un CV en PDF", async ({ page }) => {
    const state = completedState();
    await setup(page, state);
    await loginViaUi(page, state);
    await expect(page.getByText("Subir currículum")).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles({
      name: "CV Valeria.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 e2e"),
    });

    await expect(page.getByText("CV Valeria.pdf")).toBeVisible();
    expect(state.storageUploads).toHaveLength(1);
    expect(state.calls.some((c) => c.method === "POST" && c.path === "/talent/resume")).toBe(true);
    await expect(page.getByText("Reemplazar currículum")).toBeVisible();
  });

  test("rechaza archivos que no son PDF, DOC o DOCX sin subir nada", async ({ page }) => {
    const state = completedState();
    await setup(page, state);
    await loginViaUi(page, state);
    await page.locator('input[type="file"]').setInputFiles({
      name: "foto.png",
      mimeType: "image/png",
      buffer: Buffer.from("png"),
    });
    await expect(page.getByText("Sube un PDF, DOC o DOCX.")).toBeVisible();
    expect(state.storageUploads).toHaveLength(0);
  });

  test("activar la visibilidad para empresas guarda el consentimiento", async ({ page }) => {
    const state = completedState();
    await setup(page, state);
    await loginViaUi(page, state);
    await page.getByRole("switch").click();
    await expect(page.getByText("Las empresas aliadas podrán ver tu perfil y tu CV.")).toBeVisible();
    const put = state.calls.find((c) => c.method === "PUT");
    expect(put?.body).toMatchObject({ recruiter_visible: true, given_names: "Valeria", family_names: "Mendoza" });
  });

  test("editar perfil abre el wizard con los datos cargados", async ({ page }) => {
    const state = completedState();
    await setup(page, state);
    await loginViaUi(page, state);
    await page.getByRole("link", { name: "Editar perfil" }).click();
    await expect(page.getByRole("heading", { name: "Edita tu perfil" })).toBeVisible();
    await expect(page.getByLabel("Nombres")).toHaveValue("Valeria");
    await expect(page.getByLabel("Apellidos")).toHaveValue("Mendoza");
  });
});
