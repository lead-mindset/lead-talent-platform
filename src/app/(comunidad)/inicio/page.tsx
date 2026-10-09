import { StatusBadge } from "@/components/ui/status-badge";
import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, IdCard, Users } from "lucide-react";
import { announcements } from "@/lib/data/announcements";
import { ProfileCard } from "@/components/profile-card";
import { ResourcesCard } from "@/components/resources-card";
import { SocialsCard } from "@/components/socials-card";
import { ChapterHomeCard } from "@/components/chapter-home-card";
import { posts, events } from "@/lib/data/community";
import { me } from "@/lib/data/people";
import { isUpcoming } from "@/lib/date";

const MY_COMMUNITY = ["LEAD UTEC", "LEAD América", "LEAD Global"];

const actions = [
  { href: "/eventos", icon: CalendarDays, title: "Próximos eventos", text: "Workshops, paneles y networking de tu capítulo y LEAD." },
  { href: "/perfil", icon: IdCard, title: "Mi perfil", text: "Tu perfil de talento, visible para empresas." },
  { href: "/personas", icon: Users, title: "Personas", text: "Conoce a la comunidad LEAD." },
  { href: "/recursos", icon: BookOpen, title: "Recursos", text: "Guías y conocimiento de la comunidad." },
];

export default function Home() {
  const myEvents = events
    .filter((event) => MY_COMMUNITY.includes(event.calendar) && isUpcoming(event.date))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
      <div className="flex flex-col gap-8 lg:flex-row">
        <main className="min-w-0 flex-1">
          <header className="mb-6">
            <h1 className="text-h1 font-bold tracking-tight">Hola, {me.name.split(" ")[0]}.</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-small text-muted-foreground">
              <StatusBadge tone="info">{me.chapter}</StatusBadge>
              <StatusBadge tone="success">Miembro oficial</StatusBadge>
              {me.classYear} · {me.school}
            </p>
            <p className="mt-2 text-small text-muted-foreground">
              Empoderando estudiantes de las Américas a través de educación, liderazgo y tecnología.
            </p>
          </header>

          <div className="space-y-6">
            <section>
              <h2 className="mb-3 text-h3 font-semibold">Empecemos</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {actions.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="card-surface group rounded-xl border border-border/60 p-4 transition-colors hover:border-brand-purple-light/30"
                  >
                    <action.icon className="size-5 text-brand-purple-light" />
                    <p className="mt-3 font-semibold">{action.title}</p>
                    <p className="mt-1 text-caption text-muted-foreground">{action.text}</p>
                    <ArrowRight className="mt-3 size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand-purple-light" />
                  </Link>
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-h3 font-semibold">Anuncios</h2>
              <div className="space-y-4">
                {announcements.filter((a) => a.published).map((a) => (
                  <article key={a.id} className="card-surface rounded-xl border border-border/60 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{a.title}</p>
                      <StatusBadge tone="info">Global</StatusBadge>
                    </div>
                    <p className="mt-1 text-small text-muted-foreground">{a.body}</p>
                    {a.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.image} alt="" className="mt-2 max-h-44 w-full rounded-lg object-cover" />
                    )}
                    {a.links.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {a.links.map((l, i) => (
                          <a key={i} href={l.url} className="inline-flex items-center gap-1 rounded-md bg-brand-purple/15 px-2.5 py-1 text-caption font-medium text-brand-purple-light hover:bg-brand-purple/25">
                            {l.label} →
                          </a>
                        ))}
                      </div>
                    )}
                    <p className="mt-1.5 text-caption text-muted-foreground">{a.author} · {a.at}</p>
                  </article>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-h3 font-semibold">Tus próximos eventos</h2>
                <Link href="/eventos" className="flex items-center gap-1 text-small font-medium text-brand-purple-light hover:underline">
                  Ver todos <ArrowRight className="size-3.5" />
                </Link>
              </div>
              <div className="card-surface divide-y divide-border/60 rounded-xl border border-border/60">
                {myEvents.map((event) => (
                  <Link
                    key={event.id}
                    href="/eventos"
                    className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-lg bg-muted">
                      <span className="text-caption font-bold tracking-wide text-brand-purple-light">{event.month}</span>
                      <span className="text-h2 font-bold leading-none">{event.day}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{event.title}</p>
                      <p className="truncate text-small text-muted-foreground">
                        {event.time} · {event.location} · {event.calendar}
                      </p>
                    </div>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </section>

            <ChapterHomeCard />

          </div>
        </main>

        <aside className="w-full space-y-5 lg:w-80 lg:shrink-0">
          <ProfileCard />
          <ResourcesCard />
          <SocialsCard />
        </aside>
      </div>
    </div>
  );
}