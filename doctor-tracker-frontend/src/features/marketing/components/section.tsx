import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Page-width wrapper shared by every public section, header and footer. */
export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 md:px-6 lg:px-8", className)}>{children}</div>;
}

type SectionProps = {
  id?: string;
  /** `muted` alternates the background so long pages read as distinct bands. */
  tone?: "default" | "muted";
  className?: string;
  labelledBy?: string;
  children: ReactNode;
};

export function Section({ id, tone = "default", className, labelledBy, children }: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn(
        "scroll-mt-20 py-16 md:py-24",
        tone === "muted" && "border-y bg-muted/50",
        className,
      )}
    >
      <Container>{children}</Container>
    </section>
  );
}

type SectionHeadingProps = {
  id: string;
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
};

export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 id={id} className="mt-3 text-2xl font-semibold tracking-tight text-balance md:text-3xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-base leading-relaxed text-pretty text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-sm font-medium text-primary", className)}>{children}</p>;
}
