export type AuditEntry = {
  id: string;
  actor: string;
  actorRole: string;
  action: string;
  entity: string;
  detail: string;
  at: string;
};

export const auditLog: AuditEntry[] = [
  { id: "a1", actor: "Luis Maquera", actorRole: "Presidente · LEAD UTEC", action: "Asignó rol", entity: "Christian Estrada", detail: "Vicepresidente (preset) · LEAD UTEC", at: "hoy, 9:12am" },
  { id: "a2", actor: "Christopher Lozada", actorRole: "Country Director · Perú", action: "Aprobó miembro", entity: "Valeria Mendoza", detail: "se unió a LEAD UTEC", at: "hoy, 8:40am" },
  { id: "a3", actor: "Nicole Jimenez", actorRole: "VP Ops · LEAD Americas", action: "Invitó empresa", entity: "TechBridge Solutions", detail: "acceso 6 meses", at: "ayer, 4:05pm" },
  { id: "a4", actor: "Luis Coronel", actorRole: "CEO LEAD Americas", action: "Aprobó financiamiento", entity: "Discover Day 2027", detail: "$320 · LEAD UTEC", at: "ayer, 11:20am" },
  { id: "a5", actor: "Luis Maquera", actorRole: "Presidente · LEAD UTEC", action: "Validó perfil", entity: "Camila Torres", detail: "visible para empresas", at: "hace 2 días" },
  { id: "a6", actor: "Antonny Porlles", actorRole: "CEO LEAD Americas", action: "Creó capítulo", entity: "LEAD Javeriana", detail: "Colombia", at: "hace 3 días" },
];
