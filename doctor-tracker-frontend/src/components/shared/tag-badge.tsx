import { memo } from "react";

import { badgeTint } from "@/lib/badge";
import { cn } from "@/lib/utils";

type TagBadgeProps = {
  label: string;
  className?: string;
};

/** Specialization / condition badge, tinted by a deterministic hash of its label. */
export const TagBadge = memo(function TagBadge({ label, className }: TagBadgeProps) {
  return (
    <span
      title={label}
      className={cn(
        "inline-flex h-5.5 max-w-full items-center rounded-md px-2 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        badgeTint(label),
        className,
      )}
    >
      <span className="truncate">{label}</span>
    </span>
  );
});
