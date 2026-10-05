"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/form";
import { buildValidate, email, required } from "@/lib/validators";

const validateEmail = buildValidate({ email: [required("Escribe tu correo"), email()] });

/** Email OTP login (proposed): enter email → 6-digit code. Dummy, no backend. */
export function OtpLogin({ route = "/inicio" }: { route?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [value, setValue] = useState("");
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<{ email?: string; code?: string }>({});

  const sendCode = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateEmail({ email: value });
    setErrors(err as { email?: string });
    if (Object.keys(err).length === 0) setStep("code");
  };

  const verify = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.replace(/\s/g, "").length !== 6) {
      setErrors({ code: "El código tiene 6 dígitos" });
      return;
    }
    router.push(route);
  };

  if (step === "email") {
    return (
      <form onSubmit={sendCode} className="space-y-3" noValidate>
        <Field label="Correo" htmlFor="otp-email" required error={errors.email}>
          <Input id="otp-email" type="email" autoComplete="email" value={value} onChange={(e) => setValue(e.target.value)} placeholder="tu@correo.com" />
        </Field>
        <Button type="submit" className="w-full">
          Enviar código <ArrowRight className="size-3.5" />
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="space-y-3" noValidate>
      <p className="text-caption text-muted-foreground">
        Enviamos un código a <span className="font-medium text-foreground">{value}</span>.
      </p>
      <Field label="Código" htmlFor="otp-code" required error={errors.code} hint="demo: 123456 (sin backend)">
        <Input id="otp-code" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" />
      </Field>
      <Button type="submit" className="w-full">
        Entrar <ArrowRight className="size-3.5" />
      </Button>
      <button type="button" onClick={() => { setStep("email"); setCode(""); setErrors({}); }} className="w-full text-caption text-muted-foreground transition-colors hover:text-foreground">
        Usar otro correo
      </button>
    </form>
  );
}