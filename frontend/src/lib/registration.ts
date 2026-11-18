"use client";

import { api, type CareerStage, type FunnelEvent, type FunnelEventName } from "@/lib/api";

/** Registro de 6 pasos: opciones, porcentaje del perfil, eventos del embudo y borrador local. */

export const TOTAL_STEPS = 6;

export const CAREER_STAGES: { value: CareerStage; mark: string; label: string; hint: string }[] = [
  { value: "estudiante_universitario", mark: "U", label: "Estudiante universitario", hint: "Pregrado en curso" },
  { value: "recien_graduado", mark: "G", label: "Recién graduado", hint: "Menos de 2 años" },
  { value: "posgrado", mark: "P", label: "Posgrado", hint: "Maestría o doctorado" },
  { value: "profesional_joven", mark: "J", label: "Profesional joven", hint: "Busco mi siguiente paso" },
];

// ------------------------------------------------------------ porcentaje
export type Completeness = {
  careerStage: boolean;
  resume: boolean;
  basics: boolean; // nombres, país y universidad
  skills: boolean;
  roles: boolean;
  linkedin: boolean;
  topSkills: boolean;
};

export type CompletenessKey = keyof Completeness;

/** Cuánto suma cada parte. El CV pesa más porque es lo que más miran las empresas. Total: 100. */
const WEIGHTS: Record<CompletenessKey, number> = {
  careerStage: 10,
  resume: 40,
  basics: 10,
  skills: 10,
  roles: 10,
  linkedin: 10,
  topSkills: 10,
};

export function completenessPercent(done: Completeness): number {
  return (Object.keys(WEIGHTS) as CompletenessKey[]).reduce((sum, key) => sum + (done[key] ? WEIGHTS[key] : 0), 0);
}

const ACTION_LABELS: Partial<Record<CompletenessKey, string>> = {
  resume: "Sube tu CV",
  linkedin: "Agrega tu LinkedIn",
  topSkills: "Elige tus 3 skills principales",
  roles: "Elige los caminos que te interesan",
};

/** Lo que falta para llegar al 100%, de lo que más suma a lo que menos. */
export function pendingActions(done: Completeness): { key: CompletenessKey; label: string; gain: number }[] {
  return (Object.keys(ACTION_LABELS) as CompletenessKey[])
    .filter((key) => !done[key])
    .map((key) => ({ key, label: ACTION_LABELS[key]!, gain: WEIGHTS[key] }))
    .sort((a, b) => b.gain - a.gain);
}

// ------------------------------------------------------------- embudo
function device(): FunnelEvent["device"] {
  const width = typeof window === "undefined" ? 1280 : window.innerWidth;
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

export function newSessionId(): string {
  return crypto.randomUUID();
}

/**
 * Manda un evento del embudo sin esperar respuesta. Si falla, se ignora:
 * la navegación del registro nunca depende de esto.
 */
export function track(
  sessionId: string,
  name: FunnelEventName,
  step: number,
  extra: { secondsOnStep?: number; reason?: string } = {},
): void {
  const event: FunnelEvent = {
    session_id: sessionId,
    name,
    step,
    device: device(),
    seconds_on_step: extra.secondsOnStep ?? null,
    reason: extra.reason ?? null,
  };
  try {
    api.sendEvent(event).catch(() => undefined);
  } catch {
    // sin red, sin sesión o lo que sea: no bloquea el registro
  }
}

// ------------------------------------------------------- borrador local
/**
 * "Guardar y salir" guarda el avance en este navegador, no en el backend:
 * el perfil solo se crea al terminar el paso 5. Se borra al terminar o al cerrar sesión.
 */
const DRAFT_PREFIX = "lead-registro:";

export function loadDraft<T>(userId: string): T | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_PREFIX + userId);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveDraft(userId: string, draft: unknown): void {
  try {
    window.localStorage.setItem(DRAFT_PREFIX + userId, JSON.stringify(draft));
  } catch {
    // modo privado o almacenamiento lleno: se pierde el borrador, nada más
  }
}

export function clearDrafts(): void {
  try {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith(DRAFT_PREFIX))
      .forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // nada que limpiar
  }
}
