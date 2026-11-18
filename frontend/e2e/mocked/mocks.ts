import type { Page, Route } from "@playwright/test";

/**
 * Simulación de Supabase y del backend FastAPI para los tests de Playwright.
 * Ningún test de e2e/mocked toca la red real: no manda correos ni escribe en la base de datos.
 */

export const MOCK_SUPABASE_URL = "https://e2e-mock.supabase.co";
export const MOCK_API_URL = "http://api.e2e.test";
export const GOOD_CODE = "123456";
export const PERSON_ID = "11111111-1111-1111-1111-111111111111";

const USER_ID = "22222222-2222-2222-2222-222222222222";

type Json = Record<string, unknown>;

export type Person = {
  id: string;
  email: string;
  given_names: string | null;
  family_names: string | null;
  full_name: string | null;
  country_code: string | null;
  country_name: string | null;
  city_id: number | null;
  city_name: string | null;
  city_admin1: string | null;
  city_other: string | null;
  university_id: string | null;
  university_other: string | null;
  university_name: string | null;
  major: string | null;
  graduation_year: number | null;
  linkedin_url: string | null;
};

export type Profile = {
  headline: string | null;
  english_level: string | null;
  skills: string[];
  top_skills: string[];
  target_roles: string[];
  availability: string | null;
  recruiter_visible: boolean;
  recruiter_visible_consented_at: string | null;
  onboarding_completed_at: string | null;
};

export type Resume = {
  id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_at: string;
  download_url: string | null;
};

export type Country = { code: string; name_es: string; name_en: string };
export type City = { id: number; name: string; admin1: string | null; country_code: string };

export const COUNTRIES: Country[] = [
  { code: "CL", name_es: "Chile", name_en: "Chile" },
  { code: "MX", name_es: "México", name_en: "Mexico" },
  { code: "PE", name_es: "Perú", name_en: "Peru" },
];

/** Ciudades del catálogo simulado. Los id son geonameid reales. */
export const CITIES: City[] = [
  { id: 3936456, name: "Lima", admin1: "Lima", country_code: "PE" },
  { id: 3947322, name: "Arequipa", admin1: "Arequipa", country_code: "PE" },
  { id: 3871336, name: "Santiago", admin1: "Metropolitana", country_code: "CL" },
  { id: 3895088, name: "Chillán", admin1: "Ñuble", country_code: "CL" },
  { id: 3530597, name: "Ciudad de México", admin1: "Ciudad de México", country_code: "MX" },
];

