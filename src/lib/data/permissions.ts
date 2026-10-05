export type Scope = "global" | "country" | "chapter" | "member";

export type Permission = {
  key: string;
  label: string;
  scope: Scope;
  domain: string;
};

/** closed catalog — by action, grouped by domain + scope. */
export const permissionCatalog: Permission[] = [
  // member (base)
  { key: "members.view_directory", label: "Ver el directorio de personas", scope: "member", domain: "Comunidad" },
  { key: "profile.edit_own", label: "Editar su perfil", scope: "member", domain: "Comunidad" },
  { key: "events.rsvp", label: "Inscribirse a eventos", scope: "member", domain: "Comunidad" },

  // chapter
  { key: "chapter.dashboard.access", label: "Entrar al panel del capítulo", scope: "chapter", domain: "Panel" },
  { key: "chapter.members.view_approved", label: "Ver miembros aprobados", scope: "chapter", domain: "Miembros" },
  { key: "chapter.members.view_applicants", label: "Ver solicitudes", scope: "chapter", domain: "Miembros" },
  { key: "chapter.members.manage_applications", label: "Aprobar / rechazar solicitudes", scope: "chapter", domain: "Miembros" },
  { key: "chapter.members.revoke", label: "Revocar miembros", scope: "chapter", domain: "Miembros" },
  { key: "chapter.profiles.validate", label: "Validar perfiles", scope: "chapter", domain: "Perfiles" },
  { key: "chapter.roles.assign_eboard", label: "Asignar roles del e-board", scope: "chapter", domain: "Roles" },
  { key: "chapter.events.manage", label: "Gestionar eventos", scope: "chapter", domain: "Eventos" },
  { key: "chapter.funding.submit", label: "Solicitar financiamiento", scope: "chapter", domain: "Financiamiento" },
  { key: "chapter.metrics.view", label: "Ver métricas del capítulo", scope: "chapter", domain: "Métricas" },

  // country
  { key: "country.dashboard.access", label: "Entrar al panel del país", scope: "country", domain: "Panel" },
  { key: "country.chapters.view", label: "Ver los capítulos del país", scope: "country", domain: "Capítulos" },
  { key: "country.members.manage", label: "Gestionar miembros del país", scope: "country", domain: "Miembros" },
  { key: "country.events.manage", label: "Gestionar eventos del país", scope: "country", domain: "Eventos" },
  { key: "country.metrics.view", label: "Ver métricas del país", scope: "country", domain: "Métricas" },

  // global
  { key: "global.dashboard.access", label: "Entrar al panel global", scope: "global", domain: "Panel" },
  { key: "global.chapters.manage", label: "Crear / editar capítulos", scope: "global", domain: "Capítulos" },
  { key: "global.countries.manage", label: "Gestionar países", scope: "global", domain: "Capítulos" },
  { key: "global.funding.review", label: "Revisar / aprobar financiamiento", scope: "global", domain: "Financiamiento" },
  { key: "global.companies.manage", label: "Invitar / revocar empresas", scope: "global", domain: "Empresas" },
  { key: "global.roles.assign", label: "Asignar roles (cualquier scope)", scope: "global", domain: "Roles" },
  { key: "global.audit.view", label: "Ver la auditoría", scope: "global", domain: "Auditoría" },
  { key: "global.content.manage", label: "Gestionar contenido / recursos", scope: "global", domain: "Contenido" },
  { key: "global.metrics.view", label: "Ver métricas globales", scope: "global", domain: "Métricas" },
];

export type Preset = { id: string; label: string; scope: Scope; permissions: string[] };

export const presets: Preset[] = [
  {
    id: "presidente", label: "Presidente de capítulo", scope: "chapter",
    permissions: ["chapter.dashboard.access", "chapter.members.view_approved", "chapter.members.view_applicants", "chapter.members.manage_applications", "chapter.members.revoke", "chapter.profiles.validate", "chapter.roles.assign_eboard", "chapter.events.manage", "chapter.funding.submit", "chapter.metrics.view"],
  },
  {
    id: "vp", label: "Vicepresidente", scope: "chapter",
    permissions: ["chapter.dashboard.access", "chapter.members.view_approved", "chapter.members.view_applicants", "chapter.members.manage_applications", "chapter.profiles.validate", "chapter.events.manage", "chapter.funding.submit"],
  },
  {
    id: "eboard", label: "E-board", scope: "chapter",
    permissions: ["chapter.dashboard.access", "chapter.events.manage", "chapter.funding.submit"],
  },
  {
    id: "country_director", label: "Country Director", scope: "country",
    permissions: ["country.dashboard.access", "country.chapters.view", "country.members.manage", "country.events.manage", "country.metrics.view"],
  },
  {
    id: "global_eboard", label: "E-board LEAD Americas", scope: "global",
    permissions: ["global.dashboard.access", "global.chapters.manage", "global.countries.manage", "global.funding.review", "global.companies.manage", "global.audit.view", "global.metrics.view"],
  },
  {
    id: "global_ceo", label: "CEO LEAD Americas", scope: "global",
    permissions: ["global.dashboard.access", "global.chapters.manage", "global.countries.manage", "global.funding.review", "global.companies.manage", "global.roles.assign", "global.audit.view", "global.content.manage", "global.metrics.view"],
  },
  {
    id: "vp_operations", label: "VP of Operations", scope: "global",
    permissions: ["global.dashboard.access", "global.chapters.manage", "global.funding.review", "global.companies.manage", "global.audit.view", "global.metrics.view"],
  },
  {
    id: "member", label: "Miembro", scope: "member",
    permissions: ["members.view_directory", "profile.edit_own", "events.rsvp"],
  },
];

/** which preset each demo "ver como" user carries. */
export const userPreset: Record<string, string> = {
  luis: "global_ceo",
  antonny: "global_ceo",
  nicole: "vp_operations",
  christopher: "country_director",
  maquera: "presidente",
  christian: "vp",
  member: "member",
  general: "member",
  recruiter: "member",
};

/** demo person: Luis Maquera (Presidente · LEAD UTEC), preset + one override. */
export const demoPermissionUser = {
  name: "Luis Maquera",
  role: "Presidente",
  scopeLabel: "LEAD UTEC",
  presetId: "presidente",
  granted: [] as string[],
  extra: ["chapter.metrics.view"],
  removed: ["chapter.members.revoke"],
};
