import { defineConfig, devices } from "@playwright/test";

/**
 * Tests de UI con Supabase y backend SIMULADOS. No tocan la red real ni mandan correos.
 * Levantan su propio servidor en el puerto 3100 con URLs falsas, así no chocan con tu `pnpm dev`.
 *
 *   pnpm test:e2e          corre todo
 *   pnpm test:e2e:ui       abre el modo visual de Playwright
 *
 * Para correr más rápido varias veces seguidas, deja el servidor arriba en otra terminal:
 *   pnpm e2e:server
 */
const PORT = Number(process.env.E2E_MOCK_PORT ?? 3100);

export default defineConfig({
  testDir: "./e2e/mocked",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node scripts/e2e-server.mjs",
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: true,
    timeout: 300_000,
    env: { E2E_MOCK_PORT: String(PORT) },
  },
});
