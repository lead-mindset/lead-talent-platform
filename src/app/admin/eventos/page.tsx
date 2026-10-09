"use client";

import { useState } from "react";
import { CalendarDays, Check, MapPin, Pencil, Plus, Video, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { StatusBadge } from "@/components/ui/status-badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
  events as seedEvents,
  getEventScope,
  type AttendanceMode,
  type LeadEvent,
  type RegistrationMode,
} from "@/lib/data/community";
import { useCurrentUser } from "@/lib/use-current-user";
import { formatMonthShortUpper } from "@/lib/date";

type Modality = "in_person" | "online" | "hybrid";
type EventType = LeadEvent["type"];
type Speaker = { name: string; role: string };

type Form = {
  title: string;
  type: EventType;
  modality: Modality;
  startAt: string;
  location: string;
  host: string;
  registrationMode: RegistrationMode;
  registrationUrl: string;
  attendanceMode: AttendanceMode;
  capacity: string;
  image: string;
  description: string;
  longDescription: string;
  agenda: string[];
  speakers: Speaker[];
  published: boolean;
};

const eventTypes: EventType[] = ["Workshop", "Panel", "Networking", "Charla"];

const makeEmptyForm = (): Form => ({
  title: "",
  type: "Workshop",
  modality: "in_person",
  startAt: "",
  location: "",
  host: "",
  registrationMode: "external",
  registrationUrl: "",
  attendanceMode: "manual",
  capacity: "",
  image: "",
  description: "",
  longDescription: "",
  agenda: [""],
  speakers: [],
  published: true,
});

function splitDate(dateTime: string) {
  if (!dateTime) return null;
  const [date, time = "00:00"] = dateTime.split("T");
  const [, month, day] = date.split("-").map(Number);
  if (!month || !day) return null;
  return { date, time, month: formatMonthShortUpper(month), day: String(day).padStart(2, "0") };
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="text-caption text-muted-foreground">{children}</p>;
}

