"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/form";
import { buildValidate, email, required } from "@/lib/validators";
import { getSupabase } from "@/lib/supabase";
import { describeError, routeAfterLogin } from "@/lib/api";

const validateEmail = buildValidate({ email: [required("Escribe tu correo"), email()] });

const LENGTH = 6;
const RESEND_SECONDS = 60; // Supabase no deja pedir otro código al mismo correo antes de ~60 s

/** Login por correo con código de 6 dígitos (Supabase Auth). Crea la cuenta si no existe. */
export function OtpLogin() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [value, setValue] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(""));
  const [errors, setErrors] = useState<{ email?: string; code?: string }>({});
  const [seconds, setSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [sending, setSending] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const code = digits.join("");

  // focus the first box + start the resend timer when the code step opens
  useEffect(() => {
    if (step !== "code") return;
    inputs.current[0]?.focus();
    setSeconds(RESEND_SECONDS);
  }, [step]);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setTimeout(() => setSeconds((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [seconds]);

  const requestCode = async () => {
    const { error } = await getSupabase().auth.signInWithOtp({
      email: value.trim(),
      // El correo trae el código y también un enlace. Ambos sirven para entrar.
      options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    return error;
  };

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateEmail({ email: value });
    setErrors(err as { email?: string });
    if (Object.keys(err).length > 0) return;
    setSending(true);
    const error = await requestCode();
    setSending(false);
    if (error) {
      setErrors({ email: error.status === 429 ? "Espera un momento antes de pedir otro código." : "No pudimos enviar el código. Revisa tu correo e intenta de nuevo." });
      return;
    }
    setDigits(Array(LENGTH).fill(""));
    setErrors({});
    setStep("code");
  };

  const verify = async () => {
    if (code.length !== LENGTH) {
      setErrors({ code: "El código tiene 6 dígitos" });
      return;
    }
    setSubmitting(true);
    const { error } = await getSupabase().auth.verifyOtp({ email: value.trim(), token: code, type: "email" });
    if (error) {
      setSubmitting(false);
      setErrors({ code: "El código no es válido o ya expiró." });
      return;
    }
    try {
      router.replace(await routeAfterLogin());
    } catch (err) {
      setSubmitting(false);
      setErrors({ code: `Entraste, pero no pudimos cargar tu perfil: ${describeError(err)}` });
    }
  };

  // auto-submit once all boxes are filled
  useEffect(() => {
    if (step === "code" && code.length === LENGTH && !submitting) verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, step]);

  const setDigit = (index: number, raw: string) => {
    const numeric = raw.replace(/\D/g, "");
    setErrors({});
    if (!numeric) {
      setDigits((prev) => prev.map((digit, i) => (i === index ? "" : digit)));
      return;
    }
    setDigits((prev) => {
      const next = [...prev];
      for (let i = 0; i < numeric.length && index + i < LENGTH; i++) next[index + i] = numeric[i];
      return next;
    });
    inputs.current[Math.min(LENGTH - 1, index + numeric.length)]?.focus();
  };

  const onKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      if (digits[index]) {
        setDigits((prev) => prev.map((digit, i) => (i === index ? "" : digit)));
      } else if (index > 0) {
        setDigits((prev) => prev.map((digit, i) => (i === index - 1 ? "" : digit)));
        inputs.current[index - 1]?.focus();
      }
    } else if (event.key === "ArrowLeft" && index > 0) {
      inputs.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const resetCode = async () => {
    setDigits(Array(LENGTH).fill(""));
    setErrors({});
    setSeconds(RESEND_SECONDS);
    inputs.current[0]?.focus();
    const error = await requestCode();
    if (error) setErrors({ code: "No pudimos reenviar el código. Intenta en un momento." });
  };

  if (step === "email") {
    return (
      <form onSubmit={sendCode} className="space-y-3" noValidate>
        <Field
          label="Correo"
          htmlFor="otp-email"
          required
          error={errors.email}
          hint="Te enviamos un código de 6 dígitos. Funciona con cualquier correo."
        >
          <Input id="otp-email" type="email" autoComplete="email" value={value} onChange={(e) => setValue(e.target.value)} placeholder="tu@correo.com" />
        </Field>
        <Button type="submit" className="w-full" disabled={sending}>
          {sending ? "Enviando…" : "Enviar código"} <ArrowRight className="size-3.5" />
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); verify(); }} className="space-y-3" noValidate>
      <p className="text-caption text-muted-foreground">
        Enviamos un código a <span className="font-medium text-foreground">{value}</span>.
      </p>

      <div>
        <div className="flex gap-2" role="group" aria-label="Código de 6 dígitos">
          {digits.map((digit, index) => (
            <Input
              key={index}
              ref={(el) => { inputs.current[index] = el; }}
              value={digit}
              onChange={(e) => setDigit(index, e.target.value)}
              onKeyDown={(e) => onKeyDown(index, e)}
              onPaste={(e) => { e.preventDefault(); setDigit(index, e.clipboardData.getData("text")); }}
              inputMode="numeric"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              maxLength={LENGTH}
              aria-label={`Dígito ${index + 1}`}
              aria-invalid={errors.code ? true : undefined}
              className="h-12 min-w-0 flex-1 px-0 text-center text-h2 aria-invalid:border-destructive"
            />
          ))}
        </div>
        {errors.code ? (
          <p className="mt-1.5 text-caption text-destructive-light" role="alert">{errors.code}</p>
        ) : (
          <p className="mt-1.5 text-caption text-muted-foreground">Revisa tu bandeja de entrada y spam.</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={code.length !== LENGTH || submitting}>
        {submitting ? "Entrando…" : "Entrar"} <ArrowRight className="size-3.5" />
      </Button>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => { setStep("email"); setDigits(Array(LENGTH).fill("")); setErrors({}); }}
          className="text-caption text-muted-foreground transition-colors hover:text-foreground"
        >
          Usar otro correo
        </button>
        <button
          type="button"
          onClick={resetCode}
          disabled={seconds > 0}
          className="text-caption text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
        >
          {seconds > 0 ? `Reenviar en ${seconds}s` : "Reenviar código"}
        </button>
      </div>
    </form>
  );
}
