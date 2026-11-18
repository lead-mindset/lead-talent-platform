"use client";

import { getSupabase } from "@/lib/supabase";

/** Cliente del backend FastAPI. Manda el token de Supabase en cada request. */

export type Person = {
  id: string;
  email: string;
  given_names: string | null;
  family_names: string | null;
  /** Calculado en la base de datos: nombres + apellidos. Solo lectura. */
  full_name: string | null;
  city: string | null;
  country_code: string | null;
  university_id: string | null;
  university_other: string | null;
  university_name: string | null;
  major: string | null;
  graduation_year: number | null;
  linkedin_url: string | null;
};

export type TalentProfile = {
  headline: string | null;
  english_level: EnglishLevel | null;
  skills: string[];
  top_skills: string[];
  target_roles: string[];
  availability: Availability | null;
  recruiter_visible: boolean;
  recruiter_visible_consented_at: string | null;
  onboarding_completed_at: string | null;
};

export type EnglishLevel = "basico" | "intermedio" | "avanzado" | "nativo";
export type Availability = "practicas" | "part" | "full";

export type ProfileResponse = { person: Person; profile: TalentProfile | null };

export type ProfileInput = {
  given_names: string;
  family_names?: string | null;
  city?: string | null;
  country_code?: string | null;
  linkedin_url?: string | null;
  university_id?: string | null;
  university_other?: string | null;
  major?: string | null;
  graduation_year?: number | null;
  headline?: string | null;
  english_level?: EnglishLevel | null;
  skills: string[];
  top_skills: string[];
  target_roles: string[];
  availability?: Availability | null;
  recruiter_visible: boolean;
};

export type University = { id: string; name: string; country_code: string };

export type Resume = {
  id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_at: string;
  download_url: string | null;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string | null,
    message: string,
  ) {
    super(message);
  }
}

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init: RequestInit = {}): Promise<T | null> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new ApiError(401, "no_session", "Inicia sesión para continuar");

  let res: Response;
  try {
    res = await fetch(`${BASE}/api/v1${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch {
    // Backend apagado, URL equivocada o bloqueo de CORS (también pasa si el backend responde 500).
    throw new ApiError(0, "network_error", `No pudimos conectar con el backend en ${BASE}. ¿Está corriendo uvicorn?`);
  }

  if (res.status === 204) return null;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = body?.detail;
    if (detail && typeof detail === "object" && "message" in detail) {
      throw new ApiError(res.status, detail.code ?? null, detail.message);
    }
    if (Array.isArray(detail)) {
      // Errores de validación de FastAPI (422)
      const msg = detail.map((d: { msg?: string }) => d.msg?.replace(/^Value error, /, "")).filter(Boolean).join(". ");
      throw new ApiError(res.status, "validation_error", msg || "Revisa los datos");
    }
    throw new ApiError(res.status, null, typeof detail === "string" ? detail : "Algo salió mal. Intenta de nuevo.");
  }
  return body as T;
}

export const api = {
  getProfile: () => request<ProfileResponse>("/talent/profile") as Promise<ProfileResponse>,

  saveProfile: (input: ProfileInput) =>
    request<ProfileResponse>("/talent/profile", { method: "PUT", body: JSON.stringify(input) }) as Promise<ProfileResponse>,

  searchUniversities: (q: string) =>
    request<University[]>(`/universities?q=${encodeURIComponent(q)}`) as Promise<University[]>,

  getResume: () => request<Resume>("/talent/resume"),

  /** Pide URL firmada, sube el archivo directo a Storage y confirma en el backend. */
  async uploadResume(file: File): Promise<Resume> {
    const meta = { file_name: file.name, mime_type: file.type, size_bytes: file.size };
    const signed = (await request<{ upload_url: string; storage_path: string }>("/talent/resume/upload-url", {
      method: "POST",
      body: JSON.stringify(meta),
    }))!;

    const token = new URL(signed.upload_url).searchParams.get("token");
    if (!token) throw new ApiError(500, "upload_failed", "No pudimos preparar la subida. Intenta de nuevo.");
    const { error } = await getSupabase()
      .storage.from("resumes")
      .uploadToSignedUrl(signed.storage_path, token, file, { contentType: file.type });
    if (error) throw new ApiError(500, "upload_failed", "No pudimos subir el archivo. Intenta de nuevo.");

    return (await request<Resume>("/talent/resume", {
      method: "POST",
      body: JSON.stringify({ ...meta, storage_path: signed.storage_path }),
    }))!;
  },
};

/** Texto de error para mostrar en pantalla. Incluye el código HTTP para depurar. */
export function describeError(err: unknown): string {
  if (err instanceof ApiError) return err.status ? `${err.message} (HTTP ${err.status})` : err.message;
  return "Error inesperado. Revisa la consola del navegador.";
}

/** A dónde ir después de iniciar sesión: al wizard si no hay perfil, al perfil si ya existe. */
export async function routeAfterLogin(): Promise<string> {
  try {
    const { profile } = await api.getProfile();
    return profile?.onboarding_completed_at ? "/perfil" : "/perfil/nuevo";
  } catch (err) {
    if (err instanceof ApiError && err.code === "email_not_confirmed") return "/login?confirmar=1";
    throw err;
  }
}
