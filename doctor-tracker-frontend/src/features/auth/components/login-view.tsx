"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, Eye, EyeOff, Loader2, Stethoscope } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { FormField } from "@/components/forms/form-field";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APP_NAME, ROUTES } from "@/constants/app";
import { useCurrentUser, useLogin } from "@/features/auth/hooks/use-auth";
import { loginSchema, type LoginFormValues } from "@/features/auth/schemas";
import { hasFieldErrors, isApiError, splitFieldErrors } from "@/lib/api-error";
import { safeNextPath } from "@/lib/url-filters";

/** Maps a failed login to the one message shown inline (never a toast: the form is the context). */
function loginErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.code === "INVALID_CREDENTIALS") return "Incorrect email or password.";
    if (error.code === "RATE_LIMITED") {
      return "Too many sign-in attempts. Please wait a few minutes before trying again.";
    }
    if (error.code === "NETWORK_ERROR") return "Can't reach the server. Check your connection and try again.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

export function LoginView() {
  const searchParams = useSearchParams();
  const destination = safeNextPath(searchParams.get("next"), ROUTES.dashboard);

  const { data: user } = useCurrentUser();
  const login = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
    defaultValues: { email: "", password: "" },
  });

  // Already signed in (or just signed in): leave the login page. This is a full document
  // navigation on purpose: Next.js keeps visited routes mounted (hidden) for back/forward,
  // and the typed password must not live on in a hidden form after sign-in.
  useEffect(() => {
    if (user) window.location.replace(destination);
  }, [user, destination]);

  const isBusy = login.isPending || Boolean(user);

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    login.mutate(
      { email: values.email.toLowerCase(), password: values.password },
      {
        onError: (error) => {
          if (hasFieldErrors(error)) {
            const { fieldErrors } = splitFieldErrors(error, ["email", "password"] as const);
            const entries = Object.entries(fieldErrors) as ["email" | "password", string][];
            entries.forEach(([field, message]) => setError(field, { type: "server", message }));
            if (entries.length > 0) return;
          }
          setFormError(loginErrorMessage(error));
          setFocus("password");
        },
      },
    );
  });

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span
            aria-hidden="true"
            className="inline-flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground"
          >
            <Stethoscope className="size-5" strokeWidth={1.75} />
          </span>
          <span className="text-base font-semibold">{APP_NAME}</span>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">Use your admin account.</p>

          <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4" aria-busy={isBusy}>
            <FormField id="login-email" label="Email" required error={errors.email?.message}>
              {(control) => (
                <Input
                  {...control}
                  {...register("email")}
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  autoFocus
                  placeholder="admin@example.com"
                  className="h-10 md:h-9"
                />
              )}
            </FormField>

            <FormField id="login-password" label="Password" required error={errors.password?.message}>
              {(control) => (
                <div className="relative">
                  <Input
                    {...control}
                    {...register("password")}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className="h-10 pr-11 md:h-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute top-1/2 right-0.5 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:size-8"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" aria-hidden="true" />
                    ) : (
                      <Eye className="size-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              )}
            </FormField>

            {formError ? (
              <Alert variant="destructive">
                <CircleAlert aria-hidden="true" />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}

            <Button type="submit" className="h-10 w-full md:h-9" disabled={isBusy}>
              {isBusy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              Sign in
              {isBusy ? <span className="sr-only"> (signing in)</span> : null}
            </Button>
          </form>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1 text-xs text-muted-foreground">
          <span>&copy; 2026 {APP_NAME} · Authorised administrators only</span>
          <ThemeSwitcher />
        </div>
      </div>
    </main>
  );
}

export function LoginSkeleton() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4" aria-busy="true">
      <span className="sr-only" role="status">
        Loading sign-in
      </span>
      <div className="h-[420px] w-full max-w-sm animate-pulse rounded-lg border bg-card" />
    </main>
  );
}
