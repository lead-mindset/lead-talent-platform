"use client";

import { useState } from "react";
import { Megaphone, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/form";
import { StatusBadge } from "@/components/ui/status-badge";
import { InitialsAvatar } from "@/components/initials-avatar";
import { useCurrentUser } from "@/lib/use-current-user";
import { announcements as seed, type Announcement } from "@/lib/data/announcements";

export default function AdminAnunciosPage() {
  const user = useCurrentUser();
  const [list, setList] = useState<Announcement[]>(seed);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string>();

  const publish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError("Título y mensaje son obligatorios");
      return;
    }
    setError(undefined);
    setList((prev) => [{ id: `an-${Date.now()}`, title: title.trim(), body: body.trim(), author: user.name, at: "ahora mismo" }, ...prev]);
    setTitle("");
    setBody("");
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-h1 font-bold tracking-tight">Anuncios</h1>
        <p className="mt-1 max-w-xl text-small text-muted-foreground">
          Comunicación a toda LEAD. Requiere el permiso <code className="rounded bg-muted px-1 text-caption">global.announcements.manage</code> (Programs &amp; Communication o Marketing).
        </p>
      </header>

      <div className="card-surface rounded-xl border border-border/60 p-6">
        <p className="flex items-center gap-2 font-semibold"><Megaphone className="size-4 text-brand-purple-light" /> Nuevo anuncio</p>
        <form onSubmit={publish} className="mt-4 space-y-3" noValidate>
          <Field label="Título" htmlFor="an-title" required>
            <Input id="an-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nuevos eventos globales" />
          </Field>
          <Field label="Mensaje" htmlFor="an-body" required error={error}>
            <Textarea id="an-body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escribe el anuncio…" className="min-h-20" />
          </Field>
          <Button type="submit" className="w-full gap-1.5"><Plus className="size-3.5" /> Publicar anuncio</Button>
        </form>
      </div>

      <div className="card-surface divide-y divide-border/60 rounded-xl border border-border/60">
        {list.map((a) => (
          <div key={a.id} className="flex gap-4 px-4 py-4">
            <InitialsAvatar initials={a.author.split(" ").map((p) => p[0]).slice(0, 2).join("")} color="brand-purple" className="size-10 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{a.title}</p>
                <StatusBadge tone="info">Global</StatusBadge>
              </div>
              <p className="mt-1 text-small text-muted-foreground">{a.body}</p>
              <p className="mt-1.5 text-caption text-muted-foreground">{a.author} · {a.at}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
