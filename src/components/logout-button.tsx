"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { logout } from "@/lib/session";
import { cn } from "cn";

export function LogoutButton({ className, iconOnly = false }: { className?: string; iconOnly?: boolean }) {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="ghost"
      size={iconOnly ? "icon" : "sm"}
      aria-label="Cerrar sesión"
      className={cn("gap-1.5 text-small text-muted-foreground", className)}
      onClick={() => {
        logout();
        router.push("/login");
      }}
    >
      <LogOut className="size-4" />
      {iconOnly ? null : <span className="hidden sm:inline">Cerrar sesión</span>}
    </Button>
  );
}
