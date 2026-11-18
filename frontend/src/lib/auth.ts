"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";

export type AuthState = { status: "loading" } | { status: "signed-out" } | { status: "signed-in"; session: Session };

/** Sesión actual de Supabase. Se actualiza sola al iniciar o cerrar sesión. */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      setState(data.session ? { status: "signed-in", session: data.session } : { status: "signed-out" });
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(session ? { status: "signed-in", session } : { status: "signed-out" });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return state;
}

export async function signOut() {
  await getSupabase().auth.signOut();
}

export function initialsOf(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.split("@")[0] || "";
  return (
    source
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "LE"
  );
}
