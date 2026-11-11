/**
 * Placeholder legal copy. It shows the layout only and is not legal advice; have it
 * reviewed and replaced by qualified counsel before the site goes live.
 */

export type LegalSection = { id: string; title: string; paragraphs: readonly string[]; list?: readonly string[] };

export type LegalDocumentContent = {
  title: string;
  summary: string;
  lastUpdated: string;
  sections: readonly LegalSection[];
};

export const PRIVACY_POLICY: LegalDocumentContent = {
  title: "Privacy policy",
  summary: "How Doctor Tracker collects, uses and protects information.",
  lastUpdated: "11 Nov 2026",
  sections: [
    {
      id: "introduction",
      title: "Introduction",
      paragraphs: [
        "This privacy policy explains how Doctor Tracker (\"we\", \"us\") handles information when you visit this website or use the Doctor Tracker platform. It applies to administrators who use the platform and to visitors of this site.",
      ],
    },
    {
      id: "information-we-collect",
      title: "Information we collect",
      paragraphs: ["We collect only the information needed to provide the service. This may include:"],
      list: [
        "Account information such as name and email address of administrators.",
        "Records entered by your organisation, such as doctor and patient details.",
        "Messages you send us through the contact form.",
        "Basic technical information such as browser type, used to keep the service secure.",
      ],
    },
    {
      id: "how-we-use",
      title: "How we use information",
      paragraphs: [
        "We use information to operate and secure the platform, to respond to enquiries and to improve the service. We do not sell personal information.",
      ],
    },
    {
      id: "sharing",
      title: "Sharing and disclosure",
      paragraphs: [
        "We share information only with service providers who help us run the platform under written agreements, when your organisation instructs us to, or where the law requires it.",
      ],
    },
    {
      id: "retention",
      title: "Data retention",
      paragraphs: [
        "Records are kept for as long as your organisation's account is active, or as required by applicable law. Your organisation can request deletion at any time.",
      ],
    },
    {
      id: "security",
      title: "Security",
      paragraphs: [
        "We use access controls, encrypted connections and session management to protect information. No system is completely secure, and we will notify affected organisations of incidents as required by law.",
      ],
    },
    {
      id: "your-rights",
      title: "Your rights",
      paragraphs: [
        "Depending on where you live, you may have the right to access, correct or delete your personal information, or to object to certain processing. Contact us to exercise these rights.",
      ],
    },
    {
      id: "changes",
      title: "Changes to this policy",
      paragraphs: [
        "We may update this policy from time to time. The date at the top of this page shows when it was last changed.",
      ],
    },
    {
      id: "contact",
      title: "Contact us",
      paragraphs: ["Questions about this policy can be sent through our contact page or to our privacy team by email."],
    },
  ],
};

export const TERMS: LegalDocumentContent = {
  title: "Terms & conditions",
  summary: "The terms that govern use of the Doctor Tracker website and platform.",
  lastUpdated: "11 Nov 2026",
  sections: [
    {
      id: "acceptance",
      title: "Acceptance of terms",
      paragraphs: [
        "By accessing this website or using the Doctor Tracker platform, you agree to these terms. If you use the platform on behalf of an organisation, you confirm that you are authorised to accept them for that organisation.",
      ],
    },
    {
      id: "service",
      title: "Description of the service",
      paragraphs: [
        "Doctor Tracker is an administrative tool for organising doctors, patients and practice analytics. It does not provide medical advice, diagnosis or treatment, and it is not a substitute for clinical judgement.",
      ],
    },
    {
      id: "accounts",
      title: "Accounts and access",
      paragraphs: ["You are responsible for keeping your credentials secure and for activity under your account. You agree to:"],
      list: [
        "Provide accurate account information.",
        "Restrict access to authorised staff only.",
        "Tell us promptly about any unauthorised use.",
      ],
    },
    {
      id: "acceptable-use",
      title: "Acceptable use",
      paragraphs: [
        "You must not misuse the platform, attempt to access it by unauthorised means, interfere with its operation, or use it to store information you do not have the right to process.",
      ],
    },
    {
      id: "data",
      title: "Your data",
      paragraphs: [
        "Your organisation retains ownership of the records it enters. We process them only to provide the service, as described in our privacy policy.",
      ],
    },
    {
      id: "availability",
      title: "Availability and changes",
      paragraphs: [
        "We aim to keep the platform available but do not guarantee uninterrupted access. We may change or discontinue features, and will give reasonable notice of material changes.",
      ],
    },
    {
      id: "liability",
      title: "Limitation of liability",
      paragraphs: [
        "To the extent permitted by law, we are not liable for indirect or consequential losses arising from use of the platform. Nothing in these terms limits liability that cannot be limited by law.",
      ],
    },
    {
      id: "termination",
      title: "Termination",
      paragraphs: [
        "Either party may end use of the service in line with the applicable agreement. On termination we will make your data available for export for a reasonable period before deletion.",
      ],
    },
    {
      id: "governing-law",
      title: "Governing law",
      paragraphs: ["These terms are governed by the laws of the jurisdiction stated in your organisation's agreement with us."],
    },
  ],
};
