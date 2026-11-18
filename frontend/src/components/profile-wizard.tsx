"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RequireAuth } from "@/components/require-auth";
import { api, ApiError, type Country, type FunnelEventName } from "@/lib/api";
import { combine, required, url } from "@/lib/validators";
import {
  clearDrafts,
  completenessPercent,
  device,
  loadDraft,
  newSessionId,
  saveDraft,
  TOTAL_STEPS,
  track,
} from "@/lib/registration";
import { getSupabase } from "@/lib/supabase";
import {
  applySuggestions,
  completenessOf,
  EMPTY_FORM,
  formFromProfile,
  toProfileInput,
  withoutTouchedAiFields,
  type RegistrationForm,
} from "@/components/registration/form";
import { FieldError, StepFooter, StepHeader } from "@/components/registration/shell";
import { StepCareer } from "@/components/registration/step-career";
import { StepResume } from "@/components/registration/step-resume";
import { StepDetails, type CvNotice, type DetailsErrors } from "@/components/registration/step-details";
import { StepSkills } from "@/components/registration/step-skills";
import { StepGoals } from "@/components/registration/step-goals";
import { StepDone } from "@/components/registration/step-done";

/** Registro de 6 pasos (docs/design/registro). También sirve para editar el perfil. */
export function ProfileWizard() {
  return (
    <RequireAuth>
      <Wizard />
    </RequireAuth>
  );
}

type Draft = { step: number; sessionId: string; form: RegistrationForm };

type StepErrors = DetailsErrors & { careerStage?: string; resume?: string; skills?: string; save?: string };

/** El backend corta a los 30 s; esto cubre la descarga y la red. Después, se sigue a mano. */
const CV_READ_TIMEOUT_MS = 40_000;

/** Mensajes amables por motivo. Nunca bloquean: el registro sigue a mano. */
function cvFailureMessage(reason: string): string {
  switch (reason) {
    case "formato_no_soportado":
      return "No pudimos leer tu CV porque está en formato .doc. Completa tus datos aquí; tu CV quedó guardado igual.";
    case "sin_texto":
      return "Tu CV parece ser una imagen escaneada y no pudimos leer el texto. Completa tus datos aquí; tu CV quedó guardado.";
    case "limite_alcanzado":
      return "Ya leímos varios CV en la última hora. Completa tus datos aquí; tu CV quedó guardado.";
    default:
      return "Esta vez no pudimos leer tu CV. Completa tus datos aquí; tu CV quedó guardado.";
  }
}

