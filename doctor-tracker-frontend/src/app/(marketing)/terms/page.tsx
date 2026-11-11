import type { Metadata } from "next";

import { LegalDocument } from "@/features/marketing/components/legal-document";
import { TERMS } from "@/features/marketing/content/legal";

export const metadata: Metadata = {
  title: "Terms & conditions",
  description: TERMS.summary,
};

export default function TermsPage() {
  return <LegalDocument content={TERMS} />;
}
