import { execFileSync } from "node:child_process";
import path from "node:path";
import { expect, test } from "@playwright/test";

/**
 * E2E REAL: usa tu Supabase, tu backend FastAPI y tu `pnpm dev`. No usa mocks.
 * No manda correos: intercepta el pedido del código y genera uno con el CLI del backend.
 *
 * Requisitos: `pnpm dev` (puerto 3000) y `uv run uvicorn app.main:app` corriendo, y backend/.env configurado.
 *   pnpm test:e2e:real
 *
 * Usa un correo de prueba (debe contener "+e2e@"). Lo borra antes y después de correr.
 * Para inspeccionar los datos al final: E2E_KEEP=1 pnpm test:e2e:real
 */

const EMAIL = process.env.E2E_EMAIL ?? "talent+e2e@leadmindset.org";
const BACKEND_DIR = path.resolve(__dirname, "../../../backend");

function cli(...args: string[]): string {
  return execFileSync("uv", ["run", "python", "-m", "scripts.e2e", ...args], {
    cwd: BACKEND_DIR,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  if (!EMAIL.includes("+e2e@")) throw new Error(`E2E_EMAIL debe contener "+e2e@": ${EMAIL}`);
  cli("health");
  cli("reset", EMAIL);
});

test.afterAll(() => {
  if (!process.env.E2E_KEEP) cli("reset", EMAIL);
});

test("registro real: código, wizard, perfil y CV", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("lead-cookie-consent", "essential"));
  // No mandar correo real: el código lo generamos con el CLI.
  await page.route("**/auth/v1/otp**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
  );

  await page.goto("/sign-up");
  await page.getByLabel("Correo").fill(EMAIL);
  await page.getByRole("button", { name: "Enviar código" }).click();
  await expect(page.getByText(`Enviamos un código a ${EMAIL}`)).toBeVisible();

  const code = cli("otp", EMAIL);
  expect(code).toMatch(/^\d{6,8}$/);
  await page.getByLabel("Dígito 1").fill(code);

  await expect(page).toHaveURL(/\/perfil\/nuevo$/, { timeout: 15_000 });

  await page.getByLabel("Nombres").fill("Prueba E2E");
  await page.getByLabel("Apellidos").fill("Talent");
  await page.getByRole("combobox", { name: "País" }).click();
  await page.getByRole("option", { name: "Perú" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByLabel("¿A qué universidad vas?").fill("Universidad E2E");
  await page.getByRole("button", { name: "Continuar" }).click();

  const skill = page.getByLabel("Agregar skill");
  await skill.fill("Python");
  await skill.press("Enter");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Terminar" }).click();

  await expect(page.getByText("Tu futuro en LEAD empieza aquí")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Ver mi perfil" }).click();
  await expect(page.getByRole("heading", { name: "Prueba E2E Talent" })).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles({
    name: "cv-e2e.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n%e2e\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"),
  });
  await expect(page.getByText("cv-e2e.pdf")).toBeVisible({ timeout: 20_000 });

  // Confirmar en la base de datos real, por la API.
  const profile = JSON.parse(cli("profile", EMAIL));
  expect(profile.person).toMatchObject({ given_names: "Prueba E2E", family_names: "Talent", country_code: "PE" });
  expect(profile.profile.skills).toEqual(["Python"]);
});
