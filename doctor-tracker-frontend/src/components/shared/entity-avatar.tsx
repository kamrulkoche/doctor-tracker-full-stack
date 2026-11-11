import { memo } from "react";

import { getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";

const SIZES = {
  xs: "size-6 text-[0.625rem]",
  sm: "size-8 text-xs",
  md: "size-9 text-xs",
  lg: "size-16 text-xl",
} as const;

type EntityAvatarProps = {
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
};

/**
 * Initials avatar (design system 6.7). One colour for every avatar; it is decorative
 * because the name is always printed next to it.
 */
export const EntityAvatar = memo(function EntityAvatar({ name, size = "sm", className }: EntityAvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-accent font-medium text-accent-foreground select-none",
        SIZES[size],
        className,
      )}
    >
      {getInitials(name)}
    </span>
  );
});
