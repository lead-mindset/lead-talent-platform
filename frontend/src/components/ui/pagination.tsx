"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "cn";

export function Pagination({
  page,
  totalPages,
  onChange,
  className,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  className?: string;
}) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  return (
    <nav aria-label="Paginación" className={cn("flex flex-wrap items-center gap-1", className)}>
      <Button variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Anterior">
        <ChevronLeft />
      </Button>
      {pages.map((item) => (
        <Button
          key={item}
          size="icon-sm"
          variant={item === page ? "default" : "ghost"}
          onClick={() => onChange(item)}
          aria-current={item === page ? "page" : undefined}
        >
          {item}
        </Button>
      ))}
      <Button variant="outline" size="icon-sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="Siguiente">
        <ChevronRight />
      </Button>
    </nav>
  );
}
