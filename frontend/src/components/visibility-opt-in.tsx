"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { Switch } from "@/components/ui/switch";

/** Per-profile opt-in: authorize sharing the profile with companies (recruiters). */
export function VisibilityOptIn({ defaultOn = true }: { defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <label className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-small">
      <Eye className="size-4 shrink-0 text-brand-purple-light" />
      <span className="min-w-0 flex-1">
        <span className="font-medium">Compartir mi perfil con empresas</span>
        <span className="mt-0.5 block text-caption text-muted-foreground">
          {on ? "Tu perfil completo es visible para recruiters con acceso." : "Solo se ve la info pública para miembros."}
        </span>
      </span>
      <Switch checked={on} onCheckedChange={setOn} aria-label="Compartir mi perfil con empresas" />
    </label>
  );
}
