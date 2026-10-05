export type AnnouncementLink = { label: string; url: string };

export type Announcement = {
  id: string;
  title: string;
  body: string;
  author: string;
  at: string;
  links: AnnouncementLink[];
  image?: string;
  published: boolean;
};

export const announcements: Announcement[] = [
  {
    id: "an1",
    title: "Bienvenida al ciclo 2026-II",
    body: "Arrancamos el semestre con capítulos en Perú y Colombia. Revisa tu capítulo y tus próximos eventos.",
    author: "Kiara Aguirre · Programs & Communication",
    at: "hace 2 días",
    links: [{ label: "Ver próximos eventos", url: "/eventos" }],
    published: true,
  },
  {
    id: "an2",
    title: "Nuevos eventos globales",
    body: "Este mes abrimos charlas virtuales para toda LEAD. Inscríbete desde Eventos.",
    author: "Jhoel Cisneros · Events",
    at: "hace 5 días",
    links: [],
    published: true,
  },
  {
    id: "an3",
    title: "Borrador: convocatoria de mentores",
    body: "Estamos preparando la convocatoria de mentores para el próximo mes. (sin publicar aún)",
    author: "Kiara Aguirre · Programs & Communication",
    at: "hoy",
    links: [],
    published: false,
  },
];
