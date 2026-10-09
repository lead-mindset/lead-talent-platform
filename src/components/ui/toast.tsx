"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, Check, Info, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "cn";

export type ToastVariant = "default" | "success" | "destructive";

export type ToastOptions = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  action?: { label: string; onClick: () => void };
  duration?: number;
};

type ToastItem = ToastOptions & { id: string };

type ToastContextValue = {
  toast: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_ICON = { default: Info, success: Check, destructive: AlertTriangle };
const VARIANT_TONE = {
  default: "text-brand-purple-light",
  success: "text-success",
  destructive: "text-destructive-light",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    const id = `toast-${Date.now()}-${counter.current++}`;
    setToasts((prev) => [...prev.slice(-2), { id, ...options }]);
    return id;
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return context;
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const { title, description, variant = "default", action, duration } = item;
  const Icon = VARIANT_ICON[variant];

  useEffect(() => {
    const timeout = window.setTimeout(onDismiss, duration ?? (action ? 6000 : 3800));
    return () => window.clearTimeout(timeout);
  }, [action, duration, onDismiss]);

  return (
    <div
      role="status"
      data-slot="toast"
      data-variant={variant}
      className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-lg motion-safe:animate-in motion-safe:slide-in-from-bottom-2 motion-safe:fade-in-0 motion-safe:duration-200"
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", VARIANT_TONE[variant])} />
      <div className="min-w-0 flex-1">
        <p className="text-small font-semibold leading-snug text-foreground">{title}</p>
        {description ? <p className="mt-0.5 text-caption text-muted-foreground">{description}</p> : null}
        {action ? (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="mt-1 h-auto p-0"
            onClick={() => {
              action.onClick();
              onDismiss();
            }}
          >
            {action.label}
          </Button>
        ) : null}
      </div>
      <Button type="button" variant="ghost" size="icon-xs" aria-label="Cerrar" onClick={onDismiss}>
        <X className="size-3.5" />
      </Button>
    </div>
  );
}
