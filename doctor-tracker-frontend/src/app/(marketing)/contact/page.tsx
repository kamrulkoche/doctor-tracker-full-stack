import { ArrowRight, Clock, LifeBuoy, Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ROUTES } from "@/constants/app";
import { PageHero } from "@/features/marketing/components/building-blocks";
import { ContactForm } from "@/features/marketing/components/contact-form";
import { Container } from "@/features/marketing/components/section";
import { FAQ_CATEGORIES } from "@/features/marketing/content/faq";
import { CONTACT } from "@/features/marketing/content/site";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Get in touch with the Doctor Tracker team for a demo, pricing or support.",
};

const DETAILS = [
  { icon: Mail, label: "Email", value: CONTACT.email, href: `mailto:${CONTACT.email}` },
  { icon: Phone, label: "Phone", value: CONTACT.phone, href: `tel:${CONTACT.phone.replace(/[^+\d]/g, "")}` },
  { icon: Clock, label: "Hours", value: CONTACT.hours },
  { icon: MapPin, label: "Office", value: CONTACT.address },
] as const;

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact us"
        title="Let's talk about your practice"
        description="Whether you want a demo, have a question about the platform or need help with your account, we are happy to hear from you."
      />

      <Container className="py-16 md:py-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-12">
          <ContactForm />

          <aside className="grid content-start gap-4" aria-label="Other ways to reach us">
            <section className="rounded-lg border bg-card p-6" aria-labelledby="details-title">
              <h2 id="details-title" className="text-base font-semibold">
                Contact information
              </h2>
              <dl className="mt-5 grid gap-5">
                {DETAILS.map((detail) => (
                  <div key={detail.label} className="flex gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                      <detail.icon className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <dt className="text-xs font-medium text-muted-foreground">{detail.label}</dt>
                      <dd className="mt-0.5 text-sm break-words">
                        {"href" in detail ? (
                          <a href={detail.href} className="font-medium hover:text-primary hover:underline">
                            {detail.value}
                          </a>
                        ) : (
                          detail.value
                        )}
                      </dd>
                    </div>
                  </div>
                ))}
              </dl>
            </section>

            <section className="rounded-lg border bg-card p-6" aria-labelledby="support-title">
              <div className="flex items-center gap-2">
                <LifeBuoy className="size-4 text-primary" aria-hidden="true" />
                <h2 id="support-title" className="text-base font-semibold">
                  Already a customer?
                </h2>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Email{" "}
                <a href={`mailto:${CONTACT.supportEmail}`} className="font-medium text-foreground hover:underline">
                  {CONTACT.supportEmail}
                </a>{" "}
                with a description of the issue. We reply during business hours.
              </p>
            </section>

            <section className="rounded-lg border bg-card p-6" aria-labelledby="faq-links-title">
              <h2 id="faq-links-title" className="text-base font-semibold">
                Quick answers
              </h2>
              <ul className="mt-3 divide-y">
                {FAQ_CATEGORIES.map((category) => (
                  <li key={category.id}>
                    <Link
                      href={`${ROUTES.faq}#${category.id}`}
                      className="group flex min-h-11 items-center justify-between gap-3 text-sm transition-colors duration-150 hover:text-primary"
                    >
                      {category.title}
                      <ArrowRight
                        className="size-4 text-muted-foreground transition-colors duration-150 group-hover:text-primary"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </Container>
    </>
  );
}
