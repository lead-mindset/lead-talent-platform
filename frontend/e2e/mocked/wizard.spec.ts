import { expect, type Page, test } from "@playwright/test";
import { loginViaUi, newState, setup } from "./mocks";

async function next(page: Page) {
  await page.getByRole("button", { name: "Continuar" }).click();
}

test.describe("Wizard de registro", () => {
  test("pide los nombres antes de avanzar", async ({ page }) => {
    const state = newState();
    await setup(page, state);
    await loginViaUi(page, state);
    await expect(page).toHaveURL(/\/perfil\/nuevo$/);
    await next(page);
    await expect(page.getByText("Escribe tu nombre")).toBeVisible();
    await expect(page.getByText("Paso 1 de 5")).toBeVisible();
  });

  test("rechaza un LinkedIn que no es de LinkedIn", async ({ page }) => {
    const state = newState();
    await setup(page, state);
    await loginViaUi(page, state);
    await page.getByLabel("Nombres").fill("Valeria");
    await page.getByRole("textbox", { name: "LinkedIn" }).fill("https://ejemplo.com/valeria");
    await next(page);
    await expect(page.getByText("Debe ser un enlace de LinkedIn")).toBeVisible();
  });

  test("registro completo guarda los datos correctos", async ({ page }) => {
    const state = newState();
    await setup(page, state);
    await loginViaUi(page, state);

    // Paso 1: tú
    await page.getByLabel("Nombres").fill("María José");
    await page.getByLabel("Apellidos").fill("García López");
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "Perú" }).click();
    await page.getByLabel("¿En qué ciudad?").fill("Lima");
    await page.getByRole("textbox", { name: "LinkedIn" }).fill("linkedin.com/in/mariajose");
    await next(page);

    // Paso 2: formación
    await page.getByLabel("¿A qué universidad vas?").fill("Universidad Nacional de Ingeniería");
    await page.getByLabel("¿Qué estudias?").fill("Ingeniería de Sistemas");
    await page.getByRole("spinbutton").fill("2028");
    await page.getByRole("button", { name: "Avanzado" }).click();
    await next(page);

    // Paso 3: skills (obligatorio al menos una)
    await next(page);
    await expect(page.getByText("Elige al menos una skill")).toBeVisible();
    const skill = page.getByLabel("Agregar skill");
    for (const s of ["Python", "SQL", "Liderazgo"]) {
      await skill.fill(s);
      await skill.press("Enter");
    }
    await page.getByRole("button", { name: "Python", exact: true }).click(); // marcar como top
    await next(page);

    // Paso 4: objetivos
    await page.getByRole("button", { name: "Data Science" }).click();
    await page.getByRole("button", { name: "Tiempo parcial" }).click();
    await page.getByLabel(/Quiero que empresas aliadas/).check();
    await page.getByRole("button", { name: "Terminar" }).click();

    await expect(page.getByText("Tu futuro en LEAD empieza aquí")).toBeVisible();
    await expect(page.getByText("María, el siguiente paso es subir tu CV.")).toBeVisible();

    const put = state.calls.find((c) => c.method === "PUT" && c.path === "/talent/profile");
    expect(put?.body).toMatchObject({
      given_names: "María José",
      family_names: "García López",
      country_code: "PE",
      city: "Lima",
      linkedin_url: "https://linkedin.com/in/mariajose",
      university_id: null,
      university_other: "Universidad Nacional de Ingeniería",
      major: "Ingeniería de Sistemas",
      graduation_year: 2028,
      english_level: "avanzado",
      skills: ["Python", "SQL", "Liderazgo"],
      top_skills: ["Python"],
      target_roles: ["Data Science"],
      availability: "part",
      recruiter_visible: true,
    });

    await page.getByRole("button", { name: "Ver mi perfil" }).click();
    await expect(page).toHaveURL(/\/perfil$/);
    await expect(page.getByRole("heading", { name: "María José García López" })).toBeVisible();
  });

  test("apellidos es opcional (personas con un solo nombre)", async ({ page }) => {
    const state = newState();
    await setup(page, state);
    await loginViaUi(page, state);
    await page.getByLabel("Nombres").fill("Sukarno");
    await next(page);
    await expect(page.getByText("Paso 2 de 5")).toBeVisible();
  });

  test("elegir una universidad del catálogo guarda su id", async ({ page }) => {
    const state = newState({ universities: [{ id: "u-utec", name: "UTEC", country_code: "PE" }] });
    await setup(page, state);
    await loginViaUi(page, state);
    await page.getByLabel("Nombres").fill("Valeria");
    await next(page);
    await page.getByLabel("¿A qué universidad vas?").fill("ute");
    await page.getByRole("button", { name: "UTEC" }).click();
    await expect(page.getByText("Universidad del catálogo")).toBeVisible();
    await next(page);
    const skill = page.getByLabel("Agregar skill");
    await skill.fill("Python");
    await skill.press("Enter");
    await next(page);
    await page.getByRole("button", { name: "Terminar" }).click();
    await expect(page.getByText("Tu futuro en LEAD empieza aquí")).toBeVisible();
    const put = state.calls.find((c) => c.method === "PUT");
    expect(put?.body).toMatchObject({ university_id: "u-utec", university_other: null, recruiter_visible: false });
  });
});
