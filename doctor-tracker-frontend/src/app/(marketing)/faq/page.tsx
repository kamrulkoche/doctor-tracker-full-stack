import { MessageCircleQuestion } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/app";
import { PageHero } from "@/features/marketing/components/building-blocks";
import { FaqAccordion } from "@/features/marketing/components/faq-accordion";
import { Container } from "@/features/marketing/components/section";
import { FAQ_CATEGORIES } from "@/features/marketing/content/faq";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about Doctor Tracker's features, security and support.",
};

export default function FaqPage() {
  return (
    <>
      <PageHero
        eyebrow="FAQ"
        title="Frequently asked questions"
        description="Everything you might want to know before getting started. Can't find your answer? Our team is a message away."
      />

      <Container className="py-16 md:py-20">
        <div className="grid gap-10 lg:grid-cols-[14rem_1fr] lg:gap-16">
          <nav aria-label="FAQ categories" className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-xs font-medium text-muted-foreground">Categories</p>
            <ul className="mt-3 flex flex-wrap gap-2 lg:grid lg:gap-1">
              {FAQ_CATEGORIES.map((category) => (
                <li key={category.id}>
                  <a
                    href={`#${category.id}`}
                    className="flex h-9 items-center justify-between gap-3 rounded-md border px-3 text-sm text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground lg:border-transparent"
                  >
                    {category.title}
                    <span className="text-xs tabular-nums">{category.items.length}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="grid min-w-0 gap-12">
            {FAQ_CATEGORIES.map((category) => (
              <section
                key={category.id}
                id={category.id}
                aria-labelledby={`${category.id}-title`}
                className="scroll-mt-24"
              >
                <h2 id={`${category.id}-title`} className="text-xl font-semibold tracking-tight">
                  {category.title}
                </h2>
                <FaqAccordion items={category.items} className="mt-4" />
              </section>
            ))}

            <div className="flex flex-col items-start gap-4 rounded-lg border bg-muted/50 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <MessageCircleQuestion className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <h2 className="text-base font-semibold">Still have questions?</h2>
                  <p className="mt-1 text-sm text-muted-foreground">We usually reply within one business day.</p>
                </div>
              </div>
              <Button asChild>
                <Link href={ROUTES.contact}>Contact us</Link>
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </>
  );
}
