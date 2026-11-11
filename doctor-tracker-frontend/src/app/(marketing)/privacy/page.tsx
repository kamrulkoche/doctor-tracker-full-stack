import type { Metadata } from "next";

import { LegalDocument } from "@/features/marketing/components/legal-document";
import { PRIVACY_POLICY } from "@/features/marketing/content/legal";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: PRIVACY_POLICY.summary,
};

export default function PrivacyPage() {
  return <LegalDocument content={PRIVACY_POLICY} />;
}
