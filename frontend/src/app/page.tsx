import { Chip } from "@/components/ui/chip";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarDays, Check, UserPlus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InitialsAvatar } from "@/components/initials-avatar";
import { BrandMark } from "@/components/brand-mark";
import { AsciiText } from "@/components/ascii-text";
import { LogoMarquee } from "@/components/ui/logo-marquee";
import { people } from "@/lib/data/people";
import { talent } from "@/lib/data/talent";
import { PARTNER_LOGOS } from "@/lib/data/partners";

const featuredPeople = people.slice(0, 3);
const preview = talent[0];

export default function LandingPage() {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6">
      <header className="flex h-16 items-center gap-6">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark className="h-6" />
          <span className="text-h3 font-bold tracking-tight">LEAD</span>
        </Link>
        <nav className="ml-auto flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-md px-3 py-1.5 text-small font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-block"
          >
            Iniciar sesión
          </Link>
          <Button asChild size="sm">
            <Link href="/sign-up">Crear mi perfil</Link>
          </Button>
        </nav>
      </header>

      <section className="grid items-center gap-12 py-20 lg:grid-cols-2 lg:py-28">
        <div>
          <p className="text-small font-medium text-brand-purple-light">Empoderando estudiantes de las Américas</p>
          <h1 className="mt-4 text-display font-bold tracking-tight">
            Tu talento,{" "}
            <AsciiText text="encontrado" className="text-brand-purple-light" /> por las empresas
          </h1>
          <p className="mt-5 max-w-md text-body-lg text-muted-foreground">
            Únete a la red de líderes LEAD. Crea tu perfil en 2 minutos y deja que las empresas te
            encuentren en LATAM
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="gap-1.5">
              <Link href="/sign-up">
                Crear mi perfil en 2 minutos <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <div className="flex -space-x-2">
              {featuredPeople.map((person) => (
                <InitialsAvatar
                  key={person.id}
                  initials={person.initials}
                  color={person.avatarColor}
                  className="size-9 ring-2 ring-background"
                />
              ))}
            </div>
            <p className="min-w-0 text-small text-muted-foreground">
              Únete a {people.length}+ miembros y sé visible para empresas
            </p>
          </div>
        </div>

        <div className="hidden lg:block">
          <div className="relative rounded-2xl border border-border/60 card-surface p-(--card-spacing) shadow-xl">
            <div className="brand-gradient absolute inset-x-8 top-0 h-px" aria-hidden="true" />
            <div className="flex items-center gap-3">
              <InitialsAvatar initials={preview.initials} color={preview.avatarColor} className="size-12 shrink-0 rounded-2xl" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="truncate font-bold">{preview.name}</p>
                  <BadgeCheck className="size-4 shrink-0 text-brand-purple-light" />
                </div>
                <p className="truncate text-small text-muted-foreground">{preview.headline}</p>
              </div>
            </div>
            <div className="mt-4 space-y-1.5 text-small text-muted-foreground">
              <p className="flex items-center gap-1.5">
                <BadgeCheck className="size-3.5 text-brand-purple-light" /> {preview.workAuth}
              </p>
              <p className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5 text-brand-purple-light" /> {preview.availability}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {preview.skills.slice(0, 4).map((skill) => (
                <Chip key={skill.name}>{skill.name}</Chip>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-2 border-t border-border/60 pt-4">
              <span className="flex items-center gap-1.5 text-caption font-medium text-success">
                <Check className="size-3.5" /> Visible para empresas
              </span>
              <Button size="sm" className="ml-auto">
                Ver perfil
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <h2 className="text-center text-h2 font-semibold">Empresas que confían en el talento LEAD</h2>
        <LogoMarquee items={PARTNER_LOGOS} />
      </section>

      <section className="py-20">
        <h2 className="text-h2 font-semibold">¿Qué puedes hacer en LEAD?</h2>
        <p className="mt-1 text-small text-muted-foreground">Una comunidad para crecer, y un perfil para que te encuentren.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: "/eventos", icon: CalendarDays, title: "Explorar eventos", text: "Workshops, paneles y networking de tu capítulo y de toda LEAD." },
            { href: "/sign-up", icon: UserPlus, title: "Crear tu perfil", text: "En 2 minutos, y las empresas pueden encontrarte." },
            { href: "/personas", icon: Users, title: "Conocer personas", text: "Únete a los líderes LEAD en LATAM" },          ].map((action) => (
            <Link key={action.href} href={action.href} className="card-surface group rounded-xl border border-border/60 p-4 transition-colors hover:border-brand-purple-light/30">
              <action.icon className="size-5 text-brand-purple-light" />
              <p className="mt-3 font-semibold">{action.title}</p>
              <p className="mt-1 text-caption text-muted-foreground">{action.text}</p>
              <ArrowRight className="mt-3 size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand-purple-light" />
            </Link>
          ))}
        </div>
      </section>

      <section className="py-20">
        <h2 className="text-h2 font-semibold">Únete a ellos</h2>
        <p className="mt-1 text-small text-muted-foreground">
          Líderes LEAD en el mundo. Tu perfil te pone en el mapa.
        </p>
        <div className="mt-8 grid gap-x-10 gap-y-6 sm:grid-cols-3">
          {featuredPeople.map((person) => (
            <div key={person.id} className="flex items-center gap-4">
              <InitialsAvatar initials={person.initials} color={person.avatarColor} className="size-12 shrink-0" />
              <div className="min-w-0">
                <p className="truncate font-semibold">{person.name}</p>
                <p className="truncate text-small text-muted-foreground">{person.school} · {person.country}</p>
                <p className="truncate text-small text-brand-purple-light">{person.chapter}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="brand-gradient mb-20 rounded-3xl px-8 py-14 text-center">
        <h2 className="mx-auto max-w-lg text-h1 font-bold tracking-tight text-primary-foreground">
          Las empresas ya buscan talento LEAD
        </h2>
        <p className="mx-auto mt-3 max-w-md text-small text-primary-foreground/85">
          Perfil verificado + resume + idiomas y disponibilidad. Así es como te encuentran.
        </p>
        <Button asChild size="lg" className="mt-6 gap-1.5 bg-primary-foreground text-foreground hover:bg-primary-foreground/90">
          <Link href="/sign-up">
            Crear mi perfil ahora <ArrowRight className="size-4" />
          </Link>
        </Button>
      </section>
    </div>
  );
}