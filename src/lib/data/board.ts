export type BoardMember = {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  role: string;
  email: string;
};

export const boardTeam: BoardMember[] = [
  { id: "b1", name: "Luis Coronel", initials: "LC", avatarColor: "brand-purple", role: "CEO LEAD Americas", email: "luis.coronel@leadmindset.org" },
  { id: "b2", name: "Antonny Porlles", initials: "AP", avatarColor: "brand-rose", role: "CEO LEAD Americas", email: "aporlles@leadmindset.org" },
  { id: "b3", name: "Nicole Jimenez", initials: "NJ", avatarColor: "brand-red", role: "VP of Operations", email: "operations@leadmindset.org" },
  { id: "b4", name: "Oscar Castro", initials: "OC", avatarColor: "brand-orange", role: "Chief of Staff", email: "ocastro@leadmindset.org" },
  { id: "b5", name: "Christopher Lozada", initials: "CL", avatarColor: "brand-purple", role: "Country Director · Perú", email: "clozada@leadmindset.org" },
];

export const boardKpis = {
  members: 48,
  chapters: 4,
  eventsThisMonth: 9,
  fundingPending: 2,
  pendingInvites: 3,
  growthMembers: "+12%",
};

export const boardInsights = [
  { title: "Crecimiento de miembros", value: "+12%", note: "vs. mes anterior" },
  { title: "Capítulos activos", value: "6", note: "Perú, México y Colombia" },
  { title: "Eventos este mes", value: "9", note: "workshops, paneles y networking" },
  { title: "Talento visible para empresas", value: "6", note: "perfiles completos y verificados" },
];