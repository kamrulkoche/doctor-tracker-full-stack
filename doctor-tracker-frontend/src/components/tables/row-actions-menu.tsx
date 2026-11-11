"use client";

import { MoreHorizontal, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Fragment, memo } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type RowAction = {
  label: string;
  icon: LucideIcon;
  /** Navigation action. */
  href?: string;
  /** Command action. */
  onSelect?: () => void;
  destructive?: boolean;
  /** Draw a separator above this item (before the destructive group). */
  separated?: boolean;
};

type RowActionsMenuProps = {
  /** Name of the record, for the trigger's accessible name. */
  recordName: string;
  actions: readonly RowAction[];
};

/** "More" menu used in table rows, mobile cards and detail headers. */
export const RowActionsMenu = memo(function RowActionsMenu({ recordName, actions }: RowActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-10 md:size-8"
          aria-label={`Actions for ${recordName}`}
        >
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {actions.map((action) => (
          <Fragment key={action.label}>
            {action.separated ? <DropdownMenuSeparator /> : null}
            {action.href ? (
              <DropdownMenuItem asChild className="min-h-10 md:min-h-0">
                <Link href={action.href}>
                  <action.icon className="size-4" aria-hidden="true" />
                  {action.label}
                </Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                variant={action.destructive ? "destructive" : "default"}
                className="min-h-10 md:min-h-0"
                onSelect={action.onSelect}
              >
                <action.icon className="size-4" aria-hidden="true" />
                {action.label}
              </DropdownMenuItem>
            )}
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
