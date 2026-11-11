import {
  BarChart3,
  Compass,
  Eye,
  HeartHandshake,
  Lock,
  Scale,
  Sparkles,
  Target,

  type LucideIcon,
} from "lucide-react";

/** Copy for the Home, About and How It Works pages. Placeholder content throughout. */

export type Step = { title: string; description: string };

export const PLATFORM_STEPS: readonly Step[] = [
  {
    title: "Set up your workspace",
    description: "An administrator signs in and lands on a dashboard ready to receive the first records.",
  },
  {
    title: "Add your doctors",
    description: "Create a profile for each doctor with specialization, hospital and contact details.",
  },
  {
    title: "Register patients",
    description: "Add patients and assign each one to a doctor, either from the patient list or a doctor's profile.",
  },
  {
    title: "Track and act",
    description: "Watch growth and workload on the dashboard, then rebalance by reassigning patients.",
  },
];

export const DOCTOR_WORKFLOW: readonly Step[] = [
  { title: "Profile created", description: "The administrator adds the doctor with specialization and hospital." },
  { title: "Patients assigned", description: "New and existing patients are linked to the doctor's profile." },
  { title: "Caseload visible", description: "The profile shows every assigned patient with search and filters." },
  { title: "Load balanced", description: "Patients can be reassigned when a caseload grows too large." },
];

export const PATIENT_WORKFLOW: readonly Step[] = [
  { title: "Record opened", description: "Name, condition and assigned doctor are captured; other fields are optional." },
  { title: "Details completed", description: "Age, gender, contact details and notes can be added at any time." },
  { title: "Care team updated", description: "A patient moves to another doctor without losing their record." },
  { title: "Included in reporting", description: "Each record feeds the growth and condition charts automatically." },
];

export const BOOKING_STEPS: readonly Step[] = [
  { title: "Choose a doctor", description: "Search by name or specialization and pick an available doctor." },
  { title: "Pick a time", description: "Select an open slot from the doctor's calendar." },
  { title: "Confirm details", description: "Review the visit reason and contact details before booking." },
  { title: "Get a reminder", description: "Receive a reminder ahead of the visit, with options to reschedule." },
];

export const BENEFITS = {
  doctors: {
    title: "For doctors and clinic teams",
    points: [
      "One place to see every assigned patient",
      "Less time hunting through spreadsheets",
      "Clear caseload numbers for planning",
      "Records that stay consistent between team members",
    ],
  },
  patients: {
    title: "For patients",
    points: [
      "Their information is entered once and kept up to date",
      "Smoother handovers when a patient changes doctor",
      "A care team that can find their record quickly",
      "Contact details handled with access controls",
    ],
  },
} as const;

/**
 * Illustrative testimonials. They are placeholders for the layout and are labelled as such
 * on the page; replace them with real, attributed quotes before launch.
 */
export const TESTIMONIALS: readonly { quote: string; role: string; organisation: string }[] = [
  {
    quote:
      "Having every doctor's caseload on one dashboard changed how we plan the week. Reassigning a patient takes seconds.",
    role: "Practice administrator",
    organisation: "Multi-specialty clinic",
  },
  {
    quote:
      "The filters are the part I use most. I can pull up every patient with a given condition under one doctor immediately.",
    role: "Operations lead",
    organisation: "Outpatient network",
  },
  {
    quote:
      "It looks and behaves the same on a tablet at the front desk as it does on my laptop. Training new staff was quick.",
    role: "Clinic manager",
    organisation: "Community health centre",
  },
];

export const MISSION = {
  mission:
    "To give healthcare teams a clear, dependable view of who is caring for whom, so administrative work takes less time and patients are never lost between doctors.",
  vision:
    "A calm, connected practice where every record is current, every caseload is visible and decisions are made from facts instead of guesswork.",
};

export const VALUES: readonly { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Lock,
    title: "Privacy by default",
    description: "Access is restricted to signed-in staff, and we collect only the data the work requires.",
  },
  {
    icon: Target,
    title: "Clarity over clutter",
    description: "Every screen leads with the number, the table or the chart that matters.",
  },
  {
    icon: HeartHandshake,
    title: "Built with clinicians",
    description: "Workflows follow how clinic teams actually organise doctors and patients.",
  },
  {
    icon: Scale,
    title: "Honest by design",
    description: "We describe what the product does today and label what is still on the roadmap.",
  },
];

export const WHY_CHOOSE: readonly { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Compass,
    title: "Fast to learn",
    description: "One consistent layout across every page means new staff are productive on day one.",
  },
  {
    icon: BarChart3,
    title: "Answers at a glance",
    description: "Growth, workload and condition trends are on the dashboard the moment you sign in.",
  },
  {
    icon: Eye,
    title: "Accessible everywhere",
    description: "Keyboard-friendly, screen-reader labelled and readable in light or dark mode.",
  },
  {
    icon: Sparkles,
    title: "Focused scope",
    description: "Doctors, patients and analytics done well, rather than a sprawling suite you half use.",
  },
];

/** Placeholder team: roles only, initials as avatars, no photographs of real people. */
export const TEAM: readonly { initials: string; name: string; role: string; bio: string }[] = [
  {
    initials: "TM",
    name: "Team member",
    role: "Product lead",
    bio: "Shapes the roadmap with clinic administrators and keeps the scope focused.",
  },
  {
    initials: "TM",
    name: "Team member",
    role: "Engineering lead",
    bio: "Owns the platform's reliability, security and data model.",
  },
  {
    initials: "TM",
    name: "Team member",
    role: "Design lead",
    bio: "Responsible for the interface, accessibility and the design system.",
  },
  {
    initials: "TM",
    name: "Team member",
    role: "Customer success",
    bio: "Helps new teams set up their workspace and import their first records.",
  },
];

