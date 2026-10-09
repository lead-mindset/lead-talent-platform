"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InitialsAvatar } from "@/components/initials-avatar";
import { BrandMark } from "@/components/brand-mark";
import { LogoutButton } from "@/components/logout-button";
import { useCurrentUser } from "@/lib/use-current-user";
import { getSocial } from "@/lib/config";
import { cn } from "cn";

const baseNav = [
  { label: "Comunidad", href: "/inicio" },
  { label: "Eventos", href: "/eventos" },
  { label: "Personas", href: "/personas" },
];

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

const socialLinks = [
  { ...getSocial("instagram"), icon: InstagramIcon },
  { ...getSocial("linkedin"), icon: LinkedInIcon },
];

export function Topbar() {
  const pathname = usePathname();
  const user = useCurrentUser();
  const [open, setOpen] = useState(false);

  const adminLinks = user.views
    .filter((view) => view.href.startsWith("/admin"))
    .map((view) => ({
      label: view.label,
      href: view.href,
      special: true,
    }));
  const nav: { label: string; href: string; special?: boolean }[] = [...baseNav, ...adminLinks];

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-6">
        <Link href="/inicio" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <BrandMark className="h-6" />
          <span className="text-h3 font-bold tracking-tight">LEAD</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Navegación principal">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-full px-3 py-1.5 text-small font-medium transition-colors",
                  item.special
                    ? active
                      ? "bg-brand-purple/20 font-semibold text-brand-purple-light"
                      : "bg-brand-purple/15 text-brand-purple-light hover:bg-brand-purple/20"
                    : active
                    ? "bg-muted font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1">
            {socialLinks.map(({ name, href, icon: Icon }) => (
              <Button key={href} variant="ghost" size="icon-sm" asChild className="text-muted-foreground hover:text-foreground">
                <a href={href} target="_blank" rel="noreferrer" aria-label={name}>
                  <Icon className="size-4" />
                </a>
              </Button>
            ))}
          </div>
          <Button variant="ghost" size="icon" aria-label="Notificaciones">
            <Bell />
          </Button>
          <Link href="/perfil" aria-label="Mi perfil">
            <InitialsAvatar initials={user.initials} color={user.avatarColor} className="cursor-pointer" />
          </Link>
          <LogoutButton iconOnly />
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            onClick={() => setOpen((prev) => !prev)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-border/60 bg-background/95 px-6 py-3 backdrop-blur md:hidden" aria-label="Menú móvil">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-lg px-3 py-2.5 text-body font-medium transition-colors",
                  item.special
                    ? active
                      ? "bg-brand-purple/20 text-brand-purple-light"
                      : "bg-brand-purple/15 text-brand-purple-light hover:bg-brand-purple/20"
                    : active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}