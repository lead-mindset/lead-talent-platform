"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { describeError, routeAfterLogin } from "@/lib/api";

/** Vuelta de Google. El cliente de Supabase canjea el código de la URL por la sesión. */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string>();

  useEffect(() => {
    const supabase = getSupabase();
    let done = false;

    const go = async () => {
      if (done) return;
      done = true;
      try {
        router.replace(await routeAfterLogin());
      } catch (err) {
        setError(`Entraste, pero no pudimos cargar tu perfil: ${describeError(err)}`);
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) go();
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) go();
    });

    const params = new URLSearchParams(window.location.search);
    if (params.get("error")) setError("No pudimos iniciar sesión con Google. Intenta de nuevo.");

    return () => data.subscription.unsubscribe();
  }, [router]);

  return (
    <div className="flex flex-1 items-center justify-center py-24 text-small text-muted-foreground">
      {error ?? "Entrando…"}
    </div>
  );
}
