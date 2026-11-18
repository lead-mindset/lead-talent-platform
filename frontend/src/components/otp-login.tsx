"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/form";
import { buildValidate, email, required } from "@/lib/validators";
import { login } from "@/lib/session";

const validateEmail = buildValidate({ email: [required("Escribe tu correo"), email()] });

const LENGTH = 6;
const RESEND_SECONDS = 30;

/** Email OTP login: enter email → 6-digit code. Dummy, no backend. */
export function OtpLogin({ route = "/inicio" }: { route?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [value, setValue] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(""));
  const [errors, setErrors] = useState<{ email?: string; code?: string }>({});
  const [seconds, setSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);
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

  const sendCode = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateEmail({ email: value });
    setErrors(err as { email?: string });
    if (Object.keys(err).length === 0) {
      setDigits(Array(LENGTH).fill(""));
      setErrors({});
      setStep("code");
    }
  };

  const verify = () => {
    if (code.length !== LENGTH) {
      setErrors({ code: "El código tiene 6 dígitos" });
      return;
    }
    setSubmitting(true);
    login(value);
    router.push(route);
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

  const resetCode = () => {
    setDigits(Array(LENGTH).fill(""));
    setErrors({});
    setSeconds(RESEND_SECONDS);
    inputs.current[0]?.focus();
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
        <Button type="submit" className="w-full">
          Enviar código <ArrowRight className="size-3.5" />
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
          <p className="mt-1.5 text-caption text-muted-foreground">demo: 123456 (sin backend)</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={code.length !== LENGTH}>
        Entrar <ArrowRight className="size-3.5" />
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
