import { Eye, Target } from "lucide-react";
import type { Metadata } from "next";

import { CtaBanner, IconTile, PageHero } from "@/features/marketing/components/building-blocks";
import { Section, SectionHeading } from "@/features/marketing/components/section";
import { MISSION, TEAM, VALUES, WHY_CHOOSE } from "@/features/marketing/content/pages";

export const metadata: Metadata = {
  title: "About us",
  description: "Why we built Doctor Tracker, what we value and the team behind it.",
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About us"
        title="We help healthcare teams know who is caring for whom"
        description="Doctor Tracker started from a simple observation: clinic administrators spend too much time reconciling spreadsheets to answer basic questions about doctors and their patients. We built a focused workspace that answers them at a glance."
      />

      <Section labelledBy="mission-title">
        <h2 id="mission-title" className="sr-only">
          Mission and vision
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { icon: Target, label: "Our mission", text: MISSION.mission },
            { icon: Eye, label: "Our vision", text: MISSION.vision },
          ].map((block) => (
            <div key={block.label} className="rounded-lg border bg-card p-6 md:p-8">
              <IconTile icon={block.icon} />
              <h3 className="mt-5 text-sm font-medium text-primary">{block.label}</h3>
              <p className="mt-3 text-lg leading-relaxed text-pretty md:text-xl md:leading-relaxed">{block.text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="muted" labelledBy="values-title">
        <SectionHeading
          id="values-title"
          eyebrow="Core values"
          title="The principles behind every decision"
        />
        <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((value) => (
            <div key={value.title}>
              <IconTile icon={value.icon} />
              <h3 className="mt-4 text-base font-semibold">{value.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{value.description}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section labelledBy="why-title">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
          <SectionHeading
            id="why-title"
            eyebrow="Why Doctor Tracker"
            title="A tool that does a few things very well"
            description="We would rather be the best way to manage doctors and patients than an average version of everything."
            align="left"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {WHY_CHOOSE.map((item) => (
              <div key={item.title} className="rounded-lg border bg-card p-5">
                <item.icon className="size-5 text-primary" strokeWidth={1.75} aria-hidden="true" />
                <h3 className="mt-4 text-sm font-semibold">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section tone="muted" labelledBy="team-title">
        <SectionHeading
          id="team-title"
          eyebrow="Our team"
          title="The people building Doctor Tracker"
          description="A small team across product, engineering, design and support. Profiles are placeholders until team details are published."
        />
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TEAM.map((member) => (
            <li key={member.role} className="rounded-lg border bg-card p-6 text-center">
              <span
                className="mx-auto flex size-16 items-center justify-center rounded-full bg-accent text-lg font-semibold text-accent-foreground"
                aria-hidden="true"
              >
                {member.initials}
              </span>
              <h3 className="mt-4 text-base font-semibold">{member.name}</h3>
              <p className="text-sm text-primary">{member.role}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{member.bio}</p>
            </li>
          ))}
        </ul>
      </Section>

      <CtaBanner title="Want to work with us?" description="Tell us about your practice and what you need from a platform." />
    </>
  );
}
