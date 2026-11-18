import {
  cityLabel,
  type Availability,
  type CareerStage,
  type CvSuggestions,
  type EnglishLevel,
  type Person,
  type ProfileInput,
  type TalentProfile,
} from "@/lib/api";
import type { Completeness } from "@/lib/registration";

/** Todo lo que junta el registro. Vive en el wizard y se guarda al terminar el paso 5. */
export type RegistrationForm = {
  careerStage: CareerStage | null;
  // Paso 2: CV ya subido (el archivo vive en Storage) o "No tengo CV todavía".
  resume: { fileName: string; sizeBytes: number } | null;
  noCv: boolean;
  // Paso 3
  givenNames: string;
  familyNames: string;
  country: string;
  /** Ciudad del catálogo (cityId) o escrita a mano (cityOther), nunca las dos. */
  cityMode: "search" | "other";
  cityId: number | null;
  cityText: string;
  cityOther: string;
  university: string;
  universityId: string | null;
  major: string;
  year: string;
  // Paso 4
  skills: string[];
  topSkills: string[];
  // Paso 5
  roles: string[];
  availability: Availability;
  visible: boolean;
  // Fuera de los 6 pasos: se editan en el paso 6 o en "Editar perfil", y se conservan al guardar.
  linkedin: string;
  english: EnglishLevel | null;
  headline: string | null;
  /** Campos prellenados por la lectura del CV con IA. La marca se quita cuando el estudiante los cambia. */
  aiFields: AiField[];
};

export type AiField =
  | "givenNames"
  | "familyNames"
  | "country"
  | "city"
  | "university"
  | "major"
  | "year"
  | "skills"
  | "linkedin";

export type UpdateForm = (patch: Partial<RegistrationForm>) => void;

export const EMPTY_FORM: RegistrationForm = {
  careerStage: null,
  resume: null,
  noCv: false,
  givenNames: "",
  familyNames: "",
  country: "",
  cityMode: "search",
  cityId: null,
  cityText: "",
  cityOther: "",
  university: "",
  universityId: null,
  major: "",
  year: "",
  skills: [],
  topSkills: [],
  roles: [],
  availability: "practicas",
  visible: false,
  linkedin: "",
  english: null,
  headline: null,
  aiFields: [],
};

export function formFromProfile(person: Person, profile: TalentProfile | null): RegistrationForm {
  return {
    ...EMPTY_FORM,
    careerStage: profile?.career_stage ?? null,
    givenNames: person.given_names ?? "",
    familyNames: person.family_names ?? "",
    country: person.country_code ?? "",
    cityMode: person.city_other ? "other" : "search",
    cityId: person.city_id,
    cityText: person.city_id ? [person.city_name, person.city_admin1].filter(Boolean).join(", ") : "",
    cityOther: person.city_other ?? "",
    university: person.university_name ?? person.university_other ?? "",
    universityId: person.university_id,
    major: person.major ?? "",
    year: person.graduation_year ? String(person.graduation_year) : "",
    skills: profile?.skills ?? [],
    topSkills: profile?.top_skills ?? [],
    roles: profile?.target_roles ?? [],
    availability: profile?.availability ?? "practicas",
    visible: profile?.recruiter_visible ?? false,
    linkedin: person.linkedin_url ?? "",
    english: profile?.english_level ?? null,
    headline: profile?.headline ?? null,
  };
}

export function normalizeLinkedin(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  return /^https?:\/\//i.test(value) ? value.replace(/^http:/i, "https:") : `https://${value}`;
}

/** PUT /talent/profile reemplaza el perfil completo: siempre se manda todo, career_stage incluido. */
export function toProfileInput(form: RegistrationForm): ProfileInput {
  return {
    given_names: form.givenNames.trim(),
    family_names: form.familyNames.trim() || null,
    country_code: form.country,
    city_id: form.cityMode === "search" ? form.cityId : null,
    city_other: form.cityMode === "other" ? form.cityOther.trim() || null : null,
    linkedin_url: normalizeLinkedin(form.linkedin),
    university_id: form.universityId,
    university_other: form.universityId ? null : form.university.trim(),
    major: form.major.trim() || null,
    graduation_year: form.year.trim() ? Number(form.year) : null,
    career_stage: form.careerStage,
    headline: form.headline,
    english_level: form.english,
    skills: form.skills,
    top_skills: form.topSkills.filter((skill) => form.skills.includes(skill)),
    target_roles: form.roles,
    availability: form.availability,
    recruiter_visible: form.visible,
  };
}

