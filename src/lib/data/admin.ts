export type AdminMember = {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  chapter: string;
  role: string;
  status: "active" | "pending" | "rejected";
  joined: string;
};

export const adminMembers: AdminMember[] = [
  { id: "m1", name: "Valeria Mendoza", initials: "VM", avatarColor: "brand-purple", chapter: "LEAD UTEC", role: "Tech Lead", status: "active", joined: "Sep 2026" },
  { id: "m2", name: "Gabriela Torres", initials: "GT", avatarColor: "brand-rose", chapter: "LEAD UTEC", role: "Miembro", status: "active", joined: "Ago 2026" },
  { id: "m3", name: "Mateo Ríos", initials: "MR", avatarColor: "brand-orange", chapter: "LEAD PUCP", role: "Miembro", status: "pending", joined: "Solicitó hace 2 días" },
  { id: "m4", name: "Camila Rojas", initials: "CR", avatarColor: "brand-red", chapter: "LEAD Javeriana", role: "VP", status: "active", joined: "Jul 2026" },
  { id: "m5", name: "Iván Quispe", initials: "IQ", avatarColor: "brand-purple", chapter: "LEAD UTP", role: "Miembro", status: "pending", joined: "Solicitó hace 1 día" },
  { id: "m6", name: "Mateo Silva", initials: "MS", avatarColor: "brand-rose", chapter: "Sin capítulo (USA)", role: "General member", status: "active", joined: "Ago 2026" },
];

export type AdminChapter = {
  id: string;
  name: string;
  university: string;
  members: number;
  events: number;
  region: string;
};

export const adminChapters: AdminChapter[] = [
  { id: "utec", name: "LEAD UTEC", university: "UTEC", members: 28, events: 5, region: "Perú" },
  { id: "pucp", name: "LEAD PUCP", university: "PUCP", members: 41, events: 8, region: "Perú" },
  { id: "utp", name: "LEAD UTP", university: "UTP", members: 22, events: 4, region: "Perú" },
  { id: "uni", name: "LEAD UNI", university: "UNI", members: 18, events: 3, region: "Perú" },
  { id: "upc", name: "LEAD UPC", university: "UPC", members: 15, events: 2, region: "Perú" },
  { id: "javeriana", name: "LEAD Javeriana", university: "Pontificia Universidad Javeriana", members: 12, events: 2, region: "Colombia" },
];

export type FundingRequest = {
  id: string;
  title: string;
  chapter: string;
  amount: string;
  status: "pending" | "approved" | "review";
};

export const fundingRequests: FundingRequest[] = [
  { id: "f1", title: "Discover Day 2027 — materiales", chapter: "LEAD UTEC", amount: "$320", status: "pending" },
  { id: "f2", title: "Hackathon — premios", chapter: "LEAD Javeriana", amount: "$150", status: "review" },
  { id: "f3", title: "Networking — catering", chapter: "LEAD PUCP", amount: "$90", status: "approved" },
];

export type ContactRole = "Recruiter" | "Talent Partner" | "Admin";
export type ContactStatus = "pending" | "accepted" | "revoked";

export type CompanyInvite = {
  id: string;
  company: string;
  contacts: { id: string; email: string; role: ContactRole; status: ContactStatus; sent: string }[];
};

export const companyInvites: CompanyInvite[] = [
  {
    id: "c1",
    company: "TechBridge Solutions",
    contacts: [
      { id: "c1a", email: "laura.garcia@techbridge.com", role: "Recruiter", status: "accepted", sent: "hace 1 semana" },
      { id: "c1b", email: "miguel.vargas@techbridge.com", role: "Talent Partner", status: "pending", sent: "hoy" },
    ],
  },
  {
    id: "c2",
    company: "DataVault",
    contacts: [
      { id: "c2a", email: "carlos.mendez@datavault.com", role: "Talent Partner", status: "pending", sent: "hace 2 días" },
    ],
  },
  {
    id: "c3",
    company: "Innova Tech",
    contacts: [
      { id: "c3a", email: "gabriel.soto@innova.com", role: "Admin", status: "revoked", sent: "hace 1 mes" },
    ],
  },
];

export const adminStats = {
  pendingApprovals: 2,
  activeMembers: 48,
  eventsThisMonth: 9,
  chapters: 4,
};

export type JuntaMember = {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  role: string;
  area?: string;
  tier: "presidente" | "vp" | "director" | "voluntario";
};

export type ChapterJunta = {
  chapterId: string;
  name: string;
  university: string;
  region: string;
  members: number;
  volunteers: number;
  junta: JuntaMember[];
};