export default function AdminEventosPage() {
  const user = useCurrentUser();
  const isGlobal = user.scopeType === "global";
  const hasChapter = user.scopeType === "chapter";
  const [scope, setScope] = useState<"global" | "chapter">(isGlobal && !hasChapter ? "global" : "chapter");
  const [list, setList] = useState<LeadEvent[]>(() =>
    hasChapter ? seedEvents.filter((event) => event.calendar === user.scope) : seedEvents
  );
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Form>(makeEmptyForm);
  const { toast } = useToast();

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const setAgenda = (index: number, value: string) =>
    setForm((prev) => ({ ...prev, agenda: prev.agenda.map((item, i) => (i === index ? value : item)) }));
  const addAgenda = () => setForm((prev) => ({ ...prev, agenda: [...prev.agenda, ""] }));
  const removeAgenda = (index: number) =>
    setForm((prev) => ({ ...prev, agenda: prev.agenda.filter((_, i) => i !== index) }));
  const setSpeaker = (index: number, key: keyof Speaker, value: string) =>
    setForm((prev) => ({
      ...prev,
      speakers: prev.speakers.map((speaker, i) => (i === index ? { ...speaker, [key]: value } : speaker)),
    }));
  const addSpeaker = () => setForm((prev) => ({ ...prev, speakers: [...prev.speakers, { name: "", role: "" }] }));
  const removeSpeaker = (index: number) =>
    setForm((prev) => ({ ...prev, speakers: prev.speakers.filter((_, i) => i !== index) }));

  const isExternal = form.registrationMode === "external";
  const canSubmit = Boolean(form.title.trim() && form.startAt && (!isExternal || form.registrationUrl.trim()));

  const create = () => {
    const dt = splitDate(form.startAt);
    if (!canSubmit || !dt) return;

    const calendar = isGlobal && scope === "global" ? "LEAD Global" : hasChapter ? user.scope : "LEAD Global";
    const agenda = form.agenda.map((item) => item.trim()).filter(Boolean);
    const speakers = form.speakers
      .map((speaker) => ({ name: speaker.name.trim(), role: speaker.role.trim() }))
      .filter((speaker) => speaker.name);

    const event: LeadEvent = {
      id: `new-${Date.now()}`,
      month: dt.month,
      day: dt.day,
      title: form.title.trim(),
      location: form.modality === "online" ? form.location.trim() || "Virtual · Zoom" : form.location.trim() || "Por confirmar",
      type: form.type,
      description: form.description.trim(),
      date: dt.date,
      time: dt.time,
      host: form.host.trim() || calendar,
      calendar,
      image: form.image.trim() || undefined,
      registrationMode: form.registrationMode,
      registrationUrl: isExternal ? form.registrationUrl.trim() || undefined : undefined,
      attendanceMode: form.attendanceMode,
      capacity: form.capacity ? Number(form.capacity) : undefined,
      longDescription: form.longDescription.trim() || undefined,
      agenda: agenda.length ? agenda : undefined,
      speakers: speakers.length ? speakers : undefined,
    };

    setList((prev) => [event, ...prev]);
    setForm(makeEmptyForm());
    setCreating(false);
    toast({
      title: "Evento creado",
      description: event.title,
      variant: "success",
      action: { label: "Deshacer", onClick: () => setList((prev) => prev.filter((item) => item.id !== event.id)) },
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h1 font-bold tracking-tight">Eventos</h1>
          <p className="mt-1 text-small text-muted-foreground">
            Crea y administra los eventos de {hasChapter ? user.scope : "LEAD"}.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setCreating((prev) => !prev)}>
          {creating ? (
            <>
              <X className="size-3.5" /> Cerrar
            </>
          ) : (
            <>
              <Plus className="size-3.5" /> Crear evento
            </>
          )}
        </Button>
      </header>

      {creating && (
        <div className="card-surface rounded-xl border border-border/60 p-5">
          <h2 className="text-h3 font-semibold">Nuevo evento</h2>
          <p className="mt-1 text-small text-muted-foreground">Completa lo básico y guarda. Puedes editarlo después.</p>

          <div className="mt-5 space-y-5">
            {/* Basics */}
            <div className="space-y-1.5">
              <Label htmlFor="ev-title">
                Nombre del evento <span className="text-destructive-light">*</span>
              </Label>
              <Input
                id="ev-title"
                value={form.title}
                onChange={(event) => set("title", event.target.value)}
                placeholder="Ej. Discover Day 2026"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Tipo de evento</Label>
              <Segmented
                value={form.type}
                onChange={(value) => set("type", value)}
                options={eventTypes.map((value) => ({ value, label: value }))}
                className="w-full flex-wrap"
              />
            </div>

            <div className="space-y-2">
              <Label>¿Cómo se realiza?</Label>
              <Segmented
                value={form.modality}
                onChange={(value) => set("modality", value)}
                options={[
                  { value: "in_person", label: "Presencial" },
                  { value: "online", label: "Online" },
                  { value: "hybrid", label: "Híbrido" },
                ]}
                className="w-full flex-wrap"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ev-start">
                  Fecha y hora <span className="text-destructive-light">*</span>
                </Label>
                <Input id="ev-start" type="datetime-local" value={form.startAt} onChange={(event) => set("startAt", event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-loc">{form.modality === "online" ? "Enlace o nota" : "Lugar"}</Label>
                <Input
                  id="ev-loc"
                  value={form.location}
                  onChange={(event) => set("location", event.target.value)}
                  placeholder={form.modality === "online" ? "Virtual · Zoom" : "Ej. UTEC · Lima"}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ev-host">Organiza</Label>
                <Input id="ev-host" value={form.host} onChange={(event) => set("host", event.target.value)} placeholder="Ej. LEAD UTEC · LEAD Academia" />
                <FieldHint>Déjalo vacío para usar el nombre del capítulo o de LEAD.</FieldHint>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-cap">Cupos</Label>
                <Input id="ev-cap" type="number" value={form.capacity} onChange={(event) => set("capacity", event.target.value)} placeholder="Ej. 60" />
                <FieldHint>Cuántas personas pueden registrarse.</FieldHint>
              </div>
            </div>

            {/* Registration */}
            <div className="space-y-2">
              <Label>Inscripción</Label>
              <Segmented
                value={form.registrationMode}
                onChange={(value) => set("registrationMode", value)}
                options={[
                  { value: "external", label: "Link externo" },
                  { value: "platform", label: "Registro en la plataforma" },
                ]}
                className="w-full flex-wrap"
              />
              {isExternal ? (
                <div className="space-y-1.5">
                  <Input
                    type="url"
                    value={form.registrationUrl}
                    onChange={(event) => set("registrationUrl", event.target.value)}
                    placeholder="https://forms.gle/…"
                  />
                  <FieldHint>Pega el link donde la gente se inscribe (tu formulario, Luma, Eventbrite…).</FieldHint>
                </div>
              ) : (
                <FieldHint>Los participantes se inscriben aquí mismo con un clic.</FieldHint>
              )}
            </div>

            {/* Attendance */}
            <div className="space-y-2">
              <Label>Asistencia</Label>
              <Segmented
                value={form.attendanceMode}
                onChange={(value) => set("attendanceMode", value)}
                options={[
                  { value: "qr", label: "QR en la puerta" },
                  { value: "link", label: "Link (virtual)" },
                  { value: "manual", label: "Conteo manual" },
                ]}
                className="w-full flex-wrap"
              />
              <FieldHint>Así se registra quién asistió de verdad.</FieldHint>
            </div>

            {/* Cover + description */}
            <div className="space-y-1.5">
              <Label htmlFor="ev-image">Imagen de portada (opcional)</Label>
              <Input id="ev-image" value={form.image} onChange={(event) => set("image", event.target.value)} placeholder="/media/events/discover-day-workshop.webp" />
              <FieldHint>Pega la dirección de una imagen o una ruta como la del ejemplo.</FieldHint>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ev-desc">Descripción corta</Label>
              <Textarea id="ev-desc" rows={2} value={form.description} onChange={(event) => set("description", event.target.value)} placeholder="Una o dos frases sobre el evento." />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ev-long">Descripción completa (opcional)</Label>
              <Textarea id="ev-long" rows={3} value={form.longDescription} onChange={(event) => set("longDescription", event.target.value)} placeholder="El detalle que se ve al abrir el evento." />
            </div>

            {/* Agenda — dynamic list */}
            <div className="space-y-3">
              <div>
                <Label>Qué incluye</Label>
                <FieldHint>Agrega los puntos del evento, uno por uno.</FieldHint>
              </div>
              <div className="space-y-2">
                {form.agenda.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input value={item} onChange={(event) => setAgenda(index, event.target.value)} placeholder={`Punto ${index + 1} (ej. Bienvenida y formación de grupos)`} />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Quitar punto"
                      onClick={() => removeAgenda(index)}
                      disabled={form.agenda.length === 1 && !item}
                    >
                      <X />
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addAgenda}>
                <Plus className="size-3.5" /> Agregar punto
              </Button>
            </div>

            {/* Speakers — dynamic list */}
            <div className="space-y-3">
              <div>
                <Label>Quiénes participan (opcional)</Label>
                <FieldHint>Agrega personas y su rol o empresa.</FieldHint>
              </div>
              <div className="space-y-2">
                {form.speakers.map((speaker, index) => (
                  <div key={index} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input value={speaker.name} onChange={(event) => setSpeaker(index, "name", event.target.value)} placeholder="Nombre" />
                    <Input value={speaker.role} onChange={(event) => setSpeaker(index, "role", event.target.value)} placeholder="Rol o empresa (ej. Ingeniera, Google)" />
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Quitar persona" onClick={() => removeSpeaker(index)} className="shrink-0 self-end sm:self-auto">
                      <X />
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addSpeaker}>
                <Plus className="size-3.5" /> Agregar persona
              </Button>
            </div>

            {/* Scope + publish */}
            {isGlobal && (
              <div className="space-y-2">
                <Label>¿Para quién es?</Label>
                {hasChapter ? (
                  <Segmented
                    value={scope}
                    onChange={(value) => setScope(value)}
                    options={[
                      { value: "global", label: "Toda LEAD" },
                      { value: "chapter", label: "Solo mi capítulo" },
                    ]}
                    className="w-full flex-wrap"
                  />
                ) : (
                  <FieldHint>Global · toda LEAD (no perteneces a un capítulo).</FieldHint>
                )}
              </div>
            )}

            <label className="flex items-center gap-2 text-small">
              <Switch checked={form.published} onCheckedChange={(checked) => set("published", checked === true)} />
              Publicar de inmediato
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 border-t border-border/60 pt-4">
            <Button size="sm" className="gap-1.5" onClick={create} disabled={!canSubmit}>
              <Check className="size-3.5" /> Guardar evento
            </Button>
            <Button size="sm" variant="secondary" onClick={() => { setForm(makeEmptyForm()); setCreating(false); }}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <div className="card-surface max-h-128 divide-y divide-border/60 overflow-y-auto rounded-xl border border-border/60">
        {list.length === 0 ? (
          <div className="px-4 py-10 text-center text-small text-muted-foreground">
            <CalendarDays className="mx-auto mb-2 size-6 text-muted-foreground" />
            Todavía no hay eventos. Crea el primero.
          </div>
        ) : (
          list.map((event) => {
            const global = getEventScope(event) === "global";
            return (
              <div key={event.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <span className="flex size-11 shrink-0 flex-col items-center justify-center rounded-lg bg-muted text-caption font-bold leading-none text-brand-purple-light">
                  <span>{event.month}</span>
                  <span className="text-small text-foreground">{event.day}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{event.title}</p>
                  <p className="flex items-center gap-1 truncate text-caption text-muted-foreground">
                    {event.location.toLowerCase().includes("virtual") ? <Video className="size-3" /> : <MapPin className="size-3" />}
                    {event.time} · {event.location}
                  </p>
                </div>
                {global ? <StatusBadge tone="success">Global</StatusBadge> : <Badge variant="outline" className="rounded-full">{event.calendar}</Badge>}
                <Badge variant="secondary" className="rounded-full">{event.type}</Badge>
                <Button size="sm" variant="ghost" aria-label={`Editar ${event.title}`}>
                  <Pencil className="size-3.5" />
                </Button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
