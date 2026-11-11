import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/app";
import { Container, Eyebrow } from "@/features/marketing/components/section";
import type { Feature, FeatureStatus } from "@/features/marketing/content/site";
import type { Step } from "@/features/marketing/content/pages";
import { cn } from "@/lib/utils";

/** Inner-page hero: smaller than the home hero, same grid backdrop. */
export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section className="mk-hero relative overflow-hidden border-b" aria-labelledby="page-title">
      <Container className="relative py-16 md:py-24">
        <div className="max-w-2xl animate-in duration-300 fade-in slide-in-from-bottom-2">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1
            id="page-title"
            className="mt-3 text-3xl font-semibold tracking-tight text-balance md:text-4xl lg:text-5xl"
          >
            {title}
          </h1>
          <p className="mt-5 text-base leading-relaxed text-pretty text-muted-foreground md:text-lg">
            {description}
          </p>
          {children ? <div className="mt-8">{children}</div> : null}
        </div>
      </Container>
    </section>
  );
}

export function IconTile({ icon: Icon, className }: { icon: Feature["icon"]; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground",
        className,
      )}
    >
      <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
    </span>
  );
}

export function StatusBadge({ status }: { status: FeatureStatus }) {
  return status === "available" ? (
    <span className="inline-flex items-center gap-1 rounded-md border border-success/30 bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
      <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
      Available
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium text-muted-foreground">
      <span className="size-1.5 rounded-full bg-muted-foreground/60" aria-hidden="true" />
      Planned
    </span>
  );
}

export function FeatureCard({ feature, showStatus = false }: { feature: Feature; showStatus?: boolean }) {
  return (
    <article className="group flex h-full flex-col rounded-lg border bg-card p-6 transition-colors duration-150 hover:border-primary/40">
      <div className="flex items-start justify-between gap-3">
        <IconTile icon={feature.icon} />
        {showStatus ? <StatusBadge status={feature.status} /> : null}
      </div>
      <h3 className="mt-5 text-base font-semibold">{feature.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.summary}</p>
    </article>
  );
}

export function CheckList({ items, className }: { items: readonly string[]; className?: string }) {
  return (
    <ul className={cn("grid gap-3", className)}>
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-relaxed">
          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Check className="size-3" strokeWidth={2.5} aria-hidden="true" />
          </span>
          <span className="text-muted-foreground">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Numbered steps. `horizontal` lays them out as a connected row from `lg` up. */
export function StepList({
  steps,
  layout = "horizontal",
  headingLevel = "h3",
}: {
  steps: readonly Step[];
  layout?: "horizontal" | "vertical";
  headingLevel?: "h3" | "h4";
}) {
  const Heading = headingLevel;
  if (layout === "vertical") {
    return (
      <ol className="relative grid gap-8">
        {steps.map((step, index) => (
          <li key={step.title} className="relative flex gap-4">
            {index < steps.length - 1 ? (
              <span className="absolute top-10 bottom-[-2rem] left-[1.1875rem] w-px bg-border" aria-hidden="true" />
            ) : null}
            <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full border bg-card text-sm font-semibold text-primary tabular-nums">
              {index + 1}
            </span>
            <div className="pt-2">
              <Heading className="text-sm font-semibold">{step.title}</Heading>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((step, index) => (
        <li key={step.title} className="relative">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-card text-sm font-semibold text-primary tabular-nums">
              {index + 1}
            </span>
            {index < steps.length - 1 ? (
              <span className="hidden h-px flex-1 bg-border lg:block" aria-hidden="true" />
            ) : null}
          </div>
          <Heading className="mt-5 text-base font-semibold">{step.title}</Heading>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
        </li>
      ))}
    </ol>
  );
}

/** Closing call to action shared by every page. */
export function CtaBanner({
  title = "Bring order to your doctors and patients",
  description = "Tell us about your practice and we will set up a workspace for your team.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <section aria-labelledby="cta-title" className="py-16 md:py-24">
      <Container>
        <div className="relative overflow-hidden rounded-xl bg-primary px-6 py-12 text-primary-foreground md:px-12 md:py-16">
          <div className="mk-cta-pattern pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <h2 id="cta-title" className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">
                {title}
              </h2>
              <p className="mt-3 text-base leading-relaxed opacity-90">{description}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 focus-visible:ring-primary-foreground focus-visible:ring-offset-primary"
              >
                <Link href={ROUTES.contact}>
                  Get started
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground focus-visible:ring-primary-foreground focus-visible:ring-offset-primary dark:border-primary-foreground/40 dark:bg-transparent dark:hover:bg-primary-foreground/10"
              >
                <Link href={ROUTES.features}>Explore features</Link>
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
