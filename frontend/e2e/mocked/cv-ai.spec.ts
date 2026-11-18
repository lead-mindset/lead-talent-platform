import { expect, type Page, test } from "@playwright/test";
import { loginViaUi, newState, setup, type MockState } from "./mocks";

/** Respuesta de la lectura con IA para el CV de prueba. */
const SUGGESTIONS = {
  status: "ok",
  reason: null,
  suggestions: {
    given_names: "Valeria",
    family_names: "Mendoza Ríos",
    email: "valeria@test.com",
    phone: null,
    linkedin: "linkedin.com/in/valeria",
    country_code: "PE",
    city_id: 3936456,
    city_name: "Lima",
    city_admin1: "Lima",
    city_other: null,
    university_id: null,
    university_name: "UTEC",
    major: "Ciencia de la Computación",
    graduation_year: 2028,
    career_stage: "estudiante_universitario",
    skills: ["Python", "Pandas", "Power BI"],
    languages: [{ name: "Inglés", level: "B2" }],
  },
};

const PDF = { name: "cv-valeria.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 prueba") };

/** Login, paso 1 (etapa) y subida del CV en el paso 2. */
async function uploadCv(page: Page, state: MockState) {
  await setup(page, state);
  await loginViaUi(page, state);
  await expect(page).toHaveURL(/\/perfil\/nuevo$/);
  await page.getByRole("radio", { name: /Estudiante universitario/ }).click();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByLabel("Subir mi CV").setInputFiles(PDF);
}

const parseCalls = (state: MockState) => state.calls.filter((c) => c.path === "/talent/resume/parse");

test.describe("Lectura del CV con IA", () => {
  test("muestra 'Leyendo tu CV…' y prellena el paso 3 con la marca de IA", async ({ page }) => {
    const state = newState({ parse: SUGGESTIONS, parseDelayMs: 800 });
    await uploadCv(page, state);

    // Estado de carga en el paso 2, con los botones desactivados.
    await expect(page.getByTestId("cv-reading")).toHaveText(/Leyendo tu CV/);
    await expect(page.getByRole("button", { name: "Siguiente" })).toBeDisabled();

    // Pasa solo al paso 3 con los campos sugeridos.
    await expect(page.getByLabel("Nombres")).toHaveValue("Valeria");
    await expect(page.getByLabel("Apellidos")).toHaveValue("Mendoza Ríos");
    await expect(page.getByRole("combobox", { name: "País" })).toHaveText("Perú");
    await expect(page.getByTestId("selected-city")).toHaveText("Lima, Lima");
    await expect(page.getByLabel("Universidad")).toHaveValue("UTEC");
    await expect(page.getByLabel("Carrera")).toHaveValue("Ciencia de la Computación");
    await expect(page.getByLabel("Egreso")).toHaveValue("2028");
    await expect(page.getByTestId("cv-notice")).toContainText("Leímos tu CV");
    await expect(page.getByTestId("ai-badge")).toHaveCount(7);

    // La lectura manda la sesión del embudo, sin datos personales.
    const body = parseCalls(state)[0].body!;
    expect(Object.keys(body).sort()).toEqual(["device", "session_id"]);

    // Nada se guarda hasta terminar.
    expect(state.calls.some((c) => c.path === "/talent/profile" && c.method === "PUT")).toBe(false);

    // Editar un campo sugerido le quita la marca; el resto la conserva.
    await page.getByLabel("Carrera").fill("Ingeniería de Software");
    await expect(page.getByTestId("ai-badge")).toHaveCount(6);
  });

  test("las skills del CV llegan marcadas al paso 4 y se guardan al terminar", async ({ page }) => {
    const state = newState({ parse: SUGGESTIONS });
    await uploadCv(page, state);
    await expect(page.getByLabel("Nombres")).toHaveValue("Valeria");
    await page.getByRole("button", { name: "Siguiente" }).click();

    await expect(page.getByText("De tu CV")).toBeVisible();
    await expect(page.getByTestId("ai-badge")).toBeVisible();
    await expect(page.getByTestId("skills-count")).toHaveText("3");
    // Quita una que no domina.
    await page.getByRole("button", { name: "Power BI" }).click();
    await expect(page.getByTestId("skills-count")).toHaveText("2");
    await page.getByRole("button", { name: "Siguiente" }).click();

    await page.getByRole("button", { name: "Terminar" }).click();
    await expect(page.getByTestId("profile-percent")).toBeVisible();

    const put = state.calls.find((c) => c.path === "/talent/profile" && c.method === "PUT")!.body!;
    expect(put).toMatchObject({
      given_names: "Valeria",
      family_names: "Mendoza Ríos",
      country_code: "PE",
      city_id: 3936456,
      university_other: "UTEC",
      major: "Ciencia de la Computación",
      graduation_year: 2028,
      linkedin_url: "https://linkedin.com/in/valeria",
      skills: ["Python", "Pandas"],
      career_stage: "estudiante_universitario",
    });
  });

  test("si la lectura falla, pasa al paso 3 a mano con un aviso amable", async ({ page }) => {
    const state = newState({ parse: { status: "failed", reason: "timeout", suggestions: null } });
    await uploadCv(page, state);

    await expect(page.getByTestId("cv-notice")).toContainText("no pudimos leer tu CV");
    await expect(page.getByLabel("Nombres")).toHaveValue("");
    await expect(page.getByTestId("ai-badge")).toHaveCount(0);

    // Se puede seguir a mano sin bloqueo.
    await page.getByLabel("Nombres").fill("Valeria");
    await page.getByRole("combobox", { name: "País" }).click();
    await page.getByRole("option", { name: "Perú" }).click();
    await page.getByLabel("Universidad").fill("UTEC");
    await page.getByRole("button", { name: "Siguiente" }).click();
    await expect(page.getByText("Tus skills")).toBeVisible();
  });

  test("si el backend no responde, también sigue a mano", async ({ page }) => {
    const state = newState({ parseNetworkError: true });
    await uploadCv(page, state);
    await expect(page.getByTestId("cv-notice")).toContainText("Completa tus datos aquí");
    await expect(page.getByLabel("Nombres")).toBeEditable();
  });

  test("con el límite por hora alcanzado, explica por qué y sigue a mano", async ({ page }) => {
    const state = newState({ parse: { status: "failed", reason: "limite_alcanzado", suggestions: null } });
    await uploadCv(page, state);
    await expect(page.getByTestId("cv-notice")).toContainText("varios CV en la última hora");
  });

  test("no pisa lo que el estudiante ya tenía", async ({ page }) => {
    const state = newState({ parse: SUGGESTIONS });
    state.person.given_names = "Vale";
    await uploadCv(page, state);
    await expect(page.getByLabel("Apellidos")).toHaveValue("Mendoza Ríos");
    await expect(page.getByLabel("Nombres")).toHaveValue("Vale");
  });
});
