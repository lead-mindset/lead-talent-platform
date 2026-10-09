"use client";

import Link from "next/link";
import { ArrowRight, Building2, Landmark, ShieldCheck, Users } from "lucide-react";

import { InitialsAvatar } from "@/components/initials-avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { boardInsights, boardTeam } from "@/lib/data/board";
import { adminStats, fundingRequests, juntas } from "@/lib/data/admin";
import { useAdminRole } from "@/lib/admin-role";

const fundingPending = fundingRequests.filter(
  (request) => request.status === "pending" || request.status === "review"
).length;

const decisions = [
  {
    href: "/admin/financiamiento",
    icon: Landmark,
    title: "Fondos por aprobar",
    value: fundingPending,
    action: "Revisar fondos",
  },
  {
    href: "/admin/validaciones",
    icon: ShieldCheck,
    title: "Perfiles por validar",
    value: adminStats.pendingApprovals,
    action: "Ver validaciones",
  },
  {
    href: "/admin/invitaciones",
    icon: Building2,
    title: "Acceso de empresas",
    action: "Gestionar empresas",
  },
];

export default function AdminJuntaPage() {
  const { role } = useAdminRole();

  if (role !== "global") {
    return (
      <div className="flex min-h-full flex-col items-center justify-center py-20 text-center">
        <p className="text-h2 font-bold tracking-tight">Solo para el board</p>
        <p className="mt-2 max-w-sm text-small text-muted-foreground">
          Esta vista es la de la junta / fundadores de LEAD Americas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-h1 font-bold tracking-tight">Junta</h1>
        <p className="mt-1 text-small text-muted-foreground">
          La salud de LEAD a nivel organización. Decide, no operes.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {boardInsights.map((insight) => (
          <div key={insight.title} className="card-surface rounded-xl border border-border/60 p-4">
            <p className="text-small font-medium text-muted-foreground">{insight.title}</p>
            <p className="mt-2 text-display font-bold leading-none">{insight.value}</p>
            <p className="mt-1 text-caption text-muted-foreground">{insight.note}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="mb-3 text-h3 font-semibold">Por decidir</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {decisions.map(({ href, icon: Icon, title, value, action }) => (
            <Link
              key={href}
              href={href}
              className="card-surface group rounded-xl border border-border/60 p-5 transition-colors hover:border-brand-purple-light/30"
            >
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-lg bg-brand-purple/15 text-brand-purple-light">
                  <Icon className="size-5" />
                </span>
                {value !== undefined ? (
                  <span className="text-display font-bold leading-none">{value}</span>
                ) : null}
              </div>
              <p className="mt-4 font-semibold">{title}</p>
              <p className="mt-2 flex items-center gap-1 text-small font-medium text-brand-purple-light">
                {action}
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
              </p>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-h3 font-semibold">
              <Users className="size-4 text-brand-purple-light" /> Capítulos
            </h2>
            <Link href="/admin/capitulos" className="flex items-center gap-1 text-small font-medium text-brand-purple-light hover:underline">
              Ver todos <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="card-surface divide-y divide-border/60 rounded-xl border border-border/60">
            {juntas.map((chapter) => {
              const president = chapter.junta.find((member) => member.tier === "presidente");
              return (
                <div key={chapter.chapterId} className="flex items-center gap-4 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{chapter.name}</p>
                    <p className="truncate text-caption text-muted-foreground">
                      {president ? `${president.role}: ${president.name}` : "Sin presidente"}
                    </p>
                  </div>
                  <span className="shrink-0 text-caption text-muted-foreground">{chapter.members} miembros</span>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-h3 font-semibold">
            <Landmark className="size-4 text-brand-purple-light" /> Equipo LEAD
          </h2>
          <div className="grid gap-3">
            {boardTeam.map((member) => (
              <div key={member.id} className="card-surface flex items-center gap-3 rounded-xl border border-border/60 p-3">
                <InitialsAvatar initials={member.initials} color={member.avatarColor} className="size-10 shrink-0 rounded-xl" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{member.name}</p>
                  <StatusBadge tone="info" className="mt-1">{member.role}</StatusBadge>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