export function completenessOf(form: RegistrationForm): Completeness {
  const topNeeded = Math.min(3, form.skills.length);
  return {
    careerStage: form.careerStage !== null,
    resume: form.resume !== null,
    basics: Boolean(form.givenNames.trim() && form.country && form.university.trim()),
    skills: form.skills.length > 0,
    roles: form.roles.length > 0,
    linkedin: Boolean(form.linkedin.trim()),
    topSkills: topNeeded > 0 && form.topSkills.filter((s) => form.skills.includes(s)).length >= topNeeded,
  };
}

/** Qué campo marcado por la IA toca cada clave del formulario. */
const AI_FIELD_OF: Partial<Record<keyof RegistrationForm, AiField>> = {
  givenNames: "givenNames",
  familyNames: "familyNames",
  country: "country",
  cityMode: "city",
  cityId: "city",
  cityOther: "city",
  university: "university",
  universityId: "university",
  major: "major",
  year: "year",
  skills: "skills",
  linkedin: "linkedin",
};

/** Quita la marca "sugerido por IA" de los campos que el estudiante cambió en este patch. */
export function withoutTouchedAiFields(form: RegistrationForm, patch: Partial<RegistrationForm>): AiField[] {
  if (form.aiFields.length === 0) return form.aiFields;
  const touched = new Set<AiField>();
  for (const key of Object.keys(patch) as (keyof RegistrationForm)[]) {
    const field = AI_FIELD_OF[key];
    if (field && patch[key] !== form[key]) touched.add(field);
  }
  // Una ciudad es de un solo país: si cambia el país, la ciudad sugerida tampoco vale.
  if (touched.has("country")) touched.add("city");
  return form.aiFields.filter((f) => !touched.has(f));
}

const MAX_SKILLS = 30;

/**
 * Prellena con las sugerencias del CV solo los campos vacíos: nunca pisa lo que el estudiante ya
 * escribió. Devuelve el formulario nuevo con los campos prellenados marcados en aiFields.
 */
export function applySuggestions(form: RegistrationForm, s: CvSuggestions): RegistrationForm {
  const next: RegistrationForm = { ...form };
  const marked = new Set(form.aiFields);
  const fill = (key: "givenNames" | "familyNames" | "country" | "major" | "year" | "linkedin", value: string | null) => {
    if (!value || form[key].trim() !== "") return;
    next[key] = value;
    marked.add(key);
  };

  fill("givenNames", s.given_names);
  fill("familyNames", s.family_names);
  fill("country", s.country_code);
  fill("major", s.major);
  fill("year", s.graduation_year ? String(s.graduation_year) : null);
  fill("linkedin", s.linkedin);

  // Ciudad: solo si es del país que quedó elegido y todavía no hay ciudad.
  const noCity = form.cityId === null && form.cityOther.trim() === "";
  if (noCity && next.country && next.country === s.country_code) {
    if (s.city_id !== null) {
      Object.assign(next, {
        cityMode: "search",
        cityId: s.city_id,
        cityText: cityLabel(s.city_name, s.city_admin1),
        cityOther: "",
      });
      marked.add("city");
    } else if (s.city_other) {
      Object.assign(next, { cityMode: "other", cityId: null, cityText: "", cityOther: s.city_other });
      marked.add("city");
    }
  }

  // Universidad: la del catálogo si hubo coincidencia; si no, el nombre del CV como texto.
  if (!form.university.trim() && s.university_name) {
    Object.assign(next, { university: s.university_name, universityId: s.university_id });
    marked.add("university");
  }

  // Skills: se agregan las del CV que falten, sin pasar del máximo.
  const added = s.skills.filter((skill) => !form.skills.some((have) => have.toLowerCase() === skill.toLowerCase()));
  if (added.length > 0) {
    next.skills = [...form.skills, ...added].slice(0, MAX_SKILLS);
    if (next.skills.length > form.skills.length) marked.add("skills");
  }

  next.aiFields = [...marked];
  return next;
}
