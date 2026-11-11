export type FaqItem = { id: string; question: string; answer: string };
export type FaqCategory = { id: string; title: string; items: readonly FaqItem[] };

export const FAQ_CATEGORIES: readonly FaqCategory[] = [
  {
    id: "general",
    title: "General",
    items: [
      {
        id: "what-is",
        question: "What is Doctor Tracker?",
        answer:
          "Doctor Tracker is an administration platform for healthcare teams. It keeps a directory of doctors, the patients assigned to each of them, and a dashboard that shows how the practice is growing.",
      },
      {
        id: "who-for",
        question: "Who is it designed for?",
        answer:
          "Clinic administrators, practice managers and operations staff who need to organise doctors and patients across one or more hospitals or clinics.",
      },
      {
        id: "devices",
        question: "Does it work on tablets and phones?",
        answer:
          "Yes. Every screen is responsive. On smaller screens tables become stacked cards and the navigation moves into a menu, so nothing requires horizontal scrolling.",
      },
    ],
  },
  {
    id: "features",
    title: "Features",
    items: [
      {
        id: "available",
        question: "Which features are available today?",
        answer:
          "Doctor management, patient management, dashboard analytics and search with filtering are available now. Appointments, structured medical records and prescriptions are on the roadmap and are labelled as planned on the Features page.",
      },
      {
        id: "reassign",
        question: "Can a patient be moved to another doctor?",
        answer:
          "Yes. A patient can be reassigned in one step from their record. Their details stay intact and both doctors' patient counts update automatically.",
      },
      {
        id: "reports",
        question: "What does the dashboard show?",
        answer:
          "Totals for doctors and patients, patient growth over a chosen date range and interval, patients per doctor, condition distribution and a feed of recent activity.",
      },
    ],
  },
  {
    id: "security",
    title: "Security and privacy",
    items: [
      {
        id: "access",
        question: "Who can see the data?",
        answer:
          "Only signed-in administrators. Every page in the console is protected, and the session ends when the user signs out or the session expires.",
      },
      {
        id: "storage",
        question: "Where is data stored?",
        answer:
          "This depends on how your organisation deploys the platform. Contact us for details about hosting options and data residency.",
      },
      {
        id: "compliance",
        question: "Is Doctor Tracker certified for a specific regulation?",
        answer:
          "We do not claim any certification on this site. If your organisation has regulatory requirements, contact us and we will walk through them with you before you adopt the platform.",
      },
    ],
  },
  {
    id: "account",
    title: "Account and support",
    items: [
      {
        id: "get-started",
        question: "How do we get started?",
        answer:
          "Contact us through the form on the Contact page. We will set up your workspace and an administrator account, then help you add your first doctors and patients.",
      },
      {
        id: "support",
        question: "How do I get help?",
        answer:
          "Email our support team or use the contact form. We reply during business hours, listed on the Contact page.",
      },
      {
        id: "dark-mode",
        question: "Is there a dark mode?",
        answer: "Yes. Switch between light and dark themes at any time from the header.",
      },
    ],
  },
];

/** Shown on the home page; the FAQ page lists everything. */
export const HOME_FAQ: readonly FaqItem[] = [
  FAQ_CATEGORIES[0].items[0],
  FAQ_CATEGORIES[1].items[0],
  FAQ_CATEGORIES[1].items[1],
  FAQ_CATEGORIES[2].items[0],
  FAQ_CATEGORIES[3].items[0],
];
