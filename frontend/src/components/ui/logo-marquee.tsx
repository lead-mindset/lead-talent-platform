import { cn } from "cn";

import type { PartnerLogo } from "@/lib/data/partners";

export function LogoMarquee({
  items,
  label = "Empresas que confían en el talento LEAD",
  className,
}: {
  items: PartnerLogo[];
  label?: string;
  className?: string;
}) {
  const doubled = [...items, ...items];

  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className={cn(
        "logo-marquee-window mt-6 overflow-x-auto rounded-2xl border border-border/60 bg-card/40 py-5 outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-ring/45 md:overflow-hidden",
        className
      )}
    >
      <div className="logo-marquee-track flex w-max items-center gap-6 px-5">
        {doubled.map((logo, index) => {
          const duplicate = index >= items.length;
          return (
            <div
              key={`${logo.name}-${index}`}
              aria-hidden={duplicate}
              className="flex h-14 w-40 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-foreground/95 px-5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logo.src}
                alt={duplicate ? "" : logo.name}
                loading="lazy"
                className="h-auto max-h-10 w-auto object-contain"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
