import { CalendarClock, HeartPulse, Stethoscope } from "lucide-react";
import type { Metadata } from "next";

import {
  CtaBanner,
  IconTile,
  PageHero,
  StatusBadge,
  StepList,
} from "@/features/marketing/components/building-blocks";
import { Section, SectionHeading } from "@/features/marketing/components/section";
import {
  BOOKING_STEPS,
  DOCTOR_WORKFLOW,
  PATIENT_WORKFLOW,
  PLATFORM_STEPS,
} from "@/features/marketing/content/pages";

export const metadata: Metadata = {
  title: "How it works",
  description: "The Doctor Tracker workflow for administrators, doctors and patients, step by step.",
};

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        eyebrow="How it works"
        title="A simple workflow your whole team can follow"
        description="Doctor Tracker mirrors how a practice is already organised: doctors, the patients assigned to them, and the numbers that describe both."
      />

      <Section labelledBy="platform-title">
        <SectionHeading
          id="platform-title"
          eyebrow="Platform workflow"
          title="Up and running in four steps"
          description="Administrators set up the workspace once. From then on the dashboard keeps itself current."
        />
        <div className="mt-14">
          <StepList steps={PLATFORM_STEPS} />
        </div>
      </Section>

      <Section tone="muted" labelledBy="workflows-title">
        <SectionHeading
          id="workflows-title"
          eyebrow="Workflows"
          title="How records move through the platform"
        />
        <div className="mt-12 grid gap-4 lg:grid-cols-2">
          {[
            { id: "doctor-flow", icon: Stethoscope, title: "Doctor workflow", steps: DOCTOR_WORKFLOW },
            { id: "patient-flow", icon: HeartPulse, title: "Patient workflow", steps: PATIENT_WORKFLOW },
          ].map((flow) => (
            <article key={flow.id} className="rounded-lg border bg-card p-6 md:p-8" aria-labelledby={flow.id}>
              <div className="flex items-center gap-3">
                <IconTile icon={flow.icon} />
                <h3 id={flow.id} className="text-lg font-semibold">
                  {flow.title}
                </h3>
              </div>
              <div className="mt-8">
                <StepList steps={flow.steps} layout="vertical" headingLevel="h4" />
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section labelledBy="booking-title">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
          <div>
            <div className="flex items-center gap-3">
              <IconTile icon={CalendarClock} />
              <StatusBadge status="planned" />
            </div>
            <h2 id="booking-title" className="mt-5 text-2xl font-semibold tracking-tight md:text-3xl">
              Appointment booking
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Appointment management is on our roadmap. This is the booking flow we are designing; it is not
              available in the product yet.
            </p>
          </div>
          <div className="rounded-lg border border-dashed bg-card p-6 md:p-8">
            <StepList steps={BOOKING_STEPS} layout="vertical" />
          </div>
        </div>
      </Section>

      <CtaBanner />
    </>
  );
}