/** Minúsculas y sin tildes, como core.search_key en la base. */
export function searchKey(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Estado en memoria del "backend". Cada test arranca con el suyo. */
export type MockState = {
  email: string;
  person: Person;
  profile: Profile | null;
  resume: Resume | null;
  universities: { id: string; name: string; country_code: string }[];
  countries: Country[];
  cities: City[];
  /** Fuerza respuestas de error en GET /talent/profile. */
  profileError?: "network" | "unconfirmed";
  calls: { method: string; path: string; body?: Json }[];
  otpRequests: Json[];
  storageUploads: string[];
  /** Respuesta de POST /talent/resume/parse (lectura del CV con IA). */
  parse?: Json;
  /** Demora de esa respuesta, para ver el estado "Leyendo tu CV…". */
  parseDelayMs?: number;
  /** Simula que el backend no responde (red caída). */
  parseNetworkError?: boolean;
};

export function newState(overrides: Partial<MockState> = {}): MockState {
  const email = overrides.email ?? "valeria@test.com";
  return {
    email,
    person: {
      id: PERSON_ID,
      email,
      given_names: null,
      family_names: null,
      full_name: null,
      country_code: null,
      country_name: null,
      city_id: null,
      city_name: null,
      city_admin1: null,
      city_other: null,
      university_id: null,
      university_other: null,
      university_name: null,
      major: null,
      graduation_year: null,
      linkedin_url: null,
    },
    profile: null,
    resume: null,
    universities: [],
    countries: COUNTRIES,
    cities: CITIES,
    calls: [],
    otpRequests: [],
    storageUploads: [],
    ...overrides,
  };
}

/** Estado de una persona que ya terminó el registro. */
export function completedState(overrides: Partial<MockState> = {}): MockState {
  const state = newState(overrides);
  state.person = {
    ...state.person,
    given_names: "Valeria",
    family_names: "Mendoza",
    full_name: "Valeria Mendoza",
    country_code: "PE",
    country_name: "Perú",
    city_id: 3936456,
    city_name: "Lima",
    city_admin1: "Lima",
    university_other: "UTEC",
    major: "Computer Science",
    graduation_year: 2029,
    linkedin_url: "https://www.linkedin.com/in/valeria",
  };
  state.profile = {
    headline: null,
    english_level: "avanzado",
    skills: ["Python", "SQL"],
    top_skills: ["Python"],
    target_roles: ["Software Engineer"],
    availability: "practicas",
    recruiter_visible: false,
    recruiter_visible_consented_at: null,
    onboarding_completed_at: "2026-11-18T10:00:00Z",
  };
  return state;
}

// ------------------------------------------------------------------ helpers
function cors(route: Route): Record<string, string> {
  const req = route.request();
  return {
    "access-control-allow-origin": req.headers()["origin"] ?? "*",
    "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers":
      req.headers()["access-control-request-headers"] ??
      "authorization,content-type,apikey,x-client-info,x-supabase-api-version,x-upsert,cache-control",
  };
}

async function reply(route: Route, status: number, body?: unknown) {
  if (route.request().method() === "OPTIONS") {
    return route.fulfill({ status: 204, headers: cors(route) });
  }
  if (body === undefined) return route.fulfill({ status, headers: cors(route) });
  return route.fulfill({ status, headers: { ...cors(route), "content-type": "application/json" }, body: JSON.stringify(body) });
}

function fakeJwt(payload: Json): string {
  const enc = (o: Json) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${enc({ alg: "HS256", typ: "JWT" })}.${enc(payload)}.signature`;
}

function session(email: string): Json {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const user = {
    id: USER_ID,
    aud: "authenticated",
    role: "authenticated",
    email,
    email_confirmed_at: new Date().toISOString(),
    app_metadata: { provider: "email" },
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  return {
    access_token: fakeJwt({ sub: USER_ID, email, aud: "authenticated", exp }),
    refresh_token: "refresh-e2e",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: exp,
    user,
  };
}

// ------------------------------------------------------------------- mocks
export async function mockSupabase(page: Page, state: MockState) {
  await page.route(`${MOCK_SUPABASE_URL}/auth/v1/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (req.method() === "OPTIONS") return reply(route, 204);

    if (url.pathname === "/auth/v1/otp") {
      state.otpRequests.push(req.postDataJSON() as Json);
      return reply(route, 200, {});
    }
    if (url.pathname === "/auth/v1/verify") {
      const body = req.postDataJSON() as Json;
      if (body.token !== GOOD_CODE) {
        return reply(route, 403, { code: 403, error_code: "otp_expired", msg: "Token has expired or is invalid" });
      }
      return reply(route, 200, session(String(body.email ?? state.email)));
    }
    if (url.pathname === "/auth/v1/token") return reply(route, 200, session(state.email));
    if (url.pathname === "/auth/v1/logout") return reply(route, 204);
    if (url.pathname === "/auth/v1/user") return reply(route, 200, session(state.email).user);
    return reply(route, 404, { msg: `mock sin ruta: ${url.pathname}` });
  });

  await page.route(`${MOCK_SUPABASE_URL}/storage/v1/**`, async (route) => {
    const url = new URL(route.request().url());
    if (route.request().method() === "OPTIONS") return reply(route, 204);
    state.storageUploads.push(url.pathname);
    return reply(route, 200, { Key: url.pathname.split("/sign/")[1] ?? "" });
  });
}

