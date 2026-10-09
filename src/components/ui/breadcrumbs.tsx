import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "cn";

export function Breadcrumbs({
  items,
  className,
}: {
  items: { label: string; href?: string }[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex flex-wrap items-center gap-1.5 text-small text-muted-foreground", className)}>
      {items.map((item, index) => {
        const last = index === items.length - 1;
        return (
          <span key={index} className="flex items-center gap-1.5">
            {item.href && !last ? (
              <Link href={item.href} className="transition-colors hover:text-foreground">
                {item.label}
              </Link>
            ) : (
              <span className={cn(last && "font-medium text-foreground")}>{item.label}</span>
            )}
            {!last && <ChevronRight className="size-3.5 opacity-60" aria-hidden />}
          </span>
        );
      })}
    </nav>
  );
}
