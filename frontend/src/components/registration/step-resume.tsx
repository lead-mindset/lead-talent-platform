"use client";

import { Loader2, Lock, PenLine, Upload } from "lucide-react";
import { fileKind, formatSize, RESUME_ACCEPT } from "@/lib/resume-file";
import { cn } from "cn";
import type { RegistrationForm } from "./form";
import { FieldError, StepTitle } from "./shell";
import { useResumeUpload } from "./use-resume-upload";

/** Las dos salidas del paso 2 comparten tamaño y peso visual: ninguna es "la secundaria". */
const OPTION =
  "flex min-h-[150px] w-full flex-col items-center justify-center gap-2.5 rounded-xl p-5 text-center transition-colors";

/** Paso 2: subir CV o seguir sin CV. Usa el mismo flujo de subida que la tarjeta del perfil. */
export function StepResume({
  resume,
  noCv,
  percentWithCv,
  error,
  onUploaded,
  onNoCv,
}: {
  resume: RegistrationForm["resume"];
  noCv: boolean;
  percentWithCv: number;
  error?: string;
  onUploaded: (resume: NonNullable<RegistrationForm["resume"]>) => void;
  onNoCv: () => void;
}) {
  const { uploading, error: uploadError, inputRef, onFile } = useResumeUpload(onUploaded);

  const picker = (
    <input
      ref={inputRef}
      type="file"
      className="sr-only"
      accept={RESUME_ACCEPT}
      disabled={uploading}
      aria-label={resume ? "Cambiar mi CV" : "Subir mi CV"}
      onChange={(e) => onFile(e.target.files?.[0])}
    />
  );

  return (
    <div className="space-y-5">
      <StepTitle title="Sube tu CV" intro="Con tu CV, tu perfil avanza más rápido. Tú revisas todo antes de guardar." />

      {resume ? (
        <div className="space-y-3">
          <div className="card-surface flex items-center gap-3 rounded-xl px-4 py-3.5 ring-1 ring-foreground/10">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-destructive/15 text-[11px] font-bold text-destructive-light">
              {fileKind(resume.fileName)}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-body font-semibold" data-testid="resume-file">
                {resume.fileName}
              </span>
              <span className="text-caption text-success">
                {uploading ? "Subiendo el nuevo archivo…" : `Listo. Tu CV quedó guardado (${formatSize(resume.sizeBytes)}).`}
              </span>
            </span>
            <label className="cursor-pointer px-1 py-2.5 text-small font-semibold text-brand-purple-light hover:underline">
              {uploading ? <Loader2 className="size-4 animate-spin" aria-label="Subiendo" /> : "Cambiar"}
              {picker}
            </label>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-brand-purple/15 px-4 py-3.5">
            <span className="font-heading text-[18px] font-extrabold text-brand-purple-light">{percentWithCv}%</span>
            <span className="text-small">
              Con tu CV, el perfil ya va a la mitad. En el siguiente paso completas tus datos.
            </span>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <label
            className={cn(
              OPTION,
              "cursor-pointer border-2 border-dashed border-brand-purple-light/50 bg-brand-purple/5 hover:bg-brand-purple/10",
              uploading && "cursor-wait opacity-80",
            )}
          >
            <span className="flex size-12 items-center justify-center rounded-xl bg-brand-purple/15 text-brand-purple-light">
              {uploading ? <Loader2 className="size-6 animate-spin" /> : <Upload className="size-6" />}
            </span>
            <span className="text-body-lg font-semibold">{uploading ? "Subiendo tu CV…" : "Subir mi CV"}</span>
            <span className="text-small text-muted-foreground">PDF, DOC o DOCX · máximo 10 MB</span>
            {picker}
          </label>

          <div className="flex items-center gap-3 sm:flex-col" aria-hidden="true">
            <span className="h-px flex-1 bg-border sm:h-auto sm:w-px" />
            <span className="text-small text-muted-foreground">o</span>
            <span className="h-px flex-1 bg-border sm:h-auto sm:w-px" />
          </div>

          <button
            type="button"
            onClick={onNoCv}
            disabled={uploading}
            aria-pressed={noCv}
            className={cn(
              OPTION,
              "border-2",
              noCv
                ? "border-brand-purple-light bg-brand-purple/15"
                : "border-border bg-card hover:bg-muted",
            )}
          >
            <span className="flex size-12 items-center justify-center rounded-xl bg-brand-purple/15 text-brand-purple-light">
              <PenLine className="size-6" />
            </span>
            <span className="text-body-lg font-semibold">No tengo CV todavía</span>
            <span className="text-small text-muted-foreground">Sigo a mano. Lo puedes subir después desde tu perfil.</span>
          </button>
        </div>
      )}

      <FieldError>{uploadError ?? error}</FieldError>

      <p className="flex items-start gap-2.5 text-caption text-muted-foreground">
        <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Tu CV es privado: solo lo ven empresas aliadas si tú lo activas al final.
      </p>
    </div>
  );
}
