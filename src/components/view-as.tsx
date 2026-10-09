"use client";
import { FilterChip } from "@/components/ui/filter-chip";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InitialsAvatar } from "@/components/initials-avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { testUsers } from "@/lib/data/test-users";
import { setViewAsUser, useCurrentUser } from "@/lib/use-current-user";

export function ViewAs() {
  const router = useRouter();
  const user = useCurrentUser();
  const [open, setOpen] = useState(false);

  const select = (id: string) => {
    setViewAsUser(id);
    const next = testUsers.find((item) => item.id === id);
    if (next && next.views.length > 0) router.push(next.views[0].href);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open ? (
        <div className="card-surface w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-border/60 p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-caption font-medium text-muted-foreground">
              <Eye className="size-3.5 text-brand-purple-light" /> Ver como
            </p>
            <Button variant="ghost" size="icon-xs" onClick={() => setOpen(false)} aria-label="Cerrar">
              <X className="size-3.5" />
            </Button>
          </div>

          <div className="mt-3 flex items-center gap-2.5">
            <InitialsAvatar initials={user.initials} color={user.avatarColor} className="size-10 shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-small font-semibold">{user.name}</p>
              <p className="truncate text-caption text-muted-foreground">{user.group} · {user.role}</p>
            </div>
          </div>

          <Select value={user.id} onValueChange={select}>
            <SelectTrigger className="mt-3 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {testUsers.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name} · {item.group}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="mt-3 border-t border-border/60 pt-3">
            <p className="text-caption font-medium text-muted-foreground">Sus vistas</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {user.views.map((view) => (
                <FilterChip key={view.href} active={false} onClick={() => router.push(view.href)}>
                  {view.label} <ArrowUpRight className="size-3 text-muted-foreground" />
                </FilterChip>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="max-w-[calc(100vw-2rem)] gap-1.5 shadow-lg" onClick={() => setOpen(true)}>
          <Eye className="size-3.5 text-brand-purple-light" />
          <span className="hidden sm:inline">Ver como: {user.name}</span>
          <span className="sm:hidden">Ver como</span>
        </Button>
      )}
    </div>
  );
}