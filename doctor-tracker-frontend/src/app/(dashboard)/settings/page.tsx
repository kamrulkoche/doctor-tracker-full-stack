import type { Metadata } from "next";

import { SettingsView } from "@/features/auth/components/settings-view";

// Rendered behind the client-side auth gate of the (dashboard) layout; see the note there.
export const instant = false;

export const metadata: Metadata = {
  title: "Settings",
  description: "Your profile, theme preference and session.",
};

export default function SettingsPage() {
  return <SettingsView />;
}
