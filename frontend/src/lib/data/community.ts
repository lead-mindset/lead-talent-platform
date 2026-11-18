import type { Person } from "./people";

export type Post = {
  id: string;
  author: Person;
  timeAgo: string;
  body: string;
  action?: { label: string; href: string };
  pinned?: boolean;
};

export const posts: Post[] = [
  {
    id: "post-1",
    author: {
      id: "lead",
      name: "LEAD UTEC",
      initials: "LP",
      avatarColor: "brand-purple",
      headline: "Comunidad LEAD",
      school: "",
      classYear: "",
      major: "",
      skills: [],
      location: "",
      country: "Perú",
      chapter: "LEAD UTEC",
      openToWork: false,
    },
    timeAgo: "hace 2 horas",
    body: "📢 ¡Más de 100 estudiantes de secundaria, múltiples colegios de Lima, 13 capítulos universitarios y más de 70 voluntarios! Así fue el Discover Day 2026 en UTEC. Ya estamos pensando en el Discover Day 2027 🚀 #LEAD #DiscoverDay #TalentPipeline",
    action: { label: "Ver evento", href: "/eventos" },
    pinned: true,
  },
  {
    id: "post-2",
    author: {
      id: "lead-am",
      name: "LEAD Javeriana",
      initials: "LA",
      avatarColor: "brand-rose",
      headline: "Expansión Colombia",
      school: "",
      classYear: "",
      major: "",
      skills: [],
      location: "",
      country: "Colombia",
      chapter: "LEAD Javeriana",
      openToWork: false,
    },
    timeAgo: "hace 1 día",
    body: "¡LEAD llegó a Colombia! 🇨🇴 Organizamos el primer evento universitario, LEAD Future, en la Universidad Santo Tomás y lanzamos un nuevo capítulo en la Pontificia Universidad Javeriana. Del Perú al mundo. #LEADColombia #Liderazgo",
  },
  {
    id: "post-3",
    author: {
      id: "utp",
      name: "LEAD UTP",
      initials: "UT",
      avatarColor: "brand-orange",
      headline: "Capítulo UTP",
      school: "",
      classYear: "",
      major: "",
      skills: [],
      location: "",
      country: "Perú",
      chapter: "LEAD UTP",
      openToWork: false,
    },
    timeAgo: "hace 3 días",
    body: "El equipo UTP representó a LEAD en el RAISE Summit Hackathon en París con ContextCore, una memoria compartida para agentes de IA. ¡Orgullo UTP! #OrgulloUTP #IA",
  },
];

export type EventScope = "global" | "country" | "chapter";
export type RegistrationMode = "external" | "platform";
export type AttendanceMode = "qr" | "link" | "manual" | "none";

export type LeadEvent = {
  id: string;
  month: string;
  day: string;
  title: string;
  location: string;
  type: "Workshop" | "Panel" | "Networking" | "Charla";
  description: string;
  date: string;
  time: string;
  host: string;
  calendar: string;
  image?: string;
  scope?: EventScope;
  registrationMode?: RegistrationMode;
  registrationUrl?: string;
  attendanceMode?: AttendanceMode;
  longDescription?: string;
  agenda?: string[];
  speakers?: { name: string; role: string }[];
  capacity?: number;
};

export function getEventScope(event: LeadEvent): EventScope {
  if (event.scope) return event.scope;
  return event.calendar === "LEAD Global" ? "global" : "chapter";
}

export function getRegistrationMode(event: LeadEvent): RegistrationMode {
  if (event.registrationMode) return event.registrationMode;
  return getEventScope(event) === "global" ? "platform" : "external";
}

export function getAttendanceMode(event: LeadEvent): AttendanceMode {
  if (event.attendanceMode) return event.attendanceMode;
  const scope = getEventScope(event);
  if (scope === "global") {
    return event.location.toLowerCase().includes("virtual") ? "link" : "qr";
  }
  return "manual";
}

