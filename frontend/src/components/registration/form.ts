import type { Availability, CareerStage, EnglishLevel, Person, ProfileInput, TalentProfile } from "@/lib/api";
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
};

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
