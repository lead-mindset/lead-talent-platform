"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

/** Muestra el contenido solo con sesión. Sin sesión, manda a /login. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.status === "signed-out") router.replace("/login");
  }, [auth.status, router]);

  if (auth.status !== "signed-in") {
    return (
      <div className="flex flex-1 items-center justify-center py-24 text-small text-muted-foreground">
        Cargando…
      </div>
    );
  }
  return <>{children}</>;
}
