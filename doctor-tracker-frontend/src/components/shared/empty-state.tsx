import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** A single action: primary for "no data yet", outline for "no results". */
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-12 text-center", className)}>
      <span
        aria-hidden="true"
        className="inline-flex size-10 items-center justify-center rounded-lg bg-muted"
      >
        <Icon className="size-5 text-muted-foreground" strokeWidth={1.75} />
      </span>
      <div className="grid gap-1">
        <p className="text-sm font-medium">{title}</p>
        {description ? <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
