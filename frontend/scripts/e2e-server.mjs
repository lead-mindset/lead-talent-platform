// Levanta el frontend en el puerto 3100 con Supabase y API SIMULADOS, para `pnpm test:e2e`.
// Déjalo corriendo en otra terminal y los tests lo reutilizan (más rápido).
//   pnpm e2e:server
import { spawnSync } from "node:child_process";

const port = process.env.E2E_MOCK_PORT ?? "3100";
const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: "https://e2e-mock.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_e2e",
  NEXT_PUBLIC_API_URL: "http://api.e2e.test",
  NEXT_TELEMETRY_DISABLED: "1",
};
const opts = { stdio: "inherit", env, shell: process.platform === "win32" };

const build = spawnSync("pnpm", ["build"], opts);
if (build.status !== 0) process.exit(build.status ?? 1);
const start = spawnSync("pnpm", ["start", "-p", port], opts);
process.exit(start.status ?? 0);
