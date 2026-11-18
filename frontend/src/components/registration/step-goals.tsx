"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { FilterChip } from "@/components/ui/filter-chip";
import { Segmented } from "@/components/ui/segmented";
import type { Availability } from "@/lib/api";
import { AVAILABILITY, ROLE_POOL } from "@/lib/data/options";
import type { RegistrationForm, UpdateForm } from "./form";
import { FieldError, StepTitle } from "./shell";

const MAX_ROLES = 5;

/** Paso 5: roles, disponibilidad y consentimiento de visibilidad (apagado por defecto). */
export function StepGoals({
  form,
  update,
  error,
}: {
  form: RegistrationForm;
  update: UpdateForm;
  error?: string;
}) {
  const toggleRole = (role: string) => {
    if (form.roles.includes(role)) update({ roles: form.roles.filter((r) => r !== role) });
    else if (form.roles.length < MAX_ROLES) update({ roles: [...form.roles, role] });
  };

  return (
    <div className="space-y-6">
      <StepTitle title="¿Qué buscas?" intro="Así te mostramos oportunidades que te sirven." />

      <div className="space-y-2.5">
        <p className="text-small font-semibold">
          Caminos que te interesan <span className="font-normal text-muted-foreground">(hasta {MAX_ROLES})</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {ROLE_POOL.map((role) => (
            <FilterChip
              key={role}
              active={form.roles.includes(role)}
              onClick={() => toggleRole(role)}
              className="min-h-10 rounded-[10px] px-3.5 text-body"
            >
              {role}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        <p className="text-small font-semibold">Disponibilidad</p>
        <Segmented
          options={AVAILABILITY as { value: Availability; label: string }[]}
          value={form.availability}
          onChange={(availability) => update({ availability })}
          className="grid w-full grid-cols-3 gap-1 [&>button]:min-h-10 [&>button]:justify-center [&>button]:px-1.5 [&>button]:text-center [&>button]:text-small [&>button]:whitespace-normal"
        />
      </div>

      <label
        htmlFor="w-visible"
        className="card-surface flex cursor-pointer items-start gap-3 rounded-xl p-4 ring-1 ring-foreground/10"
      >
        <Checkbox
          id="w-visible"
          checked={form.visible}
          onCheckedChange={(v) => update({ visible: v === true })}
          className="mt-0.5"
        />
        <span className="space-y-1">
          <span className="block text-body font-semibold">Quiero que empresas aliadas de LEAD vean mi perfil y mi CV</span>
          <span className="block text-small text-muted-foreground">
            Apagado por defecto. Puedes cambiarlo cuando quieras.
          </span>
        </span>
      </label>

      <FieldError>{error}</FieldError>
    </div>
  );
}
