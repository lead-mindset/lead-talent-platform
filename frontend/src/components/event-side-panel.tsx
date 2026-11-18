"use client";

import {
  CalendarPlus,
  Check,
  Clock,
  ExternalLink,
  Globe,
  Handshake,
  Link2,
  MapPin,
  Mic,
  QrCode,
  Share2,
  Users,
  Wrench,
} from "lucide-react";
import type { ComponentType } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetTitle,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { formatFullDate } from "@/lib/date";
import {
  getAttendanceMode,
  getEventScope,
  getRegistrationMode,
  type LeadEvent,
} from "@/lib/data/community";

const typeIcon: Record<LeadEvent["type"], ComponentType<{ className?: string }>> = {
  Workshop: Wrench,
  Panel: Users,
  Networking: Handshake,
  Charla: Mic,
};

function icsHref(event: LeadEvent) {
  const [h, min] = event.time.split(":").map(Number);
  const stamp = (hour: number) =>
    `${event.date.replaceAll("-", "")}T${String(hour).padStart(2, "0")}${String(min).padStart(2, "0")}00`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    `UID:${event.id}@leadmindset.org`,
    `DTSTART:${stamp(h)}`,
    `DTEND:${stamp((h + 1) % 24)}`,
    `SUMMARY:${event.title}`,
    `LOCATION:${event.location}`,
    `DESCRIPTION:${event.description}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join("\r\n"))}`;
}

const attendanceNote: Record<ReturnType<typeof getAttendanceMode>, string | null> = {
  qr: "Check-in con código QR en la puerta el día del evento.",
  link: "Te enviamos el link para conectarte cuando se acerque la fecha.",
  manual: "La asistencia la registra el capítulo después del evento.",
  none: null,
};

export function EventSidePanel({
  event,
  open,
  onOpenChange,
  registered,
  onToggleRegister,
}: {
  event: LeadEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registered: boolean;
  onToggleRegister: (event: LeadEvent) => void;
}) {
  const { toast } = useToast();
  if (!event) return null;

  const scope = getEventScope(event);
  const registrationMode = getRegistrationMode(event);
  const attendanceMode = getAttendanceMode(event);
  const Icon = typeIcon[event.type];
  const note = attendanceNote[attendanceMode];

  async function share() {
    const url = typeof window === "undefined" ? "" : window.location.href;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: event?.title, text: event?.description, url });
        return;
      }
      await navigator.clipboard?.writeText(url);
      toast({ title: "Enlace copiado", variant: "success" });
    } catch {
      // user cancelled or clipboard blocked; nothing to do
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" aria-describedby={undefined}>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={share}
          aria-label="Compartir"
          className="absolute top-3 left-3 z-10 bg-background/70 backdrop-blur-sm hover:bg-background/90"
        >
          <Share2 />
        </Button>

        {event.image ? (
          <img
            src={event.image}
            alt={`${event.title}, evento de la comunidad LEAD`}
            className="aspect-banner w-full shrink-0 object-cover"
          />
        ) : (
          <div className="flex aspect-banner w-full shrink-0 items-center justify-center bg-brand-purple/15">
            <Icon className="size-10 text-brand-purple-light" />
          </div>
        )}

        <SheetBody className="px-6 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full">
              {event.type}
            </Badge>
            {scope === "global" ? (
              <StatusBadge tone="success">Global · toda LEAD</StatusBadge>
            ) : (
              <Badge variant="outline" className="rounded-full">
                <MapPin /> {event.calendar}
              </Badge>
            )}
          </div>

          <SheetTitle className="mt-3 text-h2">{event.title}</SheetTitle>
          <SheetDescription className="sr-only">{event.description}</SheetDescription>

          <dl className="mt-4 space-y-2 text-small text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-brand-purple-light" />
              <span className="font-medium text-foreground">{formatFullDate(event.date)}</span>
              <span>· {event.time}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-brand-purple-light" />
              <span>{event.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="size-4 text-brand-purple-light" />
              <span>{event.host}</span>
            </div>
            {event.capacity ? (
              <div className="flex items-center gap-2">
                <Globe className="size-4 text-brand-purple-light" />
                <span>{event.capacity} cupos</span>
              </div>
            ) : null}
          </dl>

          <p className="mt-5 text-body leading-7 text-foreground/90">
            {event.longDescription ?? event.description}
          </p>

          {event.agenda && event.agenda.length > 0 ? (
            <div className="mt-6">
              <h3 className="text-small font-semibold uppercase tracking-wide text-muted-foreground">
                Qué incluye
              </h3>
              <ul className="mt-3 space-y-2">
                {event.agenda.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-small text-foreground/90">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand-purple-light" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {event.speakers && event.speakers.length > 0 ? (
            <div className="mt-6">
              <h3 className="text-small font-semibold uppercase tracking-wide text-muted-foreground">
                Quiénes participan
              </h3>
              <ul className="mt-3 space-y-3">
                {event.speakers.map((speaker) => (
                  <li key={speaker.name} className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-full bg-brand-purple/15 text-small font-semibold text-brand-purple-light">
                      {speaker.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}
                    </span>
                    <div>
                      <p className="text-small font-medium text-foreground">{speaker.name}</p>
                      <p className="text-caption text-muted-foreground">{speaker.role}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {note ? (
            <div className="mt-6 flex items-start gap-2 rounded-lg border border-border/60 bg-muted/40 p-3 text-small text-muted-foreground">
              {attendanceMode === "qr" ? (
                <QrCode className="mt-0.5 size-4 shrink-0 text-brand-purple-light" />
              ) : (
                <Link2 className="mt-0.5 size-4 shrink-0 text-brand-purple-light" />
              )}
              <span>
                {note}
                {registrationMode === "external"
                  ? " La inscripción la maneja el capítulo en su propio formulario."
                  : ""}
              </span>
            </div>
          ) : null}
        </SheetBody>

        <SheetFooter>
          <Button variant="outline" asChild>
            <a href={icsHref(event)} download={`${event.id}.ics`} onClick={() => toast({ title: "Añadido a tu calendario", variant: "success" })}>
              <CalendarPlus /> Añadir al calendario
            </a>
          </Button>
          {registrationMode === "external" && event.registrationUrl ? (
            <Button asChild>
              <a href={event.registrationUrl} target="_blank" rel="noreferrer">
                <ExternalLink /> Registrarme en su sitio
              </a>
            </Button>
          ) : (
            <Button
              variant={registered ? "secondary" : "default"}
              aria-pressed={registered}
              onClick={() => onToggleRegister(event)}
            >
              {registered ? (
                <>
                  <Check /> Registrado
                </>
              ) : (
                "Registrarme"
              )}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
