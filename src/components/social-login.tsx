"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { login } from "@/lib/session";

function GoogleG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.5 5.5 0 0 1-2.39 3.62v3h3.86c2.26-2.09 3.58-5.16 3.58-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.86-3c-1.08.72-2.45 1.15-4.08 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.63H1.29a12 12 0 0 0 0 10.74l3.98-3.09Z" />
      <path fill="#EA4335" d="M12 4.76c1.76 0 3.34.6 4.58 1.79l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.29 6.63l3.98 3.09C6.22 6.87 8.87 4.76 12 4.76Z" />
    </svg>
  );
}

export function SocialLogin({ route, label = "Continuar" }: { route: string; label?: string }) {
  const router = useRouter();
  const go = () => { login(); router.push(route); };

  return (
    <Button type="button" variant="outline" className="w-full gap-2.5 font-medium" onClick={go}>
      <GoogleG className="size-4 shrink-0" /> {label} con Google
    </Button>
  );
}

export function LoginDivider() {
  return (
    <div className="my-4 flex items-center gap-3">
      <span className="h-px flex-1 bg-border/60" />
      <span className="text-caption text-muted-foreground">o con tu correo</span>
      <span className="h-px flex-1 bg-border/60" />
    </div>
  );
}