import { auditLog } from "@/lib/data/audit";
import { InitialsAvatar } from "@/components/initials-avatar";

export default function AdminAuditoriaPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-h1 font-bold tracking-tight">Auditoría</h1>
        <p className="mt-1 max-w-xl text-small text-muted-foreground">
          Cada cambio de rol, permiso, invitación, validación y financiamiento. Visible para founders y el e-board oficial.
        </p>
      </header>
      <div className="card-surface divide-y divide-border/60 rounded-xl border border-border/60">
        {auditLog.map((entry) => (
          <div key={entry.id} className="flex flex-wrap items-center gap-4 px-4 py-3">
            <InitialsAvatar initials={entry.actor.split(" ").map((p) => p[0]).slice(0, 2).join("")} color="brand-purple" className="size-10 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-small">
                <span className="font-medium">{entry.actor}</span>{" "}
                <span className="text-muted-foreground">{entry.action.toLowerCase()}</span>{" "}
                <span className="font-medium">{entry.entity}</span>
              </p>
              <p className="truncate text-caption text-muted-foreground">{entry.actorRole} · {entry.detail}</p>
            </div>
            <span className="text-caption text-muted-foreground">{entry.at}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