function Wizard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [isEdit, setIsEdit] = useState(false);
  const [userId, setUserId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [countries, setCountries] = useState<Country[]>([]);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<RegistrationForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<StepErrors>({});
  const [saving, setSaving] = useState(false);
  const [readingCv, setReadingCv] = useState(false);
  const [cvNotice, setCvNotice] = useState<CvNotice>();

  // Tiempo en el paso actual, para los eventos del embudo.
  const stepStartedAt = useRef(Date.now());
  const lastViewed = useRef(0);

  // Si el estudiante cambia un campo sugerido por la IA, ese campo deja de llevar la marca.
  const update = useCallback((patch: Partial<RegistrationForm>) => {
    setForm((prev) => ({ ...prev, ...patch, aiFields: withoutTouchedAiFields(prev, patch) }));
  }, []);

  // Precarga: perfil existente (editar), borrador local (volvió después de "Guardar y salir")
  // o datos de Google (nombre). El CV se consulta aparte porque vive en Storage.
  useEffect(() => {
    Promise.all([api.getProfile(), api.getCountries(), api.getResume()])
      .then(([{ person, profile }, countryList, resume]) => {
        setCountries(countryList);
        setUserId(person.id);
        const editing = Boolean(profile?.onboarding_completed_at);
        setIsEdit(editing);
        const draft = editing ? null : loadDraft<Draft>(person.id);
        const base = draft ? { ...EMPTY_FORM, ...draft.form } : formFromProfile(person, profile);
        const savedResume = resume ? { fileName: resume.file_name, sizeBytes: resume.size_bytes } : null;
        setForm({ ...base, resume: savedResume, noCv: savedResume ? false : base.noCv });
        setStep(draft ? Math.min(Math.max(draft.step, 1), TOTAL_STEPS - 1) : 1);
        setSessionId(draft?.sessionId ?? newSessionId());
      })
      .catch((err) => {
        if (err instanceof ApiError && err.code === "email_not_confirmed") router.replace("/login?confirmar=1");
        else setLoadError("No pudimos cargar tus datos. Revisa que el backend esté corriendo.");
      })
      .finally(() => setLoading(false));
  }, [router]);

  // ---------------------------------------------------------------- embudo
  // Solo el registro nuevo cuenta para el embudo; editar el perfil no.
  const secondsOnStep = () => Math.min(86400, Math.round((Date.now() - stepStartedAt.current) / 1000));
  const funnel = useCallback(
    (name: FunnelEventName, eventStep: number, secondsOnStepValue?: number) => {
      if (!isEdit && sessionId) track(sessionId, name, eventStep, { secondsOnStep: secondsOnStepValue });
    },
    [isEdit, sessionId],
  );

  useEffect(() => {
    if (loading || loadError || lastViewed.current === step) return;
    lastViewed.current = step;
    stepStartedAt.current = Date.now();
    funnel("registro_paso_visto", step, 0);
  }, [step, loading, loadError, funnel]);

  // El borrador se actualiza en cada cambio de paso: cerrar la pestaña no pierde el avance.
  // `form` queda fuera de las dependencias a propósito: guardar en cada tecla no hace falta.
  const formRef = useRef(form);
  formRef.current = form;
  useEffect(() => {
    if (!loading && !isEdit && userId && step < TOTAL_STEPS) saveDraft(userId, { step, sessionId, form: formRef.current });
  }, [step, loading, isEdit, userId, sessionId]);

  // -------------------------------------------------------------- validación
  const validate = (target: number): StepErrors => {
    const next: StepErrors = {};
    if (target === 1 && !form.careerStage) next.careerStage = "Elige la opción que más se parece a ti.";
    if (target === 2 && !form.resume && !form.noCv) {
      next.resume = "Sube tu CV o elige “No tengo CV todavía”.";
    }
    if (target === 3) {
      next.name = required("Escribe tu nombre")(form.givenNames);
      next.country = form.country ? undefined : "Elige tu país";
      next.university = required("Escribe tu universidad")(form.university);
      const year = form.year.trim();
      if (year && (!/^\d{4}$/.test(year) || Number(year) < 1990 || Number(year) > 2045)) {
        next.year = "Escribe un año válido (por ejemplo 2028).";
      }
      if (isEdit && form.linkedin.trim()) {
        next.linkedin =
          combine(url())(form.linkedin) ??
          (/linkedin\.com\//i.test(form.linkedin) ? undefined : "Debe ser un enlace de LinkedIn");
      }
    }
    if (target === 4 && form.skills.length === 0) next.skills = "Elige al menos una skill.";
    return Object.fromEntries(Object.entries(next).filter(([, v]) => v)) as StepErrors;
  };

  // -------------------------------------------------------------- guardado
  /** PUT del perfil completo. Devuelve el mensaje de error o nada. */
  const persist = async (data: RegistrationForm): Promise<string | undefined> => {
    try {
      await api.saveProfile(toProfileInput(data));
      return undefined;
    } catch (err) {
      return err instanceof ApiError ? err.message : "No pudimos guardar tu perfil. Intenta de nuevo.";
    }
  };

  const finish = async () => {
    setSaving(true);
    setErrors({});
    const error = await persist(form);
    if (error) {
      setErrors({ save: error });
      setSaving(false);
      return;
    }
    // El rol "student" se asigna al guardar. Renovar la sesión para que el token lo traiga.
    await getSupabase().auth.refreshSession().catch(() => undefined);
    clearDrafts();
    funnel("registro_paso_completado", 5, secondsOnStep());
    funnel("registro_terminado", TOTAL_STEPS);
    setSaving(false);
    setStep(TOTAL_STEPS);
  };

  // -------------------------------------------------------------- navegación
  const goTo = (target: number) => {
    setErrors({});
    setStep(target);
    window.scrollTo({ top: 0 });
  };

  const next = () => {
    const found = validate(step);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    if (step === 5) {
      finish();
      return;
    }
    funnel("registro_paso_completado", step, secondsOnStep());
    goTo(step + 1);
  };

  const back = () => goTo(Math.max(1, step - 1));

  /**
   * Paso 2: después de subir el CV, la IA lo lee y prellena el paso 3. Solo sugiere: nada se guarda
   * hasta terminar. Si falla (o tarda demasiado), se pasa al paso 3 a mano con un aviso amable.
   */
  const readCv = async () => {
    setReadingCv(true);
    setCvNotice(undefined);
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), CV_READ_TIMEOUT_MS);
    let notice: CvNotice | undefined;
    try {
      // En "Editar perfil" no hay embudo: sin session_id el backend no registra la falla.
      const body = isEdit ? {} : { session_id: sessionId, device: device() };
      const result = await api.parseResume(body, controller.signal);
      if (result?.status === "ok") {
        setForm((prev) => applySuggestions(prev, result.suggestions));
        notice = { kind: "ok" };
      } else if (result && result.reason !== "ia_desactivada") {
        notice = { kind: "failed", message: cvFailureMessage(result.reason) };
      }
    } catch {
      notice = { kind: "failed", message: cvFailureMessage("ia_no_disponible") };
    } finally {
      window.clearTimeout(timer);
    }
    setReadingCv(false);
    setCvNotice(notice);
    funnel("registro_paso_completado", 2, secondsOnStep());
    goTo(3);
  };

  /** Registro: guarda el avance en este navegador. Editar: guarda en el backend si todo es válido. */
  const saveAndExit = async () => {
    if (!isEdit) {
      saveDraft(userId, { step, sessionId, form });
      router.push("/");
      return;
    }
    for (const target of [3, 4]) {
      const found = validate(target);
      if (Object.keys(found).length > 0) {
        setErrors(found);
        setStep(target);
        return;
      }
    }
    setSaving(true);
    const error = await persist(form);
    setSaving(false);
    if (error) setErrors({ save: error });
    else router.push("/perfil");
  };

  // ---------------------------------------------------------------- render
  if (loading) {
    return <div className="flex flex-1 items-center justify-center py-24 text-small text-muted-foreground">Cargando…</div>;
  }
  if (loadError) {
    return (
      <div className="flex flex-1 items-center justify-center py-24 text-small text-destructive-light" role="alert">
        {loadError}
      </div>
    );
  }

  const percent = completenessPercent(completenessOf(form));

  if (step === TOTAL_STEPS) {
    return (
      <div className="mx-auto w-full max-w-xl flex-1 px-6 py-10">
        <StepDone
          form={form}
          percent={percent}
          isEdit={isEdit}
          onSave={async (patch) => {
            const nextForm = { ...form, ...patch };
            const error = await persist(nextForm);
            if (!error) setForm(nextForm);
            return error;
          }}
          onResumeUploaded={(resume) => {
            update({ resume, noCv: false });
            funnel("cv_subido", TOTAL_STEPS);
          }}
          onGoProfile={() => {
            funnel("registro_paso_completado", TOTAL_STEPS, secondsOnStep());
            router.push("/perfil");
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-7 px-6 py-10">
      <StepHeader
        step={step}
        onSaveAndExit={saveAndExit}
        saveLabel={isEdit ? "Guardar y volver" : "Guardar y salir"}
        busy={saving || readingCv}
      />

      <div className="flex-1">
        {step === 1 && (
          <StepCareer
            value={form.careerStage}
            onChange={(careerStage) => {
              update({ careerStage });
              setErrors({});
            }}
            percent={percent}
            error={errors.careerStage}
          />
        )}
        {step === 2 && (
          <StepResume
            resume={form.resume}
            noCv={form.noCv}
            percentWithCv={percent}
            error={errors.resume}
            reading={readingCv}
            onUploaded={(resume) => {
              update({ resume, noCv: false });
              setErrors({});
              funnel("cv_subido", 2, secondsOnStep());
              readCv();
            }}
            onNoCv={() => {
              update({ noCv: true });
              funnel("registro_sin_cv", 2, secondsOnStep());
              funnel("registro_paso_completado", 2, secondsOnStep());
              goTo(3);
            }}
          />
        )}
        {step === 3 && (
          <StepDetails
            form={form}
            update={update}
            countries={countries}
            errors={errors}
            withResume={Boolean(form.resume)}
            showLinkedin={isEdit}
            notice={cvNotice}
          />
        )}
        {step === 4 && (
          <StepSkills
            skills={form.skills}
            topSkills={form.topSkills}
            onChange={(skills, topSkills) => {
              update({ skills, topSkills });
              if (skills.length > 0) setErrors({});
            }}
            showTopSkills={isEdit}
            fromCv={form.aiFields.includes("skills")}
            error={errors.skills}
          />
        )}
        {step === 5 && <StepGoals form={form} update={update} error={errors.save} />}
        {step !== 5 && <FieldError>{errors.save}</FieldError>}
      </div>

      <StepFooter
        step={step}
        onBack={back}
        onNext={next}
        nextLabel={step === 5 ? (saving ? "Guardando…" : "Terminar") : "Siguiente"}
        busy={saving || readingCv}
      />
    </div>
  );
}
