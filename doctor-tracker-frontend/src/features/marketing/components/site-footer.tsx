import { Mail, Phone } from "lucide-react";
import Link from "next/link";

import { APP_NAME } from "@/constants/app";
import { BrandMark } from "@/features/marketing/components/brand-mark";
import { Container } from "@/features/marketing/components/section";
import { CONTACT, COPYRIGHT_YEAR, FOOTER_COLUMNS } from "@/features/marketing/content/site";

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/50">
      <Container className="py-12 md:py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-xs">
            <BrandMark />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Doctor and patient management for healthcare teams who want a clear view of their practice.
            </p>
            <ul className="mt-6 grid gap-2 text-sm">
              <li>
                <a
                  href={`mailto:${CONTACT.email}`}
                  className="inline-flex items-center gap-2 text-muted-foreground transition-colors duration-150 hover:text-foreground"
                >
                  <Mail className="size-4" aria-hidden="true" />
                  {CONTACT.email}
                </a>
              </li>
              <li className="inline-flex items-center gap-2 text-muted-foreground tabular-nums">
                <Phone className="size-4" aria-hidden="true" />
                {CONTACT.phone}
              </li>
            </ul>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="text-sm font-semibold">{column.title}</h2>
              <ul className="mt-4 grid gap-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {COPYRIGHT_YEAR} {APP_NAME}. All rights reserved.
          </p>
          <p>An administrative tool. It does not provide medical advice.</p>
        </div>
      </Container>
    </footer>
  );
}
