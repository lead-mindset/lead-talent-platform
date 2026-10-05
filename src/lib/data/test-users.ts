export type ScopeType = "global" | "country" | "chapter" | "member" | "company";

export type TestUser = {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  group: string;
  role: string;
  scope: string;
  scopeType: ScopeType;
  views: { label: string; href: string }[];
};

export const testUsers: TestUser[] = [
  {
    id: "luis", name: "Luis Coronel", initials: "LC", avatarColor: "brand-purple", group: "Founder", role: "CEO LEAD Americas", scope: "LEAD Americas", scopeType: "global",
    views: [{ label: "Board", href: "/board" }, { label: "Admin", href: "/admin" }, { label: "Miembro", href: "/inicio" }],
  },
  {
    id: "antonny", name: "Antonny Porlles", initials: "AP", avatarColor: "brand-rose", group: "Founder", role: "CEO LEAD Americas", scope: "LEAD Americas", scopeType: "global",
    views: [{ label: "Board", href: "/board" }, { label: "Admin", href: "/admin" }, { label: "Miembro", href: "/inicio" }],
  },
  {
    id: "nicole", name: "Nicole Jimenez", initials: "NJ", avatarColor: "brand-red", group: "E-board global", role: "VP of Operations", scope: "LEAD Americas", scopeType: "global",
    views: [{ label: "Admin", href: "/admin" }, { label: "Miembro", href: "/inicio" }],
  },
  {
    id: "kiara", name: "Kiara Aguirre", initials: "KA", avatarColor: "brand-purple", group: "E-board global", role: "Programs & Communication", scope: "LEAD Americas", scopeType: "global",
    views: [{ label: "Admin", href: "/admin" }, { label: "Miembro", href: "/inicio" }],
  },
  {
    id: "christopher", name: "Christopher Lozada", initials: "CL", avatarColor: "brand-orange", group: "Country Director", role: "Country Director", scope: "Perú", scopeType: "country",
    views: [{ label: "País", href: "/admin" }, { label: "Miembro", href: "/inicio" }],
  },
  {
    id: "maquera", name: "Luis Maquera", initials: "LM", avatarColor: "brand-purple", group: "Presidente", role: "Presidente", scope: "LEAD UTEC", scopeType: "chapter",
    views: [{ label: "Capítulo", href: "/admin" }, { label: "Miembro", href: "/inicio" }],
  },
  {
    id: "christian", name: "Christian Estrada", initials: "CE", avatarColor: "brand-rose", group: "VP / E-board", role: "Vicepresidente", scope: "LEAD UTEC", scopeType: "chapter",
    views: [{ label: "Capítulo", href: "/admin" }, { label: "Miembro", href: "/inicio" }],
  },
  {
    id: "member", name: "Valeria Mendoza", initials: "VM", avatarColor: "brand-purple", group: "Miembro", role: "Miembro · Tech Lead", scope: "LEAD UTEC", scopeType: "member",
    views: [{ label: "Miembro", href: "/inicio" }],
  },
  {
    id: "general", name: "Mateo Silva", initials: "MS", avatarColor: "brand-red", group: "General member", role: "Miembro (sin capítulo)", scope: "USA", scopeType: "member",
    views: [{ label: "Miembro", href: "/inicio" }],
  },
  {
    id: "recruiter", name: "Laura García", initials: "LG", avatarColor: "brand-rose", group: "Recruiter", role: "Talent Acquisition", scope: "TechBridge", scopeType: "company",
    views: [{ label: "Portal empresa", href: "/empresa" }],
  },
];