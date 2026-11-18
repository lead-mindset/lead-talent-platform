"use client";

import { useRef, useState } from "react";
import { ImagePlus, Link2, Megaphone, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Field } from "@/components/form";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { InitialsAvatar } from "@/components/initials-avatar";
import { useCurrentUser } from "@/lib/use-current-user";
import { announcements as seed, type Announcement, type AnnouncementLink } from "@/lib/data/announcements";

type Draft = {
  title: string;
  body: string;
  links: AnnouncementLink[];
  image: string;
  published: boolean;
};

const empty: Draft = { title: "", body: "", links: [], image: "", published: true };
const initials = (name: string) => name.split(" ").map((p) => p[0]).slice(0, 2).join("");

function LinkEditor({ links, onChange }: { links: AnnouncementLink[]; onChange: (l: AnnouncementLink[]) => void }) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const add = () => {
    if (!label.trim() || !url.trim()) return;
    onChange([...links, { label: label.trim(), url: url.trim() }]);
    setLabel(""); setUrl("");
  };
  return (
    <div className="space-y-2">
      {links.map((l, i) => (
        <div key={i} className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-1.5 text-small">
          <Link2 className="size-3.5 text-brand-purple-light" />
          <span className="font-medium">{l.label}</span>
          <span className="truncate text-caption text-muted-foreground">{l.url}</span>
          <button type="button" aria-label="Quitar link" onClick={() => onChange(links.filter((_, j) => j !== i))} className="ml-auto text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Texto del link" className="w-40" />
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="min-w-40 flex-1" />
        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={add}><Plus className="size-3.5" /> Link</Button>
      </div>
    </div>
  );
}

function ImagePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const file = (f?: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) { setError("Elige una imagen"); return; }
    if (f.size > 5 * 1024 * 1024) { setError("Máx 5 MB"); return; }
    setError(undefined); onChange(URL.createObjectURL(f));
  };
  return (
    <div className="space-y-2">
      <div
        role="button" tabIndex={0}
        onClick={() => ref.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") ref.current?.click(); }}
        className="relative flex h-28 w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-muted-foreground/40 text-muted-foreground transition-colors hover:border-brand-purple-light/60"
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Imagen del anuncio" className="size-full object-cover" />
            <button type="button" aria-label="Quitar imagen" onClick={(e) => { e.stopPropagation(); onChange(""); }} className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-background/90 text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>
          </>
        ) : (
          <span className="flex items-center gap-1.5 text-small"><ImagePlus className="size-4" /> Subir imagen</span>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => file(e.target.files?.[0])} />
      {error && <p className="text-caption text-destructive-light">{error}</p>}
    </div>
  );
}

function AnnouncementForm({
  draft, setDraft, onSave, onCancel, saveLabel,
}: { draft: Draft; setDraft: (d: Draft) => void; onSave: () => void; onCancel: () => void; saveLabel: string }) {
  const [error, setError] = useState<string>();
  const save = () => {
    if (!draft.title.trim() || !draft.body.trim()) { setError("Título y mensaje son obligatorios"); return; }
    setError(undefined); onSave();
  };
  return (
    <div className="mt-3 space-y-3" onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) save(); }}>
      <Field label="Título" htmlFor="an-title" required>
        <Input id="an-title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Título del anuncio" />
      </Field>
      <Field label="Mensaje" htmlFor="an-body" required error={error}>
        <Textarea id="an-body" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} placeholder="Escribe el anuncio…" className="min-h-20" />
      </Field>
      <div>
        <p className="text-small font-medium">Links</p>
        <LinkEditor links={draft.links} onChange={(links) => setDraft({ ...draft, links })} />
      </div>
      <div>
        <p className="text-small font-medium">Imagen <span className="font-normal text-muted-foreground">(opcional)</span></p>
        <ImagePicker value={draft.image} onChange={(image) => setDraft({ ...draft, image })} />
      </div>
      <label className="flex items-center gap-3 text-small">
        <Switch checked={draft.published} onCheckedChange={(v) => setDraft({ ...draft, published: v === true })} aria-label="Publicar" />
        {draft.published ? "Publicado (visible en la comunidad)" : "Borrador (no visible)"}
      </label>
      <div className="flex gap-2">
        <Button type="button" className="gap-1.5" onClick={save}>{saveLabel}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}

