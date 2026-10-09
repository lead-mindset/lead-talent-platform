import { BadgeCheck, ShieldAlert, ShieldCheck } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";

export function ProfileStatusBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  if (status === "approved") {
    return (
      <StatusBadge tone="success"><BadgeCheck className="size-4" /> Visible para empresas</StatusBadge>
    );
  }
  if (status === "rejected") {
    return (
      <StatusBadge tone="destructive"><ShieldAlert className="size-4" /> No visible para empresas · revisa tu perfil</StatusBadge>
    );
  }
  return (
    <StatusBadge tone="info"><ShieldCheck className="size-4" /> En revisión · aún no visible para empresas</StatusBadge>
  );
}
