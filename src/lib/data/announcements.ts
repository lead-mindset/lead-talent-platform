export type Announcement = {
  id: string;
  title: string;
  body: string;
  author: string;
  at: string;
};

export const announcements: Announcement[] = [
  { id: "an1", title: "Bienvenida al ciclo 2026-II", body: "Arrancamos el semestre con capítulos en Perú y Colombia. Revisa tu capítulo y tus próximos eventos.", author: "Kiara Aguirre · Programs & Communication", at: "hace 2 días" },
  { id: "an2", title: "Nuevos eventos globales", body: "Este mes abrimos charlas virtuales para toda LEAD. Inscríbete desde Eventos.", author: "Jhoel Cisneros · Events", at: "hace 5 días" },
];
