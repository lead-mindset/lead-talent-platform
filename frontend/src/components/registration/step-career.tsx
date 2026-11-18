import type { CareerStage } from "@/lib/api";
import { CAREER_STAGES } from "@/lib/registration";
import { cn } from "cn";
import { FieldError, ProfileMeter, StepTitle } from "./shell";

/** Paso 1: "¿Cuál te describe mejor?" */
export function StepCareer({
  value,
  onChange,
  percent,
  error,
}: {
  value: CareerStage | null;
  onChange: (value: CareerStage) => void;
  percent: number;
  error?: string;
}) {
  return (
    <div className="space-y-6">
      <StepTitle title="¿Cuál te describe mejor?" intro="Así mostramos tu perfil a los reclutadores correctos." />

      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="¿Cuál te describe mejor?">
          {CAREER_STAGES.map((option) => {
            const active = value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange(option.value)}
                className={cn(
                  "flex min-h-[150px] flex-col items-start gap-2.5 rounded-xl p-4 text-left transition-colors",
                  active
                    ? "bg-brand-purple/15 ring-2 ring-brand-purple-light"
                    : "card-surface ring-1 ring-foreground/10 hover:ring-foreground/25",
                )}
              >
                <span
                  aria-hidden="true"
                  className="flex size-10 items-center justify-center rounded-lg bg-brand-purple/15 font-heading text-body-lg font-extrabold text-brand-purple-light"
                >
                  {option.mark}
                </span>
                <span className="text-body-lg leading-snug font-semibold">{option.label}</span>
                <span className="text-caption text-muted-foreground">{option.hint}</span>
              </button>
            );
          })}
        </div>
        <FieldError>{error}</FieldError>
      </div>

      <ProfileMeter percent={percent} text="Cada paso te acerca a aparecer en las búsquedas de empresas aliadas." />
    </div>
  );
}
