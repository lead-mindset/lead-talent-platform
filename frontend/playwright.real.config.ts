import { defineConfig, devices } from "@playwright/test";

/**
 * E2E REAL contra tu entorno local: Supabase, FastAPI y `pnpm dev` de verdad.
 * No levanta servidores: deben estar corriendo antes.
 *
 *   pnpm test:e2e:real
 */
export default defineConfig({
  testDir: "./e2e/real",
  workers: 1,
  timeout: 90_000,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report-real" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
