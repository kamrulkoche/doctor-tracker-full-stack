import { Info } from "lucide-react";

import { Container } from "@/features/marketing/components/section";
import type { LegalDocumentContent } from "@/features/marketing/content/legal";

/** Two-column legal layout: sticky table of contents beside numbered sections. */
export function LegalDocument({ content }: { content: LegalDocumentContent }) {
  return (
    <>
      <section className="border-b bg-muted/50" aria-labelledby="page-title">
        <Container className="py-12 md:py-16">
          <p className="text-sm font-medium text-primary">Legal</p>
          <h1 id="page-title" className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            {content.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground">{content.summary}</p>
          <p className="mt-4 text-sm text-muted-foreground">
            Last updated <time className="font-medium text-foreground tabular-nums">{content.lastUpdated}</time>
          </p>
        </Container>
      </section>

      <Container className="py-12 md:py-16">
        <div className="grid gap-10 lg:grid-cols-[14rem_1fr] lg:gap-16">
          <nav aria-label="On this page" className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-xs font-medium text-muted-foreground">On this page</p>
            <ol className="mt-3 grid gap-1 border-l text-sm">
              {content.sections.map((section, index) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="-ml-px flex gap-2 border-l border-transparent py-1 pl-3 text-muted-foreground transition-colors duration-150 hover:border-primary hover:text-foreground"
                  >
                    <span className="tabular-nums">{index + 1}.</span>
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="min-w-0 max-w-3xl">
            <div className="flex gap-3 rounded-lg border bg-accent/50 p-4 text-sm text-accent-foreground">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p>
                Placeholder content for layout purposes. This text is not legal advice and must be reviewed by
                qualified counsel before publication.
              </p>
            </div>

            {content.sections.map((section, index) => (
              <section key={section.id} id={section.id} className="scroll-mt-24 border-b py-8 last:border-b-0">
                <h2 className="text-lg font-semibold">
                  <span className="mr-2 text-muted-foreground tabular-nums">{index + 1}.</span>
                  {section.title}
                </h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="mt-3 text-sm leading-7 text-muted-foreground md:text-base md:leading-7">
                    {paragraph}
                  </p>
                ))}
                {section.list ? (
                  <ul className="mt-3 grid list-disc gap-2 pl-5 text-sm leading-7 text-muted-foreground marker:text-primary md:text-base md:leading-7">
                    {section.list.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </article>
        </div>
      </Container>
    </>
  );
}
