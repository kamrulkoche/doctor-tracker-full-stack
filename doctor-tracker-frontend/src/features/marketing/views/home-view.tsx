import { ArrowRight, HeartPulse, Quote, Stethoscope } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/app";
import {
  CheckList,
  CtaBanner,
  FeatureCard,
  IconTile,
  StepList,
} from "@/features/marketing/components/building-blocks";
import { DashboardPreview } from "@/features/marketing/components/dashboard-preview";
import { FaqAccordion } from "@/features/marketing/components/faq-accordion";
import { Container, Eyebrow, Section, SectionHeading } from "@/features/marketing/components/section";
import { HOME_FAQ } from "@/features/marketing/content/faq";
import { BENEFITS, PLATFORM_STEPS, TESTIMONIALS } from "@/features/marketing/content/pages";
import { AVAILABLE_FEATURES, HIGHLIGHTS, TRUST_POINTS } from "@/features/marketing/content/site";

function Hero() {
  return (
    <section className="mk-hero relative overflow-hidden border-b" aria-labelledby="hero-title">
      <Container className="relative grid items-center gap-12 py-16 md:py-20 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14 lg:py-24">
        <div className="animate-in duration-300 fade-in slide-in-from-bottom-2">
          <p className="inline-flex items-center gap-2 rounded-md border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
            Doctor and patient management
          </p>
          <h1
            id="hero-title"
            className="mt-5 text-4xl font-semibold tracking-tight text-balance md:text-5xl lg:text-[3.25rem] lg:leading-[1.1]"
          >
            Every doctor, every patient, <span className="text-primary">one clear view.</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-pretty text-muted-foreground md:text-lg">
            Doctor Tracker gives healthcare teams a single workspace to manage doctors, organise their patients
            and see how the practice is growing, without spreadsheets.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-11 px-5">
              <Link href={ROUTES.contact}>
                Get started
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-11 px-5">
              <Link href={ROUTES.features}>Learn more</Link>
            </Button>
          </div>
          <ul className="mt-10 grid gap-3 border-t pt-6 text-sm text-muted-foreground sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {TRUST_POINTS.map((point) => (
              <li key={point.title} className="flex items-center gap-2">
                <point.icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                {point.title}
              </li>
            ))}
          </ul>
        </div>

        <DashboardPreview className="animate-in delay-100 duration-300 fade-in slide-in-from-bottom-4 fill-mode-both" />
      </Container>
    </section>
  );
}

function Highlights() {
  return (
    <section aria-label="Platform highlights" className="border-b">
      <Container>
        <dl className="grid grid-cols-2 divide-border lg:grid-cols-4 lg:divide-x">
          {HIGHLIGHTS.map((item, index) => (
            <div
              key={item.label}
              className={`flex flex-col px-4 py-8 md:px-6 ${index < 2 ? "border-b lg:border-b-0" : ""} ${index % 2 === 0 ? "border-r lg:border-r-0" : ""}`}
            >
              <dt className="order-2 mt-1 text-sm leading-snug text-muted-foreground">{item.label}</dt>
              <dd className="order-1 text-3xl font-semibold tracking-tight text-foreground tabular-nums">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}

function Features() {
  return (
    <Section labelledBy="features-title">
      <SectionHeading
        id="features-title"
        eyebrow="Features"
        title="Everything the front office needs, nothing it doesn't"
        description="Four focused workspaces that cover the daily work of organising doctors and patients."
      />
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {AVAILABLE_FEATURES.map((feature) => (
          <FeatureCard key={feature.id} feature={feature} />
        ))}
      </div>
      <div className="mt-10 text-center">
        <Button asChild variant="link" className="text-sm">
          <Link href={ROUTES.features}>
            See all features and the roadmap
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </Section>
  );
}

function HowItWorks() {
  return (
    <Section tone="muted" labelledBy="how-title">
      <SectionHeading
        id="how-title"
        eyebrow="How it works"
        title="From sign-in to a clear picture in four steps"
        description="No migration project. Add your doctors and patients and the dashboard fills itself in."
      />
      <div className="mt-14">
        <StepList steps={PLATFORM_STEPS} />
      </div>
    </Section>
  );
}

function Benefits() {
  const panels = [
    { ...BENEFITS.doctors, icon: Stethoscope },
    { ...BENEFITS.patients, icon: HeartPulse },
  ];
  return (
    <Section labelledBy="benefits-title">
      <SectionHeading
        id="benefits-title"
        eyebrow="Benefits"
        title="Better organised for the team, smoother for patients"
      />
      <div className="mt-12 grid gap-4 md:grid-cols-2">
        {panels.map((panel) => (
          <div key={panel.title} className="rounded-lg border bg-card p-6 md:p-8">
            <IconTile icon={panel.icon} />
            <h3 className="mt-5 text-lg font-semibold">{panel.title}</h3>
            <CheckList items={panel.points} className="mt-5" />
          </div>
        ))}
      </div>
    </Section>
  );
}

function Testimonials() {
  return (
    <Section tone="muted" labelledBy="testimonials-title">
      <SectionHeading
        id="testimonials-title"
        eyebrow="Testimonials"
        title="What clinic teams tell us they value"
        description="Illustrative placeholder quotes for layout purposes, to be replaced with attributed customer feedback."
      />
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {TESTIMONIALS.map((testimonial) => (
          <figure key={testimonial.role} className="flex flex-col rounded-lg border bg-card p-6">
            <Quote className="size-5 text-primary" aria-hidden="true" />
            <blockquote className="mt-4 flex-1 text-sm leading-relaxed">“{testimonial.quote}”</blockquote>
            <figcaption className="mt-6 flex items-center gap-3 border-t pt-4">
              <span
                className="flex size-9 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground"
                aria-hidden="true"
              >
                {testimonial.role
                  .split(" ")
                  .map((word) => word[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <span>
                <span className="block text-sm font-medium">{testimonial.role}</span>
                <span className="block text-xs text-muted-foreground">{testimonial.organisation}</span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}

function Faq() {
  return (
    <Section labelledBy="faq-title">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
        <div>
          <Eyebrow>FAQ</Eyebrow>
          <h2 id="faq-title" className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
            Questions, answered
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            The short version. Browse every question by category on the FAQ page, or ask us directly.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href={ROUTES.faq}>View all questions</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href={ROUTES.contact}>Contact us</Link>
            </Button>
          </div>
        </div>
        <FaqAccordion items={HOME_FAQ} />
      </div>
    </Section>
  );
}

export function HomeView() {
  return (
    <>
      <Hero />
      <Highlights />
      <Features />
      <HowItWorks />
      <Benefits />
      <Testimonials />
      <Faq />
      <CtaBanner />
    </>
  );
}
