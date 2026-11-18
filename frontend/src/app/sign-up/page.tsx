import { Suspense } from "react";
import { AuthScreen } from "@/components/auth-screen";

// Suspense es obligatorio en Next.js cuando un componente usa useSearchParams.
export default function SignUpPage() {
  return (
    <Suspense>
      <AuthScreen mode="signup" />
    </Suspense>
  );
}
