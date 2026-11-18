"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, GraduationCap, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import { OtpLogin } from "@/components/otp-login";
import { LoginDivider, SocialLogin } from "@/components/social-login";
import { useAuth } from "@/lib/auth";
import { features } from "@/lib/features";
import { routeAfterLogin } from "@/lib/api";

/** Si ya hay sesión, salta el login. Devuelve si hay que pedir confirmar el correo. */
function useSkipIfSignedIn(): boolean {
  const auth = useAuth();
  const router = useRouter();
  // Reactivo: si ya estás en /login y la app navega a /login?confirmar=1, el aviso aparece igual.
  const mustConfirm = useSearchParams().get("confirmar") === "1";

  useEffect(() => {
    if (auth.status === "signed-in" && !mustConfirm) {
      routeAfterLogin().then((to) => router.replace(to)).catch(() => {});
    }
  }, [auth.status, mustConfirm, router]);

  return mustConfirm;
}

/** Separador "o" y botón de Google. Con NEXT_PUBLIC_AUTH_GOOGLE_ENABLED apagado no se muestra nada. */
function GoogleOption({ label }: { label: string }) {
  if (!features.authGoogle) return null;
  return (
    <>
      <LoginDivider label="o" />
      <SocialLogin label={label} />
    </>
  );
}

function ConfirmBanner() {
  return (
    <div className="mt-6 rounded-xl border border-brand-purple-light/40 bg-brand-purple/5 p-4 text-small">
      Confirma tu correo para continuar. Revisa tu bandeja de entrada.
    </div>
  );
}

function EmailTip() {
  return (
    <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/30 p-4 text-caption text-muted-foreground">
      <Info className="mt-0.5 size-4 shrink-0 text-brand-purple-light" />
      <p>
        <span className="font-medium text-foreground">Entra con tu correo.</span> El código de 6 dígitos funciona con
        cualquier correo: institucional, Microsoft o personal.
        {features.authGoogle && " Google queda como atajo para quien lo tenga."}
      </p>
    </div>
  );
}

/**
 * Login y registro usan el mismo flujo (código por correo y, si está encendido, Google): si la
 * cuenta no existe, se crea. Solo cambia el texto. Así nunca revelamos qué correos existen.
 */
export function AuthScreen({ mode }: { mode: "login" | "signup" }) {
  const mustConfirm = useSkipIfSignedIn();

  if (mode === "signup") {
    return (
      <div className="mx-auto w-full max-w-md flex-1 px-6 py-12">
        <div className="text-center">
          <BrandMark className="mx-auto block h-10" />
          <h1 className="mt-4 text-h1 font-bold tracking-tight">Crea tu perfil</h1>
          <p className="mx-auto mt-2 max-w-sm text-small text-muted-foreground">
            Te enviamos un código a tu correo y armamos tu perfil en 2 minutos.
          </p>
        </div>
        {mustConfirm && <ConfirmBanner />}
        <div className="card-surface mt-8 rounded-xl border border-border/60 p-6">
          <OtpLogin />
          <GoogleOption label="Registrarme" />
        </div>
        <p className="mt-6 text-center text-small text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-medium text-brand-purple-light underline-offset-4 hover:underline">
            Inicia sesión
          </Link>
        </p>
        <EmailTip />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <div className="text-center">
        <BrandMark className="mx-auto block h-10" />
        <h1 className="mt-4 text-h1 font-bold tracking-tight">Bienvenida a LEAD</h1>
        <p className="mx-auto mt-2 max-w-md text-small text-muted-foreground">
          Inicia sesión o crea tu perfil en 2 minutos. Las empresas te encuentran por tus skills.
        </p>
      </div>

      {mustConfirm && <ConfirmBanner />}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="card-surface flex flex-col justify-between rounded-xl border border-brand-purple-light/40 bg-brand-purple/5 p-6">
          <div>
            <GraduationCap className="size-6 text-brand-purple-light" />
            <p className="mt-3 font-semibold">¿Eres estudiante?</p>
            <p className="mt-1 text-caption text-muted-foreground">
              Arma tu perfil con tus skills, proyectos y experiencia. Las empresas te buscan por eso.
            </p>
          </div>
          <Button asChild className="mt-4">
            <Link href="/sign-up">
              Crear mi perfil <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>

        <div className="card-surface rounded-xl border border-border/60 p-6">
          <p className="font-semibold">¿Ya tienes cuenta?</p>
          <p className="mt-1 text-caption text-muted-foreground">Inicia sesión para entrar a tu perfil.</p>
          <div className="mt-4">
            <OtpLogin />
            <GoogleOption label="Entrar" />
          </div>
        </div>
      </div>

      <EmailTip />
    </div>
  );
}
