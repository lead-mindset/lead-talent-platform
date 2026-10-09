"use client";

import { useState } from "react";
import { BadgeCheck, Briefcase, Check, ExternalLink, FileText, GraduationCap, Info, Languages, RotateCcw, ShieldCheck, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { FilterChip } from "@/components/ui/filter-chip";
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
import { InitialsAvatar } from "@/components/initials-avatar";
import { profileReviews, type ProfileReview } from "@/lib/data/admin";

type Status = ProfileReview["status"];

const matchesScope = (review: ProfileReview, scope: "chapter" | "global" | "no-chapter", chapter: string) =>
  scope === "no-chapter" ? review.chapter === "" : scope === "chapter" ? review.chapter === chapter : true;

export function ValidationQueue({ chapter = "", scope }: { chapter?: string; scope: "chapter" | "global" | "no-chapter" }) {
  const [reviews, setReviews] = useState<ProfileReview[]>(profileReviews.map((r) => ({ ...r })));
  const [tab, setTab] = useState<Status>("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { toast } = useToast();

  const selected = reviews.find((r) => r.id === selectedId) ?? null;

  const pendingCount = reviews.filter((r) => r.status === "pending" && matchesScope(r, scope, chapter)).length;
  const filtered = reviews.filter((r) => r.status === tab && matchesScope(r, scope, chapter));

  const setStatus = (id: string, status: Status) => {
    const previous = reviews.find((r) => r.id === id)?.status;
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    const title =
      status === "approved"
        ? "Visible para empresas"
        : status === "rejected"
        ? "Perfil oculto para empresas"
        : "Volvió a pendiente";
    toast({
      title,
      variant: status === "rejected" ? "destructive" : "success",
      action: previous
        ? {
            label: "Deshacer",
            onClick: () => setReviews((current) => current.map((r) => (r.id === id ? { ...r, status: previous } : r))),
          }
        : undefined,
    });
  };

  const subtitle =
    scope === "no-chapter"
      ? "Perfiles sin capítulo (fuera de América Latina). Los valida el equipo global de LEAD."
      : scope === "chapter"
      ? `Solo ves los perfiles de ${chapter}. Los de otros capítulos los revisa su propio e-board.`
      : "Todos los perfiles pendientes de validar, de cualquier capítulo.";

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-h1 font-bold tracking-tight">Validaciones</h1>
          <p className="mt-1 max-w-xl text-small text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-1.5 text-small text-muted-foreground">
          <span className="size-2 rounded-full bg-brand-purple-light" />
          {pendingCount} por validar
        </div>
      </header>

      <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/40 p-3 text-small text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-brand-purple-light" />
        <span>
          Aquí <strong>no</strong> decides quién pertenece a LEAD — todo el que se registra ya es parte. Esto solo
          controla qué perfiles son <strong>visibles para las empresas</strong>.
        </span>
      </div>

      <div className="flex gap-1.5">
        <FilterChip active={tab === "pending"} onClick={() => setTab("pending")}>Pendientes</FilterChip>
        <FilterChip active={tab === "approved"} onClick={() => setTab("approved")}>Aprobados</FilterChip>
        <FilterChip active={tab === "rejected"} onClick={() => setTab("rejected")}>Rechazados</FilterChip>
      </div>

      {filtered.length === 0 ? (
        <div className="card-surface rounded-xl border border-border/60 p-8 text-center text-small text-muted-foreground">
          No hay perfiles {tab === "pending" ? "por validar" : tab === "approved" ? "aprobados" : "rechazados"} aquí.
        </div>
      ) : (
        <div className="card-surface divide-y divide-border/60 rounded-xl border border-border/60">
          {filtered.map((review) => (
            <div key={review.id} className="flex flex-wrap items-start gap-4 px-4 py-4">
              <InitialsAvatar initials={review.initials} color={review.avatarColor} className="size-10 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{review.name}</p>
                  {review.chapter ? (
                    <StatusBadge tone="info">{review.chapter}</StatusBadge>
                  ) : (
                    <StatusBadge tone="muted">Sin capítulo</StatusBadge>
                  )}
                </div>
                <p className="mt-0.5 text-caption text-muted-foreground">
                  {review.university} · {review.major} · {review.year} · enviado {review.submitted}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {review.skills.map((skill) => (
                    <Chip key={skill} tone={review.topSkills.includes(skill) ? "brand" : "muted"}>
                      {review.topSkills.includes(skill) ? `★ ${skill}` : skill}
                    </Chip>
                  ))}
                </div>
                {review.status === "approved" && (
                  <p className="mt-2 flex items-center gap-1.5 text-caption font-medium text-success">
                    <BadgeCheck className="size-3.5" /> Visible para empresas
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap gap-1.5">
                <Button size="sm" variant="outline" onClick={() => setSelectedId(review.id)}>
                  Ver perfil
                </Button>
                {review.status === "pending" ? (
                  <>
                    <Button size="sm" className="gap-1" onClick={() => setStatus(review.id, "approved")}>
                      <Check className="size-3.5" /> Hacer visible
                    </Button>
                    <Button size="sm" variant="destructive-outline" onClick={() => setStatus(review.id, "rejected")}>
                      <X className="size-3.5" /> No visible
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => setStatus(review.id, "pending")}>
                    <RotateCcw className="size-3.5" /> Deshacer
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet open={selected !== null} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
        {selected ? (
          <SheetContent side="right" aria-describedby={undefined}>
            <SheetBody className="px-6 py-6">
              <div className="flex items-start gap-4">
                <InitialsAvatar initials={selected.initials} color={selected.avatarColor} className="size-14 shrink-0" />
                <div className="min-w-0 flex-1">
                  <SheetTitle className="text-h2">{selected.name}</SheetTitle>
                  <SheetDescription className="sr-only">Perfil de {selected.name}</SheetDescription>
                  <p className="mt-1 text-caption text-muted-foreground">
                    {selected.university} · {selected.major} · {selected.year}
                  </p>
                  <div className="mt-2">
                    {selected.chapter ? (
                      <StatusBadge tone="info">{selected.chapter}</StatusBadge>
                    ) : (
                      <StatusBadge tone="muted">Sin capítulo</StatusBadge>
                    )}
                  </div>
                </div>
              </div>

              {selected.about ? <p className="mt-5 text-body leading-7 text-foreground/90">{selected.about}</p> : null}

              <div className="mt-6">
                <h3 className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Skills</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selected.skills.map((skill) => (
                    <Chip key={skill} tone={selected.topSkills.includes(skill) ? "brand" : "muted"}>
                      {selected.topSkills.includes(skill) ? `★ ${skill}` : skill}
                    </Chip>
                  ))}
                </div>
              </div>

              {selected.experience?.length ? (
                <div className="mt-6">
                  <h3 className="flex items-center gap-2 text-caption font-semibold uppercase tracking-wide text-muted-foreground">
                    <Briefcase className="size-3.5 text-brand-purple-light" /> Experiencia
                  </h3>
                  <ul className="mt-2 space-y-2">
                    {selected.experience.map((item) => (
                      <li key={`${item.role}-${item.period}`} className="text-small">
                        <p className="font-medium text-foreground">{item.role}</p>
                        <p className="text-caption text-muted-foreground">{item.company} · {item.period}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {selected.education?.length ? (
                <div className="mt-6">
                  <h3 className="flex items-center gap-2 text-caption font-semibold uppercase tracking-wide text-muted-foreground">
                    <GraduationCap className="size-3.5 text-brand-purple-light" /> Formación
                  </h3>
                  <ul className="mt-2 space-y-2">
                    {selected.education.map((item) => (
                      <li key={`${item.school}-${item.period}`} className="text-small">
                        <p className="font-medium text-foreground">{item.degree}</p>
                        <p className="text-caption text-muted-foreground">{item.school} · {item.period}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {selected.languages?.length ? (
                <div className="mt-6">
                  <h3 className="flex items-center gap-2 text-caption font-semibold uppercase tracking-wide text-muted-foreground">
                    <Languages className="size-3.5 text-brand-purple-light" /> Idiomas
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selected.languages.map((language) => (
                      <Chip key={language.name} tone="muted">{language.name} · {language.level}</Chip>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-6 space-y-2 text-small">
                <div className="flex items-start gap-2 text-muted-foreground">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-purple-light" />
                  <span>{selected.workAuth ?? "Autorización por confirmar"}</span>
                </div>
                {selected.availability ? (
                  <p className="text-muted-foreground">{selected.availability}</p>
                ) : null}
                {selected.cv ? (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="size-4 text-brand-purple-light" />
                    {selected.cv.name}
                    {selected.cv.uploaded ? "" : " · (no adjunto)"}
                  </p>
                ) : null}
                {selected.shareWithCompanies ? (
                  <p className="text-muted-foreground">Autoriza compartir su perfil con empresas.</p>
                ) : null}
              </div>

              {selected.links?.length ? (
                <div className="mt-6 flex flex-wrap gap-2">
                  {selected.links.map((link) => (
                    <Button key={link.href} variant="outline" size="sm" asChild>
                      <a href={link.href} target="_blank" rel="noreferrer">
                        <ExternalLink className="size-3.5" /> {link.label}
                      </a>
                    </Button>
                  ))}
                </div>
              ) : null}
            </SheetBody>

            {selected.status === "pending" ? (
              <SheetFooter>
                <Button variant="destructive-outline" onClick={() => setStatus(selected.id, "rejected")}>
                  <X /> No visible
                </Button>
                <Button onClick={() => setStatus(selected.id, "approved")}>
                  <Check /> Hacer visible
                </Button>
              </SheetFooter>
            ) : (
              <SheetFooter>
                <Button variant="outline" onClick={() => setStatus(selected.id, "pending")}>
                  <RotateCcw /> Volver a pendiente
                </Button>
              </SheetFooter>
            )}
          </SheetContent>
        ) : null}
      </Sheet>
    </div>
  );
}
