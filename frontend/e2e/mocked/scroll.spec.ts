import { devices, expect, type Page, test } from "@playwright/test";
import { loginViaUi, newState, setup } from "./mocks";

// Con Lenis, la página no se dejaba bajar cuando crecía después de cargar (el wizard con muchas
// skills): Lenis calculaba el alto una sola vez. Ahora el scroll es el nativo del navegador.

const SKILLS = [
  "RAG System Design",
  "LLM Evaluation and Model Validation",
  "AI Assisted Software Development",
  "Prompt Engineering",
  "Backend Architecture",
  "Technical Program Management",
  "QA Strategy and Execution",
  "Automation Frameworks",
  "AI Assisted Testing",
  "AI Testing Strategy Research",
  "Agile Project Management",
  "Cross Functional Collaboration",
  "Team Leadership",
  "Risk Assessment",
  "Maturity Assessment",
];

const PARSE = {
  status: "ok",
  reason: null,
  suggestions: {
    given_names: "Ana",
    family_names: "Pérez",
    email: null,
    phone: null,
    linkedin: null,
    country_code: "PE",
    city_id: 3936456,
    city_name: "Lima",
    city_admin1: "Lima",
    city_other: null,
    university_id: null,
    university_name: "UTEC",
    major: "Ingeniería de Sistemas",
    graduation_year: 2020,
    career_stage: "profesional_joven",
    skills: SKILLS,
    languages: [],
  },
};

/** Llega al paso 4 con las 15 skills del CV, arriba de todo. */
async function stepSkillsWithCv(page: Page) {
  const state = newState({ parse: PARSE });
  await setup(page, state);
  await loginViaUi(page, state);
  await expect(page).toHaveURL(/\/perfil\/nuevo$/);
  await page.getByRole("radio", { name: /Profesional joven/ }).click();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByLabel("Subir mi CV").setInputFiles({
    name: "cv.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 prueba"),
  });
  await expect(page.getByLabel("Nombres")).toHaveValue("Ana");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByTestId("skills-count")).toHaveText("15");
  await page.evaluate(() => window.scrollTo(0, 0));
}

/** Baja con la rueda hasta que la página no avanza más. Devuelve cuánto faltó para el final. */
async function wheelToBottom(page: Page): Promise<number> {
  const { width, height } = page.viewportSize()!;
  await page.mouse.move(width / 2, height / 2);
  let previous = -1;
  for (let i = 0; i < 30; i++) {
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(100);
    const y = await page.evaluate(() => window.scrollY);
    if (y === previous) break;
    previous = y;
  }
  return page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight - window.scrollY,
  );
}

for (const [name, viewport] of [
  ["escritorio", devices["Desktop Chrome"].viewport],
  ["móvil", devices["Pixel 7"].viewport],
] as const) {
  test(`${name}: la rueda llega al final del paso 4 con 15 skills`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await stepSkillsWithCv(page);

    const scrollable = await page.evaluate(
      () => document.documentElement.scrollHeight > window.innerHeight,
    );
    expect(scrollable).toBe(true); // la página es más alta que la pantalla

    expect(await wheelToBottom(page)).toBeLessThanOrEqual(1);
    // Lo último del paso queda a la vista: el contador y el botón Siguiente.
    await expect(page.getByTestId("skills-count")).toBeInViewport();
    await expect(page.getByRole("button", { name: "Siguiente" })).toBeInViewport();
  });
}
