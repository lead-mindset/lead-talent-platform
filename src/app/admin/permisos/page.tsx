"use client";

import { useMemo, useState } from "react";
import { Lock } from "lucide-react";

import { InitialsAvatar } from "@/components/initials-avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SidebarOption } from "@/components/ui/sidebar-option";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { permissionCatalog, presets, userPreset } from "@/lib/data/permissions";
import { testUsers } from "@/lib/data/test-users";
import { useCurrentUser } from "@/lib/use-current-user";

const scopeLabel: Record<string, string> = {
  member: "Comunidad",
  chapter: "Capítulo",
  country: "País",
  global: "Global · LEAD Americas",
};

const scopeOrder = ["member", "chapter", "country", "global"] as const;
const scopeLevel: Record<string, number> = { member: 0, chapter: 1, country: 2, global: 3 };

export default function AdminPermisosPage() {
  const user = useCurrentUser();
  const adminLevel = scopeLevel[user.scopeType] ?? 0;

  const manageable = useMemo(() => {
    if (user.scopeType === "global") return testUsers.filter((item) => item.scopeType !== "company");
    if (user.scopeType === "country")
      return testUsers.filter((item) => item.scopeType === "chapter" || item.scopeType === "member");
    return testUsers.filter((item) => item.scope === user.scope && item.scopeType !== "company");
  }, [user]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected =
    manageable.find((item) => item.id === selectedId) ??
    manageable.find((item) => item.id !== user.id) ??
    user;

  const [presetByPerson, setPresetByPerson] = useState<Record<string, string>>({});
  const [grants, setGrants] = useState<Record<string, Set<string>>>({});
  const { toast } = useToast();

  const presetId = presetByPerson[selected.id] ?? userPreset[selected.id] ?? "member";
  const preset = presets.find((item) => item.id === presetId) ?? presets[presets.length - 1];

  // presets this admin is allowed to assign: their own scope and below
  const presetOptions = presets.filter((item) => scopeLevel[item.scope] <= adminLevel);

  const grantableScopes = scopeOrder.filter((scope) => scopeLevel[scope] <= adminLevel);
  const granted = grants[selected.id] ?? new Set(preset.permissions);
  const isSelf = selected.id === user.id;

  const changePreset = (id: string) => {
    if (isSelf) return;
    setPresetByPerson((prev) => ({ ...prev, [selected.id]: id }));
    setGrants((prev) => {
      const next = { ...prev };
      delete next[selected.id];
      return next;
    });
    const label = presets.find((presetOption) => presetOption.id === id)?.label ?? id;
    toast({ title: "Preset actualizado", description: `${selected.name} ahora es ${label}.`, variant: "success" });
  };

  const toggle = (key: string) => {
    if (isSelf) return;
    setGrants((prev) => {
      const next = new Set(prev[selected.id] ?? preset.permissions);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...prev, [selected.id]: next };
    });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-h1 font-bold tracking-tight">Permisos</h1>
        <p className="mt-1 max-w-2xl text-small text-muted-foreground">
          Elige a una persona, asígnale un <strong>preset</strong> y encima puedes <strong>añadir o quitar</strong>{" "}
          permisos puntuales, dentro de tu alcance ({scopeLabel[user.scopeType] ?? user.scope}).
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        <aside>
          <p className="mb-2 px-1 text-caption font-semibold uppercase tracking-wide text-muted-foreground">
            Personas
          </p>
          <div className="card-surface space-y-1 rounded-xl border border-border/60 p-2">
            {manageable.map((person) => {
              const personPresetId = presetByPerson[person.id] ?? userPreset[person.id] ?? "member";
              const personPreset = presets.find((item) => item.id === personPresetId);
              const active = person.id === selected.id;
              return (
                <SidebarOption key={person.id} active={active} onClick={() => setSelectedId(person.id)}>
                  <span className="flex min-w-0 items-center gap-2.5">
                    <InitialsAvatar initials={person.initials} color={person.avatarColor} className="size-7 shrink-0" />
                    <span className="min-w-0">
                      <span className="block truncate">
                        {person.name}
                        {person.id === user.id ? " (tú)" : ""}
                      </span>
                      <span className="block truncate text-caption font-normal text-muted-foreground">
                        {personPreset?.label ?? "Miembro"}
                      </span>
                    </span>
                  </span>
                </SidebarOption>
              );
            })}
          </div>
        </aside>

        <div className="space-y-4">
          <div className="card-surface flex flex-wrap items-end gap-4 rounded-xl border border-border/60 p-5">
            <InitialsAvatar initials={selected.initials} color={selected.avatarColor} className="size-12 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{selected.name}</p>
              <p className="text-caption text-muted-foreground">
                {selected.role} · {selected.scope}
              </p>
            </div>
            <div className="w-full sm:w-64">
              <p className="mb-1.5 text-caption font-medium text-muted-foreground">Preset</p>
              <Select value={preset.id} onValueChange={changePreset} disabled={isSelf}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {presetOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1.5 text-caption text-muted-foreground">
                Cambiar el preset reinicia los ajustes puntuales de esta persona.
              </p>
            </div>
          </div>

          {isSelf ? (
            <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/40 p-3 text-small text-muted-foreground">
              <Lock className="mt-0.5 size-4 shrink-0 text-brand-purple-light" />
              <span>
                No puedes cambiar tu propio preset ni tus permisos. Pídele a otra persona con{" "}
                <code className="rounded bg-muted px-1 text-caption">roles.assign</code> en este scope que los ajuste.
              </span>
            </div>
          ) : null}

          {grantableScopes.map((scope) => {
            const scopePerms = permissionCatalog.filter((perm) => perm.scope === scope);
            if (scopePerms.length === 0) return null;
            const domains = [...new Set(scopePerms.map((perm) => perm.domain))];
            return (
              <section key={scope} className="space-y-3">
                <p className="px-1 text-small font-semibold text-foreground">{scopeLabel[scope]}</p>
                {domains.map((domain) => (
                  <div key={domain} className="card-surface rounded-xl border border-border/60 p-5">
                    <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">{domain}</p>
                    <div className="mt-3 space-y-1">
                      {scopePerms
                        .filter((perm) => perm.domain === domain)
                        .map((perm) => {
                          const inPreset = preset.permissions.includes(perm.key);
                          const on = granted.has(perm.key);
                          const override = on !== inPreset;
                          return (
                            <label
                              key={perm.key}
                              className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-small has-disabled:opacity-60 hover:bg-muted/40"
                            >
                              <Checkbox
                                checked={on}
                                disabled={isSelf}
                                onCheckedChange={() => toggle(perm.key)}
                                aria-label={perm.label}
                              />
                              <span className="min-w-0 flex-1">
                                {perm.label}
                                <span className="ml-2 text-caption text-muted-foreground">{perm.key}</span>
                              </span>
                              {inPreset ? <StatusBadge tone="muted">preset</StatusBadge> : null}
                              {override ? (
                                <StatusBadge tone={on ? "success" : "destructive"}>
                                  {on ? "+ extra" : "− quitado"}
                                </StatusBadge>
                              ) : null}
                            </label>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </section>
            );
          })}

          <p className="text-caption text-muted-foreground">
            Cada cambio se registra en la auditoría. El preset es solo el punto de partida; los overrides son por persona.
          </p>
        </div>
      </div>
    </div>
  );
}
