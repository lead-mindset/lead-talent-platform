import { adminChapters } from "@/lib/data/admin";

/** Chapters are the single source of truth for onboarding, profile editing and filters. */
export const CHAPTERS = adminChapters.map((chapter) => chapter.name);

export const GRAD_YEARS = Array.from({ length: 2034 - 2005 + 1 }, (_, i) => String(2005 + i));

export const SKILL_POOL = [
  "Python", "JavaScript", "TypeScript", "SQL", "React", "Node.js", "HTML/CSS", "Git",
  "C++", "Java", "Go", "Data Analysis", "Machine Learning", "Deep Learning", "Figma",
  "UI/UX", "Design Systems", "AWS", "Docker", "Excel", "Marketing Digital", "R",
  "Linux", "System Design", "Econometrics", "SolidWorks", "Kotlin",
  "Liderazgo", "Comunicación", "Trabajo en equipo", "Presentaciones", "Resolución de problemas",
  "Adaptabilidad", "Mentoring", "Gestión del tiempo", "Gestión de proyectos",
  "Community management", "Organización de eventos", "Escritura técnica",
  "Data storytelling", "Excel Avanzado",
];

export const ROLE_POOL = [
  "Software Engineer", "Data Science", "Product Manager", "UI/UX", "DevOps",
  "Research", "Marketing", "Community",
];

export const LANGUAGE_LEVELS = ["Básico", "Intermedio", "Avanzado", "Nativo"];

export type Option<T extends string = string> = { value: T; label: string };

export const AVAILABILITY: Option[] = [
  { value: "practicas", label: "Prácticas" },
  { value: "part", label: "Tiempo parcial" },
  { value: "full", label: "Tiempo completo" },
];

export const WORK_AUTH: Option[] = [
  { value: "si", label: "Sí tengo" },
  { value: "no", label: "Aún no" },
];
