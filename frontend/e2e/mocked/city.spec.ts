import { expect, type Page, test } from "@playwright/test";
import { completedState, loginViaUi, newState, setup, type MockState } from "./mocks";

/** Catálogo de ciudades en el wizard: país del catálogo, combobox y "No encuentro mi ciudad". */

async function next(page: Page) {
  await page.getByRole("button", { name: "Continuar" }).click();
}

async function pickCountry(page: Page, name: string) {
  await page.getByRole("combobox", { name: "País" }).click();
  await page.getByRole("option", { name }).click();
}

/** Completa los pasos 2 a 4 con lo mínimo y termina el registro. */
async function finish(page: Page) {
  await next(page);
  await page.getByLabel("¿A qué universidad vas?").fill("UTEC");
  await next(page);
  const skill = page.getByLabel("Agregar skill");
  await skill.fill("Python");
  await skill.press("Enter");
  await next(page);
  await page.getByRole("button", { name: "Terminar" }).click();
  await expect(page.getByText("Tu futuro en LEAD empieza aquí")).toBeVisible();
}

function savedBody(state: MockState) {
  return state.calls.find((c) => c.method === "PUT" && c.path === "/talent/profile")?.body;
}

function citySearches(state: MockState) {
  return state.calls.filter((c) => c.path === "/cities");
}

async function start(page: Page, state = newState()) {
  await setup(page, state);
  await loginViaUi(page, state);
  // Con todos los workers en paralelo, el login puede tardar más de los 5 s por defecto.
  await expect(page).toHaveURL(/\/perfil\/nuevo$/, { timeout: 15_000 });
  await page.getByLabel("Nombres").fill("Valeria");
  return state;
}

test.describe("Ciudad en el wizard", () => {
  test("los países vienen del catálogo", async ({ page }) => {
    await start(page);
    await page.getByRole("combobox", { name: "País" }).click();
    await expect(page.getByRole("option")).toHaveText(["Chile", "México", "Perú"]);
  });

  test("el país es obligatorio", async ({ page }) => {
    await start(page);
    await next(page);
    await expect(page.getByRole("alert").filter({ hasText: "Elige tu país" })).toBeVisible();
    await expect(page.getByText("Paso 1 de 5")).toBeVisible();
  });

  test("la ciudad es opcional", async ({ page }) => {
    const state = await start(page);
    await pickCountry(page, "Perú");
    await finish(page);
    expect(savedBody(state)).toMatchObject({ country_code: "PE", city_id: null, city_other: null });
  });

  test("sin país no se puede buscar ciudad", async ({ page }) => {
    await start(page);
    await expect(page.getByLabel("Buscar ciudad")).toBeDisabled();
  });

  test("elegir una ciudad guarda su id y la muestra en el perfil", async ({ page }) => {
    const state = await start(page);
    await pickCountry(page, "Chile");
    await page.getByLabel("Buscar ciudad").fill("chillan"); // sin tilde
    await page.getByRole("option", { name: "Chillán, Ñuble" }).click();
    await expect(page.getByTestId("selected-city")).toHaveText("Chillán, Ñuble");

    await finish(page);
    expect(savedBody(state)).toMatchObject({ country_code: "CL", city_id: 3895088, city_other: null });
    expect(citySearches(state).at(-1)?.path).toBe("/cities");

    await page.getByRole("button", { name: "Ver mi perfil" }).click();
    await expect(page.getByText("Chillán, Chile")).toBeVisible();
  });

  test("busca con 2 letras o más", async ({ page }) => {
    const state = await start(page);
    await pickCountry(page, "Chile");
    await page.getByLabel("Buscar ciudad").fill("c");
    await page.waitForTimeout(500); // más que el debounce de 250 ms
    expect(citySearches(state)).toHaveLength(0);
    await expect(page.getByRole("option")).toHaveCount(0);

    await page.getByLabel("Buscar ciudad").fill("ch");
    await expect(page.getByRole("option", { name: "Chillán, Ñuble" })).toBeVisible();
    expect(citySearches(state)).toHaveLength(1);
  });

  test("'No encuentro mi ciudad' guarda el texto en city_other", async ({ page }) => {
    const state = await start(page);
    await pickCountry(page, "Perú");
    await page.getByLabel("Buscar ciudad").fill("Pueblito");
    await expect(page.getByText("No encontramos “Pueblito”.")).toBeVisible();
    await page.getByRole("option", { name: "No encuentro mi ciudad" }).click();

    const other = page.locator("#w-city-other");
    await expect(other).toHaveValue("Pueblito"); // trae lo que ya escribió
    await other.fill("Pueblito Nuevo");

    await finish(page);
    expect(savedBody(state)).toMatchObject({ country_code: "PE", city_id: null, city_other: "Pueblito Nuevo" });

    await page.getByRole("button", { name: "Ver mi perfil" }).click();
    await expect(page.getByText("Pueblito Nuevo, Perú")).toBeVisible();
  });

  test("cambiar de país limpia la ciudad elegida", async ({ page }) => {
    const state = await start(page);
    await pickCountry(page, "Perú");
    await page.getByLabel("Buscar ciudad").fill("lima");
    await page.getByRole("option", { name: "Lima, Lima" }).click();
    await expect(page.getByTestId("selected-city")).toBeVisible();

    await pickCountry(page, "Chile");
    await expect(page.getByTestId("selected-city")).toHaveCount(0);
    await expect(page.getByLabel("Buscar ciudad")).toHaveValue("");

    await finish(page);
    expect(savedBody(state)).toMatchObject({ country_code: "CL", city_id: null, city_other: null });
  });

  test("cambiar de país también limpia la ciudad escrita a mano", async ({ page }) => {
    await start(page);
    await pickCountry(page, "Perú");
    await page.getByLabel("Buscar ciudad").fill("Pueblito");
    await page.getByRole("option", { name: "No encuentro mi ciudad" }).click();
    await expect(page.locator("#w-city-other")).toHaveValue("Pueblito");

    await pickCountry(page, "México");
    await expect(page.locator("#w-city-other")).toHaveCount(0);
    await expect(page.getByLabel("Buscar ciudad")).toHaveValue("");
  });

  test("la ciudad se mantiene al ir y volver entre pasos", async ({ page }) => {
    await start(page);
    await pickCountry(page, "Perú");
    await page.getByLabel("Buscar ciudad").fill("areq");
    await page.getByRole("option", { name: "Arequipa, Arequipa" }).click();
    await next(page);
    await page.getByRole("button", { name: "Atrás" }).click();
    await expect(page.getByTestId("selected-city")).toHaveText("Arequipa, Arequipa");
  });

  test("editar el perfil trae la ciudad guardada", async ({ page }) => {
    const state = completedState();
    await setup(page, state);
    await loginViaUi(page, state);
    await expect(page).toHaveURL(/\/perfil$/, { timeout: 15_000 });
    await page.goto("/perfil/editar");
    await expect(page.getByTestId("selected-city")).toHaveText("Lima, Lima");
  });
});
