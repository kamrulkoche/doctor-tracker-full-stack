import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginSkeleton, LoginView } from "@/features/auth/components/login-view";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the Doctor Tracker admin console.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginView />
    </Suspense>
  );
}
