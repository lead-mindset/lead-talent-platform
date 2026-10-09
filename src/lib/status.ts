export type StatusTone = "info" | "success" | "muted" | "destructive";

export type StatusMeta = { label: string; tone: StatusTone };

export const FUNDING_STATUS: Record<string, StatusMeta> = {
  submitted: { label: "Enviado", tone: "info" },
  approved: { label: "Aprobado", tone: "success" },
  changes_requested: { label: "Cambios pedidos", tone: "muted" },
  rejected: { label: "Rechazado", tone: "destructive" },
  receipts_due: { label: "Recibos pendientes", tone: "info" },
};

export const MEMBERSHIP_STATUS: Record<string, StatusMeta> = {
  active: { label: "Activo", tone: "success" },
  pending: { label: "Pendiente", tone: "info" },
  rejected: { label: "Rechazado", tone: "destructive" },
};

export const INVITE_STATUS: Record<string, StatusMeta> = {
  pending: { label: "Pendiente", tone: "info" },
  accepted: { label: "Aceptada", tone: "success" },
  revoked: { label: "Revocada", tone: "muted" },
};
