import type { Metadata } from "next";

import { HomeView } from "@/features/marketing/views/home-view";

export const metadata: Metadata = {
  title: { absolute: "Doctor Tracker · Doctor and patient management for healthcare teams" },
  description:
    "Doctor Tracker keeps your doctors, their patients and your practice analytics in one clear, accessible workspace.",
};

export default function HomePage() {
  return <HomeView />;
}
