"use client";

import { useEffect, useState } from "react";

const KEY = "lead-session";
const EVENT = "lead-session-change";

export type Session = { email?: string; at: number };

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function emit() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

/** Demo login (no backend) — stores a local session so logout is meaningful. */
export function login(email?: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ email, at: Date.now() } satisfies Session));
  } catch {
    /* ignore */
  }
  emit();
}

export function logout() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  emit();
}

export function useSession(): Session | null {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    setSession(getSession());
    const sync = () => setSession(getSession());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return session;
}
