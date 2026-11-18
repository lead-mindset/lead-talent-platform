import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { TOTAL_STEPS } from "@/lib/registration";
import { cn } from "cn";

/** Piezas comunes de los 6 pasos del registro (docs/design/registro). */

export function StepHeader({
  step,
  label,
  onSaveAndExit,
  saveLabel = "Guardar y salir",
  busy,
}: {
  step: number;
  label?: string;
  onSaveAndExit?: () => void;
  saveLabel?: string;
  busy?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-caption font-semibold tracking-[0.1em] text-muted-foreground uppercase">
        {label ?? `Paso ${step} de ${TOTAL_STEPS}`}
      </p>
      {onSaveAndExit && (
        <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={onSaveAndExit} disabled={busy}>
          {saveLabel}
        </Button>
      )}
    </div>
  );
}

export function StepTitle({ title, intro }: { title: string; intro?: string }) {
  return (
    <div className="space-y-2">
      <h1 className="text-h1 font-extrabold tracking-tight sm:text-display">{title}</h1>
      {intro && <p className="text-small text-muted-foreground sm:text-body">{intro}</p>}
    </div>
  );
}

/** Barra de 6 segmentos: hechos en violeta, el actual con degradado, el resto apagado. */
export function ProgressSegments({ step }: { step: number }) {
  return (
    <div
      className="grid grid-cols-6 gap-1"
      role="progressbar"
      aria-label="Avance del registro"
      aria-valuemin={1}
      aria-valuemax={TOTAL_STEPS}
      aria-valuenow={step}
      aria-valuetext={`Paso ${step} de ${TOTAL_STEPS}`}
    >
      {Array.from({ length: TOTAL_STEPS }, (_, index) => {
        const n = index + 1;
        return (
          <div
            key={n}
            className={cn("h-1 rounded-full", n < step ? "bg-brand-purple" : n === step ? "brand-button" : "bg-muted")}
          />
        );
      })}
    </div>
  );
}

export function StepFooter({
  step,
  onBack,
  onNext,
  nextLabel = "Siguiente",
  busy,
}: {
  step: number;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  busy?: boolean;
}) {
  return (
    <div className="space-y-5">
      <ProgressSegments step={step} />
      <div className="flex items-center justify-between">
        {step > 1 ? (
          <button
            type="button"
            onClick={onBack}
            disabled={busy}
            className="px-1 py-3 text-small font-semibold underline underline-offset-4 hover:text-brand-purple-light disabled:opacity-50"
          >
            Atrás
          </button>
        ) : (
          <span />
        )}
        <Button type="button" size="lg" className="h-12 rounded-lg px-7 text-body" onClick={onNext} disabled={busy}>
          {nextLabel} <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

/** Medidor chico: "Tu perfil 10%" con barra. */
export function ProfileMeter({ percent, text }: { percent: number; text: string }) {
  return (
    <div className="card-surface space-y-2.5 rounded-xl px-4 py-3.5 ring-1 ring-foreground/10">
      <div className="flex items-baseline justify-between">
        <span className="text-small font-semibold">Tu perfil</span>
        <span className="font-heading text-body font-extrabold text-brand-purple-light" data-testid="profile-percent">
          {percent}%
        </span>
      </div>
      <ProgressBar value={percent} className="h-1.5" />
      <p className="text-small text-muted-foreground">{text}</p>
    </div>
  );
}

/** Medidor grande del paso 6: anillo con el porcentaje al centro. */
export function RingMeter({ percent }: { percent: number }) {
  const turn = percent / 100;
  return (
    <div
      role="progressbar"
      aria-label="Perfil completo"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="flex size-40 items-center justify-center rounded-full"
      style={{
        backgroundImage: `conic-gradient(var(--brand-purple) 0turn, var(--brand-rose) ${turn}turn, var(--muted) ${turn}turn)`,
      }}
    >
      <div className="flex size-[134px] flex-col items-center justify-center gap-0.5 rounded-full bg-background">
        <span className="font-heading text-[38px] leading-none font-black" data-testid="profile-percent">
          {percent}%
        </span>
        <span className="text-caption text-muted-foreground">perfil completo</span>
      </div>
    </div>
  );
}

export function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <p className="text-caption text-destructive-light" role="alert">
      {children}
    </p>
  );
}

/** Marca de los campos prellenados por la lectura del CV. El campo sigue siendo editable. */
export function AiBadge({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span
      data-testid="ai-badge"
      className="ml-2 inline-flex items-center gap-1 rounded-full bg-brand-purple/15 px-2 py-0.5 align-middle text-[11px] font-semibold text-brand-purple-light"
    >
      <Sparkles className="size-3" aria-hidden="true" />
      Sugerido por IA
    </span>
  );
}