export default function AdminAnunciosPage() {
  const user = useCurrentUser();
  const [list, setList] = useState<Announcement[]>(seed);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(empty);
  const { toast } = useToast();

  const publish = () => {
    setList((prev) => [{ id: `an-${Date.now()}`, title: draft.title.trim(), body: draft.body.trim(), author: user.name, at: "ahora mismo", links: draft.links, image: draft.image || undefined, published: draft.published }, ...prev]);
    setDraft(empty); setCreating(false);
    toast({ title: draft.published ? "Anuncio publicado" : "Borrador guardado", variant: "success" });
  };

  const remove = (a: Announcement) => {
    const index = list.findIndex((x) => x.id === a.id);
    setList((prev) => prev.filter((x) => x.id !== a.id));
    toast({
      title: `Borraste “${a.title}”.`,
      action: { label: "Deshacer", onClick: () => setList((prev) => [...prev.slice(0, index), a, ...prev.slice(index)]) },
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-h1 font-bold tracking-tight">Anuncios</h1>
          <p className="mt-1 max-w-xl text-small text-muted-foreground">
            Comunicación a toda LEAD. Se ven en la comunidad. Requiere <code className="rounded bg-muted px-1 text-caption">global.announcements.manage</code>.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => { setCreating((v) => !v); setDraft(empty); }}>
          {creating ? <><X className="size-3.5" /> Cancelar</> : <><Megaphone className="size-3.5" /> Nuevo anuncio</>}
        </Button>
      </header>

      {creating && (
        <div className="card-surface rounded-xl border border-border/60 p-6">
          <p className="flex items-center gap-2 font-semibold"><Megaphone className="size-4 text-brand-purple-light" /> Nuevo anuncio</p>
          <AnnouncementForm draft={draft} setDraft={setDraft} onSave={publish} onCancel={() => setCreating(false)} saveLabel={draft.published ? "Publicar" : "Guardar borrador"} />
        </div>
      )}

      <div className="space-y-3">
        {list.map((a) => (
          <div key={a.id} className="card-surface rounded-xl border border-border/60 p-5">
            {editing === a.id ? (
              <AnnouncementForm
                draft={editDraft} setDraft={setEditDraft}
                onSave={() => { setList((prev) => prev.map((x) => (x.id === a.id ? { ...x, ...editDraft, links: editDraft.links, image: editDraft.image || undefined } : x))); setEditing(null); }}
                onCancel={() => setEditing(null)}
                saveLabel="Guardar cambios"
              />
            ) : (
              <div className="flex gap-4">
                <InitialsAvatar initials={initials(a.author)} color="brand-purple" className="size-10 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{a.title}</p>
                    {a.published ? <StatusBadge tone="success">Publicado</StatusBadge> : <StatusBadge tone="muted">Borrador</StatusBadge>}
                  </div>
                  <p className="mt-1 text-small text-muted-foreground">{a.body}</p>
                  {a.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.image} alt="" className="mt-2 max-h-40 w-full max-w-sm rounded-lg object-cover" />
                  )}
                  {a.links.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {a.links.map((l, i) => (
                        <Button key={i} asChild size="sm" variant="outline" className="gap-1.5">
                          <a href={l.url} target="_blank" rel="noopener noreferrer"><Link2 className="size-3.5" /> {l.label}</a>
                        </Button>
                      ))}
                    </div>
                  )}
                  <p className="mt-1.5 text-caption text-muted-foreground">{a.author} · {a.at}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <Button size="sm" variant="ghost" className="gap-1" onClick={() => { setEditing(a.id); setEditDraft({ title: a.title, body: a.body, links: a.links, image: a.image ?? "", published: a.published }); }}>
                    <Pencil className="size-3.5" /> Editar
                  </Button>
                  <Button size="sm" variant="destructive-ghost" className="gap-1" onClick={() => remove(a)}>
                    <Trash2 className="size-3.5" /> Borrar
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}