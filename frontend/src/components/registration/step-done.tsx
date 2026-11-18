"use client";

import { useState } from "react";
import { ArrowRight, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FilterChip } from "@/components/ui/filter-chip";
import { ROLE_POOL } from "@/lib/data/options";
import { pendingActions, type CompletenessKey } from "@/lib/registration";
import { RESUME_ACCEPT } from "@/lib/resume-file";
import { combine, url } from "@/lib/validators";
import { cn } from "cn";
import { completenessOf, type RegistrationForm } from "./form";
import { FieldError, RingMeter, StepHeader } from "./shell";
import { useResumeUpload } from "./use-resume-upload";

/** Cuántas acciones se muestran para llegar al 100%. */
const ACTIONS_SHOWN = 2;

/** Paso 6: perfil listo, medidor y las acciones que faltan para el 100%. Nada de puntos. */
export function StepDone({
  form,
  percent,
  isEdit,
  onSave,
  onResumeUploaded,
  onGoProfile,
}: {
  form: RegistrationForm;
  percent: number;
  isEdit: boolean;
  /** Guarda el perfil completo con estos cambios. Devuelve un mensaje de error o nada. */
  onSave: (patch: Partial<RegistrationForm>) => Promise<string | undefined>;
  onResumeUploaded: (resume: NonNullable<RegistrationForm["resume"]>) => void;
  onGoProfile: () => void;
}) {
  const [open, setOpen] = useState<CompletenessKey | null>(null);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [visibilityError, setVisibilityError] = useState<string>();
  const pending = pendingActions(completenessOf(form)).slice(0, ACTIONS_SHOWN);
  const remaining = pendingActions(completenessOf(form)).length;
  const firstName = form.givenNames.trim().split(/\s+/)[0];

  const subtitle =
    remaining === 0
      ? "Tu perfil está completo."
      : remaining === 1
        ? "Tu perfil está guardado. Termina este paso y llega al 100%."
        : remaining === 2
          ? "Tu perfil está guardado. Termina estos dos pasos y llega al 100%."
          : "Tu perfil está guardado. Empieza por estos dos pasos.";

  const toggleVisibility = async (on: boolean) => {
    setSavingVisibility(true);
    setVisibilityError(undefined);
    const error = await onSave({ visible: on });
    if (error) setVisibilityError(error);
    setSavingVisibility(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <StepHeader step={6} label="Paso 6 de 6 · Listo" />
        <RingMeter percent={percent} />
        <h1 className="text-h1 font-extrabold tracking-tight sm:text-display">
          {isEdit ? "¡Perfil actualizado!" : firstName ? `¡Listo, ${firstName}!` : "¡Listo!"}
        </h1>
        <p className="max-w-sm text-body text-muted-foreground">{subtitle}</p>
      </div>

      {pending.length > 0 && (
        <div className="card-surface divide-y divide-border/60 rounded-xl ring-1 ring-foreground/10">
          {pending.map((action) => (
            <div key={action.key}>
              <button
                type="button"
                aria-expanded={open === action.key}
                onClick={() => setOpen(open === action.key ? null : action.key)}
                className="flex min-h-[52px] w-full items-center justify-between gap-3 px-4 text-left text-body hover:bg-muted/40"
              >
                <span>{action.label}</span>
                <span className="flex items-center gap-1.5 font-semibold text-brand-purple-light">
                  +{action.gain}%
                  <ChevronDown className={cn("size-4 transition-transform", open === action.key && "rotate-180")} />
                </span>
              </button>
              {open === action.key && (
                <div className="px-4 pb-4">
                  <ActionEditor
                    actionKey={action.key}
                    form={form}
                    onSave={async (patch) => {
                      const error = await onSave(patch);
                      if (!error) setOpen(null);
                      return error;
                    }}
                    onResumeUploaded={(resume) => {
                      onResumeUploaded(resume);
                      setOpen(null);
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="card-surface flex items-center gap-3.5 rounded-xl p-4 ring-1 ring-foreground/10">
        <div className="flex-1 space-y-1">
          <label htmlFor="w-done-visible" className="block text-body font-semibold">
            Visible para empresas aliadas
          </label>
          <p className="text-small text-muted-foreground">
            {form.visible
              ? "Las empresas aliadas pueden ver tu perfil y tu CV."
              : "Privado. Solo tú lo ves. Puedes activarlo cuando quieras."}
          </p>
          <FieldError>{visibilityError}</FieldError>
        </div>
        <Switch
          id="w-done-visible"
          checked={form.visible}
          disabled={savingVisibility}
          onCheckedChange={toggleVisibility}
          className="data-[size=default]:h-[30px] data-[size=default]:w-[52px] [&>span]:data-[slot=switch-thumb]:size-6"
        />
      </div>

      <Button type="button" size="lg" className="h-[52px] w-full rounded-lg text-body-lg" onClick={onGoProfile}>
        Ir a mi perfil <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}

/** Lo que se abre al tocar una acción: cada una se completa ahí mismo, sin salir del paso. */
function ActionEditor({
  actionKey,
  form,
  onSave,
  onResumeUploaded,
}: {
  actionKey: CompletenessKey;
  form: RegistrationForm;
  onSave: (patch: Partial<RegistrationForm>) => Promise<string | undefined>;
  onResumeUploaded: (resume: NonNullable<RegistrationForm["resume"]>) => void;
}) {
  const [linkedin, setLinkedin] = useState(form.linkedin);
  const [picked, setPicked] = useState<string[]>(actionKey === "roles" ? form.roles : form.topSkills);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const upload = useResumeUpload(onResumeUploaded);

  const save = async (patch: Partial<RegistrationForm>) => {
    setSaving(true);
    setError(await onSave(patch));
    setSaving(false);
  };

  if (actionKey === "resume") {
    return (
      <div className="space-y-2">
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-3 text-small font-medium text-brand-purple-light hover:bg-muted">
          {upload.uploading && <Loader2 className="size-4 animate-spin" />}
          {upload.uploading ? "Subiendo…" : "Elegir archivo"}
          <input
            ref={upload.inputRef}
            type="file"
            className="sr-only"
            accept={RESUME_ACCEPT}
            aria-label="Subir mi CV"
            disabled={upload.uploading}
            onChange={(e) => upload.onFile(e.target.files?.[0])}
          />
        </label>
        <p className="text-caption text-muted-foreground">PDF, DOC o DOCX. Máximo 10 MB.</p>
        <FieldError>{upload.error}</FieldError>
      </div>
    );
  }

  if (actionKey === "linkedin") {
    const submit = () => {
      const value = linkedin.trim();
      const invalid = !value
        ? "Escribe tu enlace de LinkedIn"
        : (combine(url())(value) ?? (/linkedin\.com\//i.test(value) ? undefined : "Debe ser un enlace de LinkedIn"));
      if (invalid) return setError(invalid);
      save({ linkedin: value });
    };
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            aria-label="Tu LinkedIn"
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
            placeholder="linkedin.com/in/tu-usuario"
            className="h-10 min-w-0 flex-1"
            autoFocus
          />
          <Button type="button" onClick={submit} disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
        <FieldError>{error}</FieldError>
      </div>
    );
  }

  const isRoles = actionKey === "roles";
  const options = isRoles ? ROLE_POOL : form.skills;
  const max = isRoles ? 5 : 3;
  const needed = isRoles ? 1 : Math.min(3, form.skills.length);
  const toggle = (value: string) =>
    setPicked((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : prev.length < max ? [...prev, value] : prev,
    );

  return (
    <div className="space-y-3">
      <p className="text-caption text-muted-foreground">
        {isRoles ? "Elige hasta 5." : `Toca las ${needed} que más dominas.`}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <FilterChip key={option} active={picked.includes(option)} onClick={() => toggle(option)}>
            {option}
          </FilterChip>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <FieldError>{error}</FieldError>
        <Button
          type="button"
          className="ml-auto"
          disabled={saving || picked.length < needed}
          onClick={() => save(isRoles ? { roles: picked } : { topSkills: picked })}
        >
          {saving ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </div>
  );
}
