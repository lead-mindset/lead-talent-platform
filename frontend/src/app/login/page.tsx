import { Suspense } from "react";
import { AuthScreen } from "@/components/auth-screen";

// Suspense es obligatorio en Next.js cuando un componente usa useSearchParams.
export default function LoginPage() {
  return (
    <Suspense>
      <AuthScreen mode="login" />
    </Suspense>
  );
}
