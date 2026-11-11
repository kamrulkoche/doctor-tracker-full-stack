"use client";

import { Loader2, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { THEME_OPTIONS } from "@/components/layout/theme-switcher";
import { DetailList } from "@/components/shared/detail-list";
import { EntityAvatar } from "@/components/shared/entity-avatar";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useCurrentUser, useLogout } from "@/features/auth/hooks/use-auth";
import { getErrorMessage } from "@/lib/api-error";

const noopSubscribe = () => () => {};

/** Small but real: profile from `GET /auth/me`, theme preference, sign out. */
export function SettingsView() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const { theme, setTheme } = useTheme();
  // The stored theme is only known in the browser; avoid marking the wrong option on first paint.
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  return (
    <div className="max-w-3xl space-y-4 md:space-y-6">
      <PageHeader title="Settings" description="Your account and display preferences." />

      <section aria-labelledby="settings-profile" className="rounded-lg border bg-card p-4 md:p-5">
        <h2 id="settings-profile" className="text-base font-semibold">
          Profile
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Admin accounts are provisioned by the system owner and cannot be edited here.
        </p>
        {user ? (
          <>
            <div className="mt-4 flex items-center gap-3">
              <EntityAvatar name={user.name} size="lg" className="size-12 text-base" />
              <div className="grid min-w-0">
                <span className="truncate text-sm font-medium">{user.name}</span>
                <span className="truncate text-sm text-muted-foreground">{user.email}</span>
              </div>
            </div>
            <DetailList
              className="mt-4"
              columns={2}
              items={[
                { label: "Name", value: user.name },
                { label: "Email", value: <span className="break-all">{user.email}</span> },
                { label: "Role", value: <span className="capitalize">{user.role}</span> },
                { label: "User ID", value: <span className="font-mono text-xs">{user.id}</span> },
              ]}
            />
          </>
        ) : null}
      </section>

      <section aria-labelledby="settings-appearance" className="rounded-lg border bg-card p-4 md:p-5">
        <h2 id="settings-appearance" className="text-base font-semibold">
          Appearance
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose how Doctor Tracker looks on this device. The choice is remembered in this browser.
        </p>
        <ToggleGroup
          type="single"
          variant="outline"
          spacing={0}
          value={hydrated ? (theme ?? "light") : ""}
          onValueChange={(value) => {
            if (value) setTheme(value);
          }}
          aria-label="Theme"
          className="mt-4"
        >
          {THEME_OPTIONS.map((option) => (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              className="h-10 gap-2 px-4 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground md:h-9"
            >
              <option.icon className="size-4" aria-hidden="true" />
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </section>

      <section aria-labelledby="settings-session" className="rounded-lg border bg-card p-4 md:p-5">
        <h2 id="settings-session" className="text-base font-semibold">
          Session
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Signing out ends your session on this device. You will need your password to sign in again.
        </p>
        <Button
          variant="outline"
          className="mt-4 h-10 text-destructive hover:text-destructive md:h-9"
          disabled={logout.isPending}
          onClick={() =>
            logout.mutate(undefined, {
              onError: (error) =>
                toast.error("Couldn't sign out", { description: getErrorMessage(error), duration: 6000 }),
            })
          }
        >
          {logout.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <LogOut className="size-4" aria-hidden="true" />
          )}
          Sign out
        </Button>
      </section>
    </div>
  );
}
