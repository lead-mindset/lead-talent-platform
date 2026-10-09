"use client";

import { useEffect, useState } from "react";
import { talent } from "@/lib/data/talent";
import { useToast } from "@/components/ui/toast";

const KEY = "lead-saved-talent";
const DEFAULT_SAVED = ["t1", "t4"];

export function useSavedTalent() {
  const { toast } = useToast();
  const [saved, setSaved] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      setSaved(raw ? (JSON.parse(raw) as string[]) : DEFAULT_SAVED);
    } catch {
      setSaved(DEFAULT_SAVED);
    }
    setReady(true);
  }, []);

  const toggle = (id: string) => {
    const wasSaved = saved.includes(id);
    setSaved((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
    toast({
      title: wasSaved ? "Quitado de guardados" : "Guardado en tus candidatos",
      variant: wasSaved ? "default" : "success",
    });
  };

  const savedPeople = talent.filter((person) => saved.includes(person.id));

  return { saved, savedPeople, toggle, ready };
}