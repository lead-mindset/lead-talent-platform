"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { InitialsAvatar } from "@/components/initials-avatar";
import { useCurrentUser } from "@/lib/use-current-user";
import { permissionCatalog, presets, userPreset } from "@/lib/data/permissions";

const scopeLabel: Record<string, string> = {
  global: "global · LEAD Americas",
  country: "país",
  chapter: "capítulo",
  member: "comunidad",
};

export default function AdminPermisosPage() {
  const user = useCurrentUser();
  const presetId = userPreset[user.id] ?? "member";
  const preset = presets.find((p) => p.id === presetId) ?? presets[presets.length - 1];
  const perms = permissionCatalog.filter((p) => p.scope === preset.scope);
  const domains = [...new Set(perms.map((p) => p.domain))];

  const [granted, setGranted] = useState<Set<string>>(new Set(preset.permissions));
  useEffect(() => {
    setGranted(new Set(preset.permissions));
  }, [presetId, preset.permissions]);

  const toggle = (key: string) =>
    setGranted((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-h1 font-bold tracking-tight">Permisos</h1>
        <p className="mt-1 max-w-xl text-small text-muted-foreground">
          Permisos scoped por persona. Se asigna un <strong>preset</strong> y encima se puede añadir o quitar permisos puntuales.
        </p>
      </header>

      <div className="card-surface flex flex-wrap items-center gap-4 rounded-xl border border-border/60 p-5">
        <InitialsAvatar initials={user.initials} color={user.avatarColor} className="size-12 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{user.name}</p>
          <p className="text-caption text-muted-foreground">{user.role} · {user.scope}</p>
        </div>
        <StatusBadge tone="info"><ShieldCheck className="size-3.5" /> Preset: {preset.label}</StatusBadge>
        <StatusBadge tone="muted">{scopeLabel[preset.scope]}</StatusBadge>
      </div>

      {domains.map((domain) => (
        <div key={domain} className="card-surface rounded-xl border border-border/60 p-5">
          <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">{domain}</p>
          <div className="mt-3 space-y-2">
            {perms.filter((p) => p.domain === domain).map((perm) => {
              const inPreset = preset.permissions.includes(perm.key);
              const on = granted.has(perm.key);
              const override = on !== inPreset;
              return (
                <label key={perm.key} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-small hover:bg-muted/40">
                  <input type="checkbox" checked={on} onChange={() => toggle(perm.key)} className="size-4 accent-[var(--brand-purple)]" />
                  <span className="min-w-0 flex-1">
                    {perm.label}
                    <span className="ml-2 text-caption text-muted-foreground">{perm.key}</span>
                  </span>
                  {inPreset && <StatusBadge tone="muted">preset</StatusBadge>}
                  {override && <StatusBadge tone={on ? "success" : "destructive"}>{on ? "+ extra" : "− quitado"}</StatusBadge>}
                </label>
              );
            })}
          </div>
        </div>
      ))}

      <p className="text-caption text-muted-foreground">
        cada cambio se registra en la auditoría. el preset es solo el punto de partida; los overrides son por persona.
      </p>
    </div>
  );
}