export async function mockApi(page: Page, state: MockState) {
  await page.route(`${MOCK_API_URL}/**`, async (route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") return reply(route, 204);
    const url = new URL(req.url());
    const path = url.pathname.replace(/^\/api\/v1/, "");
    const body = req.postData() ? (req.postDataJSON() as Json) : undefined;
    state.calls.push({ method: req.method(), path, body });

    if (path === "/talent/profile" && req.method() === "GET") {
      if (state.profileError === "network") return route.abort("connectionrefused");
      if (state.profileError === "unconfirmed") {
        return reply(route, 409, { detail: { code: "email_not_confirmed", message: "Confirma tu email para continuar" } });
      }
      return reply(route, 200, { person: state.person, profile: state.profile });
    }

    if (path === "/talent/profile" && req.method() === "PUT" && body) {
      const p = { ...state.person } as Person;
      for (const key of [
        "given_names", "family_names", "country_code", "city_id", "city_other", "linkedin_url",
        "university_id", "university_other", "major", "graduation_year",
      ] as const) {
        (p as Record<string, unknown>)[key] = body[key] ?? null;
      }
      p.full_name = [p.given_names, p.family_names].filter(Boolean).join(" ") || null;
      p.university_name = state.universities.find((u) => u.id === p.university_id)?.name ?? null;
      p.country_name = state.countries.find((c) => c.code === p.country_code)?.name_es ?? null;
      const city = state.cities.find((c) => c.id === p.city_id);
      p.city_name = city?.name ?? null;
      p.city_admin1 = city?.admin1 ?? null;
      state.person = p;
      const visible = Boolean(body.recruiter_visible);
      state.profile = {
        headline: (body.headline as string) ?? null,
        english_level: (body.english_level as string) ?? null,
        skills: (body.skills as string[]) ?? [],
        top_skills: (body.top_skills as string[]) ?? [],
        target_roles: (body.target_roles as string[]) ?? [],
        availability: (body.availability as string) ?? null,
        recruiter_visible: visible,
        recruiter_visible_consented_at: visible
          ? state.profile?.recruiter_visible_consented_at ?? new Date().toISOString()
          : null,
        onboarding_completed_at: state.profile?.onboarding_completed_at ?? new Date().toISOString(),
      };
      return reply(route, 200, { person: state.person, profile: state.profile });
    }

    if (path === "/talent/events" && req.method() === "POST") return reply(route, 204);

    if (path === "/talent/resume/parse" && req.method() === "POST") {
      if (state.parseDelayMs) await new Promise((r) => setTimeout(r, state.parseDelayMs));
      if (state.parseNetworkError) return route.abort("connectionrefused");
      return reply(route, 200, state.parse ?? { status: "failed", reason: "ia_desactivada", suggestions: null });
    }

    if (path === "/countries") return reply(route, 200, state.countries);

    if (path === "/cities") {
      const country = url.searchParams.get("country") ?? "";
      const q = searchKey(url.searchParams.get("q") ?? "");
      return reply(
        route,
        200,
        state.cities.filter((c) => c.country_code === country && searchKey(c.name).includes(q)),
      );
    }

    if (path === "/universities") {
      const q = (url.searchParams.get("q") ?? "").toLowerCase();
      return reply(route, 200, state.universities.filter((u) => u.name.toLowerCase().includes(q)));
    }

    if (path === "/talent/resume/upload-url" && body) {
      const storage_path = `${PERSON_ID}/e2e-${Date.now()}.pdf`;
      return reply(route, 200, {
        upload_url: `${MOCK_SUPABASE_URL}/storage/v1/object/upload/sign/resumes/${storage_path}?token=signed-token`,
        storage_path,
      });
    }

    if (path === "/talent/resume" && req.method() === "POST" && body) {
      state.resume = {
        id: "r1",
        file_name: String(body.file_name),
        mime_type: String(body.mime_type),
        size_bytes: Number(body.size_bytes),
        uploaded_at: new Date().toISOString(),
        download_url: null,
      };
      return reply(route, 201, state.resume);
    }

    if (path === "/talent/resume" && req.method() === "GET") {
      if (!state.resume) return reply(route, 204);
      return reply(route, 200, { ...state.resume, download_url: `${MOCK_SUPABASE_URL}/storage/v1/object/sign/resumes/cv.pdf` });
    }

    return reply(route, 404, { detail: `mock sin ruta: ${req.method()} ${path}` });
  });
}

/** Prepara la página: sin aviso de cookies, Supabase y API simulados. */
export async function setup(page: Page, state: MockState) {
  await page.addInitScript(() => localStorage.setItem("lead-cookie-consent", "essential"));
  await mockSupabase(page, state);
  await mockApi(page, state);
}

/** Inicia sesión por la pantalla de login con el código correcto. */
export async function loginViaUi(page: Page, state: MockState) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(state.email);
  await page.getByRole("button", { name: "Enviar código" }).click();
  await page.getByLabel("Dígito 1").fill(GOOD_CODE);
}
