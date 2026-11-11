"use client";

import { Loader2, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { memo } from "react";

import { EntityAvatar } from "@/components/shared/entity-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROUTES } from "@/constants/app";
import type { User } from "@/types/models";

type UserMenuProps = {
  user: User;
  onSignOut: () => void;
  isSigningOut: boolean;
};

/** Admin profile dropdown: name, email, Settings, Log out. Presentational — sign-out is injected. */
export const UserMenu = memo(function UserMenu({ user, onSignOut, isSigningOut }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Account menu for ${user.name}`}
        className="inline-flex size-10 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <EntityAvatar name={user.name} size="md" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="grid gap-0.5 font-normal">
          <span className="truncate text-sm font-medium text-foreground">{user.name}</span>
          <span className="truncate text-xs text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="min-h-10 md:min-h-0">
          <Link href={ROUTES.settings}>
            <Settings className="size-4" aria-hidden="true" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          className="min-h-10 md:min-h-0"
          disabled={isSigningOut}
          onSelect={(event) => {
            event.preventDefault();
            onSignOut();
          }}
        >
          {isSigningOut ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <LogOut className="size-4" aria-hidden="true" />
          )}
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