export const events: LeadEvent[] = [
  {
    id: "ev-1",
    month: "OCT",
    day: "06",
    title: "Discover Day 2026",
    location: "UTEC · Lima",
    type: "Workshop",
    description: "Un día de talleres STEM para estudiantes de secundaria, guiado por los capítulos de LEAD.",
    date: "2026-10-06",
    time: "09:00",
    host: "LEAD UTEC · LEAD Academia",
    calendar: "LEAD UTEC",
    image: "/media/events/discover-day-workshop.webp",
    registrationMode: "external",
    registrationUrl: "https://forms.gle/lead-discover-day",
    attendanceMode: "qr",
    longDescription:
      "Más de 100 estudiantes de colegios de Lima pasan por seis talleres de tecnología, robótica e IA guiados por voluntarios de los capítulos de LEAD. La idea es que descubran la universidad y las carreras STEM antes de que se sientan lejanas.",
    agenda: [
      "Bienvenida y formación de grupos",
      "Seis talleres rotativos",
      "Almuerzo con mentores",
      "Cierre y premiación",
    ],
    speakers: [
      { name: "Arianna Yauri", role: "Dir. de Programas, LEAD" },
      { name: "Luis Maquera", role: "Presidente, LEAD UTEC" },
    ],
  },
  {
    id: "ev-2",
    month: "OCT",
    day: "12",
    title: "IBM Explore Day",
    location: "IBM Perú · Lima",
    type: "Panel",
    description: "Visita al campus de IBM con charlas de IA, Quantum y liderazgo para estudiantes de LEAD.",
    date: "2026-10-12",
    time: "10:00",
    host: "LEAD Global · IBM",
    calendar: "LEAD Global",
    image: "/media/events/ibm-explore-day-speakers.webp",
    registrationMode: "platform",
    attendanceMode: "qr",
    capacity: 200,
    longDescription:
      "Un día en el campus de IBM Perú para ver de cerca cómo se construye tecnología real. Paneles de IA y Quantum, recorridos y conversaciones directas con líderes de la industria.",
    agenda: ["Registro y bienvenida", "Panel de IA y Quantum", "Recorrido por el campus", "Networking"],
    speakers: [
      { name: "Luis Coronel", role: "Founder & CEO, LEAD" },
      { name: "María Fernanda Ríos", role: "Líder de IA, IBM Perú" },
    ],
  },
  {
    id: "ev-3",
    month: "OCT",
    day: "19",
    title: "Microsoft Leadership Summit",
    location: "Microsoft Perú · Lima",
    type: "Workshop",
    description: "Un día de liderazgo con mentores de Microsoft para los e-boards de todos los capítulos.",
    date: "2026-10-19",
    time: "09:00",
    host: "LEAD Global · Microsoft",
    calendar: "LEAD Global",
    image: "/media/events/microsoft-leadership-summit.webp",
    registrationMode: "platform",
    attendanceMode: "qr",
    capacity: 150,
    longDescription:
      "Los equipos de liderazgo de los capítulos trabajan con mentores de Microsoft en comunicación, trabajo en equipo y cómo llevar un capítulo con estándares. Cierra con un espacio de networking.",
    agenda: ["Keynote de apertura", "Talleres de liderazgo", "Mentorías por capítulo", "Networking"],
    speakers: [{ name: "Antonny Porlles", role: "Co-Founder & COO, LEAD" }],
  },
  {
    id: "ev-4",
    month: "NOV",
    day: "03",
    title: "LATAM Women's Hackathon",
    location: "Virtual · LATAM",
    type: "Networking",
    description: "Hackathon regional para mujeres en STEM, con equipos de toda Latinoamérica.",
    date: "2026-11-03",
    time: "19:00",
    host: "LEAD HER",
    calendar: "LEAD Global",
    image: "/media/events/latam-womens-hackathon-static.webp",
    registrationMode: "platform",
    attendanceMode: "link",
    longDescription:
      "Equipos de mujeres de toda LATAM resuelven retos reales en 24 horas. Habrá mentoras durante todo el evento y una demo final frente a jurados de la industria.",
    agenda: ["Apertura y formación de equipos", "Mentorías", "Demos finales y premiación"],
    speakers: [{ name: "Arianna Yauri", role: "Dir. de Programas, LEAD" }],
  },
  {
    id: "ev-5",
    month: "NOV",
    day: "09",
    title: "Rutgers Shadow Program",
    location: "Virtual · Rutgers",
    type: "Charla",
    description: "Estudiantes de secundaria acompañan un día de universidad en Rutgers y arman su primer proyecto de IA.",
    date: "2026-11-09",
    time: "18:30",
    host: "LEAD Global · Rutgers",
    calendar: "LEAD Global",
    image: "/media/events/rutgers-shadow-program.webp",
    registrationMode: "external",
    registrationUrl: "https://forms.gle/lead-rutgers-shadow",
    attendanceMode: "link",
    longDescription:
      "Más de 80 estudiantes de secundaria viven un día de universidad junto a mentores de Rutgers. Además de recorrer el campus, cada grupo arma una idea de proyecto de IA y la presenta al final.",
    agenda: ["Bienvenida", "Recorrido por el campus", "Taller de ideas de proyecto", "Presentaciones"],
  },
  {
    id: "ev-6",
    month: "NOV",
    day: "15",
    title: "Agent Innovation Day",
    location: "PUCP · Lima",
    type: "Workshop",
    description: "Un día aplicado de IA agéntica donde estudiantes resuelven casos reales de industria.",
    date: "2026-11-15",
    time: "09:00",
    host: "LEAD Global · Agentes de IA",
    calendar: "LEAD Global",
    image: "/media/events/agent-innovation-static.webp",
    registrationMode: "platform",
    attendanceMode: "qr",
    capacity: 60,
    longDescription:
      "Más de 40 universitarios trabajan casos reales con herramientas de IA agéntica, acompañados por profesionales. El objetivo es pasar de aprender sobre IA a usarla para resolver problemas.",
    agenda: ["Kickoff y equipos", "Construcción con agentes", "Mentorías", "Demos y feedback"],
    speakers: [
      { name: "Christopher Lozada", role: "Country Director, Perú" },
      { name: "Diego Paredes", role: "Ingeniero, Google" },
    ],
  },
  {
    id: "ev-7",
    month: "OCT",
    day: "10",
    title: "Visita a Microsoft · PUCP",
    location: "Microsoft Perú · Lima",
    type: "Panel",
    description: "Visita corporativa de LEAD PUCP al campus de Microsoft para conocer equipos y carreras.",
    date: "2026-10-10",
    time: "15:00",
    host: "LEAD PUCP",
    calendar: "LEAD PUCP",
    image: "/media/events/microsoft-pucp-visit.webp",
    registrationMode: "external",
    registrationUrl: "https://forms.gle/lead-pucp-microsoft",
    attendanceMode: "manual",
    longDescription:
      "Un grupo de LEAD PUCP visita Microsoft Perú para conocer de cerca cómo trabajan los equipos de producto e ingeniería, y qué esperan de los practicantes.",
    agenda: ["Bienvenida", "Charla de equipos", "Recorrido", "Preguntas abiertas"],
    speakers: [{ name: "Xendra Jaime", role: "Presidenta, LEAD PUCP" }],
  },
  {
    id: "ev-8",
    month: "OCT",
    day: "23",
    title: "LEAD Games",
    location: "Lima · Presencial",
    type: "Networking",
    description: "La competencia regional donde todos los capítulos se encuentran y compiten en equipo.",
    date: "2026-10-23",
    time: "16:00",
    host: "LEAD Global",
    calendar: "LEAD Global",
    image: "/media/events/lead-games-chapters.webp",
    registrationMode: "platform",
    attendanceMode: "qr",
    capacity: 300,
    longDescription:
      "Un evento regional que junta a los capítulos de LEAD alrededor de retos, deporte y comunidad. Una jornada para conocerse fuera de la universidad y reforzar el sentido de pertenencia.",
    agenda: ["Apertura por capítulos", "Retos y competencias", "Premiación", "Cierre comunitario"],
  },
  {
    id: "ev-9",
    month: "NOV",
    day: "07",
    title: "LEAD Gala",
    location: "Lima · Presencial",
    type: "Charla",
    description: "La celebración anual que reconoce a los miembros y equipos que movieron a LEAD este año.",
    date: "2026-11-07",
    time: "12:00",
    host: "LEAD Global",
    calendar: "LEAD Global",
    image: "/media/events/lead-gala-static.webp",
    registrationMode: "platform",
    attendanceMode: "qr",
    capacity: 250,
    longDescription:
      "Una noche para reconocer el esfuerzo y el crecimiento de los capítulos y sus miembros. Premios, historias y un cierre de año junto a toda la comunidad.",
    agenda: ["Recepción", "Premiación por capítulo", "Palabras de cierre"],
  },
  {
    id: "ev-10",
    month: "NOV",
    day: "21",
    title: "Little Einsteins · UTP",
    location: "UTP · Lima",
    type: "Workshop",
    description: "Talleres de tecnología para niños, llevados por voluntarios de LEAD UTP a su comunidad.",
    date: "2026-11-21",
    time: "09:00",
    host: "LEAD UTP",
    calendar: "LEAD UTP",
    image: "/media/events/little-einsteins-static.webp",
    registrationMode: "external",
    registrationUrl: "https://forms.gle/lead-little-einsteins",
    attendanceMode: "manual",
    longDescription:
      "Más de 50 niños se acercan a la ciencia y la tecnología con talleres divertidos y accesibles. Un proyecto que convierte el acceso a la educación en curiosidad y impacto local.",
    agenda: ["Bienvenida", "Talleres por estaciones", "Juegos y cierre"],
  },
  {
    id: "ev-11",
    month: "SEP",
    day: "16",
    title: "Kickoff de semestre",
    location: "Virtual · Zoom",
    type: "Charla",
    description: "Arranque de semestre con la comunidad: metas, capítulos y lo que viene.",
    date: "2026-09-16",
    time: "18:00",
    host: "LEAD Javeriana",
    calendar: "LEAD Javeriana",
    attendanceMode: "link",
  },
  {
    id: "ev-12",
    month: "SEP",
    day: "24",
    title: "Meetup: Data Science en LATAM",
    location: "Bogotá · Híbrido",
    type: "Charla",
    description: "Cómo se usa data science en la industria latinoamericana hoy, con casos reales.",
    date: "2026-09-24",
    time: "19:00",
    host: "LEAD Javeriana",
    calendar: "LEAD Javeriana",
    attendanceMode: "link",
  },
];
