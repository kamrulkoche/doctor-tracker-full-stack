import type { Metadata } from "next";

import {
  CheckList,
  CtaBanner,
  IconTile,
  PageHero,
  StatusBadge,
} from "@/features/marketing/components/building-blocks";
import { DashboardPreview } from "@/features/marketing/components/dashboard-preview";
import { Container, Section, SectionHeading } from "@/features/marketing/components/section";
import { FEATURES } from "@/features/marketing/content/site";

export const metadata: Metadata = {
  title: "Features",
  description: "Doctor management, patient management, dashboard analytics, search and filtering, and what's next.",
};

const available = FEATURES.filter((feature) => feature.status === "available");
const planned = FEATURES.filter((feature) => feature.status === "planned");

export default function FeaturesPage() {
  return (
    <>
      <PageHero
        eyebrow="Features"
        title="Focused tools for running a practice"
        description="Doctor Tracker covers the core of practice administration today and is growing into scheduling and clinical records. Each feature below is labelled so you know exactly what is available now."
      >
        <nav aria-label="Features on this page">
          <ul className="flex flex-wrap gap-2">
            {FEATURES.map((feature) => (
              <li key={feature.id}>
                <a
                  href={`#${feature.id}`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-card px-3 text-sm text-muted-foreground transition-colors duration-150 hover:border-primary/40 hover:text-foreground"
                >
                  <feature.icon className="size-3.5" aria-hidden="true" />
                  {feature.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </PageHero>

      <section aria-labelledby="available-title" className="py-16 md:py-24">
        <Container>
          <SectionHeading
            id="available-title"
            eyebrow="Available now"
            title="Built and in daily use"
            align="left"
          />
          <div className="mt-12 grid gap-16 md:gap-20">
            {available.map((feature, index) => (
              <article
                key={feature.id}
                id={feature.id}
                aria-labelledby={`${feature.id}-title`}
                className="grid scroll-mt-24 items-center gap-8 lg:grid-cols-2 lg:gap-16"
              >
                <div className={index % 2 === 1 ? "lg:order-2" : undefined}>
                  <div className="flex items-center gap-3">
                    <IconTile icon={feature.icon} />
                    <StatusBadge status={feature.status} />
                  </div>
                  <h3 id={`${feature.id}-title`} className="mt-5 text-xl font-semibold tracking-tight md:text-2xl">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-base leading-relaxed text-muted-foreground">{feature.summary}</p>
                  <CheckList items={feature.points} className="mt-6" />
                </div>
                <FeatureVisual id={feature.id} />
              </article>
            ))}
          </div>
        </Container>
      </section>

      <Section tone="muted" labelledBy="planned-title">
        <SectionHeading
          id="planned-title"
          eyebrow="On the roadmap"
          title="What we are building next"
          description="These modules are planned and not yet available. Scope may change as we work with clinic teams."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {planned.map((feature) => (
            <article
              key={feature.id}
              id={feature.id}
              aria-labelledby={`${feature.id}-title`}
              className="flex scroll-mt-24 flex-col rounded-lg border border-dashed bg-card p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <IconTile icon={feature.icon} className="bg-secondary text-secondary-foreground" />
                <StatusBadge status={feature.status} />
              </div>
              <h3 id={`${feature.id}-title`} className="mt-5 text-base font-semibold">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.summary}</p>
              <CheckList items={feature.points} className="mt-5" />
            </article>
          ))}
        </div>
      </Section>

      <CtaBanner title="See it with your own data" description="We will set up a workspace and walk your team through it." />
    </>
  );
}

/** A small token-built illustration per feature; the dashboard reuses the full preview. */
function FeatureVisual({ id }: { id: string }) {
  if (id === "analytics") return <DashboardPreview />;

  const frame = "rounded-xl border bg-card p-4 md:p-5";

  if (id === "search") {
    return (
      <div className={frame} role="img" aria-label="Illustration of a search box with active filter chips">
        <div aria-hidden="true">
          <div className="flex h-9 items-center rounded-md border bg-background px-3 text-sm text-muted-foreground">
            Search patients…
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {["Condition: Asthma", "Gender: Female", "Doctor: Dr. Sample"].map((chip) => (
              <span
                key={chip}
                className="inline-flex h-7 items-center rounded-md border bg-accent px-2.5 text-xs font-medium text-accent-foreground"
              >
                {chip}
              </span>
            ))}
          </div>
          <SampleRows />
        </div>
      </div>
    );
  }

  return (
    <div
      className={frame}
      role="img"
      aria-label={id === "doctors" ? "Illustration of a doctor directory" : "Illustration of a patient list"}
    >
      <div aria-hidden="true">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{id === "doctors" ? "Doctors" : "Patients"}</span>
          <span className="inline-flex h-7 items-center rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground">
            {id === "doctors" ? "Add doctor" : "Add patient"}
          </span>
        </div>
        <SampleRows variant={id === "doctors" ? "doctors" : "patients"} />
      </div>
    </div>
  );
}

function SampleRows({ variant = "patients" }: { variant?: "doctors" | "patients" }) {
  const rows =
    variant === "doctors"
      ? [
          ["DS", "Dr. Sample One", "Cardiology", "14"],
          ["DT", "Dr. Sample Two", "Pediatrics", "11"],
          ["DR", "Dr. Sample Three", "Neurology", "9"],
          ["DF", "Dr. Sample Four", "Dermatology", "7"],
        ]
      : [
          ["PA", "Sample patient A", "Asthma", "34"],
          ["PB", "Sample patient B", "Asthma", "27"],
          ["PC", "Sample patient C", "Asthma", "51"],
          ["PD", "Sample patient D", "Asthma", "19"],
        ];
  return (
    <div className="mt-4 divide-y rounded-lg border">
      {rows.map(([initials, name, detail, number]) => (
        <div key={name} className="flex items-center gap-3 px-3 py-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium">
            {initials}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{name}</span>
            <span className="block truncate text-xs text-muted-foreground">{detail}</span>
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {variant === "doctors" ? `${number} patients` : `Age ${number}`}
          </span>
        </div>
      ))}
    </div>
  );
}