export const juntas: ChapterJunta[] = [
  {
    chapterId: "utec",
    name: "LEAD UTEC",
    university: "Universidad de Ingeniería y Tecnología",
    region: "Perú · Lima",
    members: 28,
    volunteers: 22,
    junta: [
      { id: "u1", name: "Luis Maquera", initials: "LM", avatarColor: "brand-purple", role: "Presidente", tier: "presidente" },
      { id: "u2", name: "Christian Estrada", initials: "CE", avatarColor: "brand-rose", role: "Vicepresidente", tier: "vp" },
      { id: "u3", name: "Diego Miranda", initials: "DM", avatarColor: "brand-orange", role: "Director", area: "Excelencia Académica", tier: "director" },
      { id: "u4", name: "Sofía Ríos", initials: "SR", avatarColor: "brand-red", role: "Directora", area: "Excelencia Femenina", tier: "director" },
    ],
  },
  {
    chapterId: "pucp",
    name: "LEAD PUCP",
    university: "Pontificia Universidad Católica del Perú",
    region: "Perú · Lima",
    members: 41,
    volunteers: 30,
    junta: [
      { id: "p1", name: "Xendra Jaime", initials: "XJ", avatarColor: "brand-rose", role: "Presidenta", tier: "presidente" },
      { id: "p2", name: "Caleb Montero", initials: "CM", avatarColor: "brand-purple", role: "Vicepresidente", tier: "vp" },
    ],
  },
  {
    chapterId: "utp",
    name: "LEAD UTP",
    university: "Universidad Tecnológica del Perú",
    region: "Perú · Lima",
    members: 22,
    volunteers: 16,
    junta: [
      { id: "t1", name: "Giuliana Sanchez", initials: "GS", avatarColor: "brand-orange", role: "Presidenta", tier: "presidente" },
      { id: "t2", name: "Matthew Zegarra", initials: "MZ", avatarColor: "brand-red", role: "Vicepresidente", tier: "vp" },
    ],
  },
  {
    chapterId: "uni",
    name: "LEAD UNI",
    university: "Universidad Nacional de Ingeniería",
    region: "Perú · Lima",
    members: 18,
    volunteers: 12,
    junta: [
      { id: "n1", name: "Arianna Yauri", initials: "AY", avatarColor: "brand-purple", role: "Presidenta", tier: "presidente" },
      { id: "n2", name: "Anthony Castañeda", initials: "AC", avatarColor: "brand-rose", role: "Vicepresidente", tier: "vp" },
    ],
  },
  {
    chapterId: "upc",
    name: "LEAD UPC",
    university: "Universidad Peruana de Ciencias Aplicadas",
    region: "Perú · Lima",
    members: 15,
    volunteers: 10,
    junta: [
      { id: "c1", name: "Alexandra Cuchula", initials: "AC", avatarColor: "brand-orange", role: "Presidenta", tier: "presidente" },
      { id: "c2", name: "Maribel Maza", initials: "MM", avatarColor: "brand-red", role: "Vicepresidenta", tier: "vp" },
    ],
  },
];

export const standardRoles = ["Presidente", "Vicepresidente"];

export type ProfileReview = {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  university: string;
  major: string;
  year: string;
  chapter: string;
  skills: string[];
  topSkills: string[];
  submitted: string;
  status: "pending" | "approved" | "rejected";
};

export const profileReviews: ProfileReview[] = [
  { id: "r1", name: "Valeria Mendoza", initials: "VM", avatarColor: "brand-purple", university: "UTEC", major: "Ingeniería de Software", year: "2028", chapter: "LEAD UTEC", skills: ["Python", "SQL", "Machine Learning", "Git"], topSkills: ["Python", "SQL"], submitted: "hoy", status: "pending" },
  { id: "r2", name: "Camila Torres", initials: "CT", avatarColor: "brand-rose", university: "UTEC", major: "Ingeniería de Sistemas", year: "2027", chapter: "LEAD UTEC", skills: ["JavaScript", "React", "TypeScript"], topSkills: ["React"], submitted: "hace 2 días", status: "pending" },
  { id: "r3", name: "Daniela Castro", initials: "DC", avatarColor: "brand-orange", university: "Universidad de Buenos Aires", major: "Computer Science", year: "2028", chapter: "", skills: ["Python", "C++", "Data Analysis"], topSkills: ["Python"], submitted: "hace 3 días", status: "pending" },
  { id: "r4", name: "Sofía Ramírez", initials: "SR", avatarColor: "brand-red", university: "UNI", major: "CS + Statistics", year: "2027", chapter: "LEAD UNI", skills: ["SQL", "Data Analysis", "R"], topSkills: ["SQL"], submitted: "hace 1 semana", status: "pending" },
  { id: "r5", name: "Ana Lucía Paredes", initials: "AP", avatarColor: "brand-purple", university: "Pontificia Universidad Javeriana", major: "Computer Science", year: "2027", chapter: "LEAD Javeriana", skills: ["Java", "AWS", "Docker"], topSkills: ["AWS"], submitted: "hace 3 días", status: "approved" },
  { id: "r6", name: "Diego Salas", initials: "DS", avatarColor: "brand-rose", university: "UTEC", major: "Ingeniería Mecatrónica", year: "2028", chapter: "LEAD UTEC", skills: ["C++", "Arduino"], topSkills: ["C++"], submitted: "hace 5 días", status: "rejected" },
];