"use client";

import { memo } from "react";

import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { UserMenu } from "@/components/layout/user-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { User } from "@/types/models";

type HeaderProps = {
  user: User;
  onSignOut: () => void;
  isSigningOut: boolean;
};

export const Header = memo(function Header({ user, onSignOut, isSigningOut }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4 md:px-6">
      <SidebarTrigger className="-ml-2 size-10 md:size-8" title="Toggle navigation (Ctrl/Cmd+B)" />
      <Separator
        orientation="vertical"
        className="mr-1 hidden h-4 data-[orientation=vertical]:h-4 md:block"
      />
      <Breadcrumbs />
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <ThemeSwitcher />
        <UserMenu user={user} onSignOut={onSignOut} isSigningOut={isSigningOut} />
      </div>
    </header>
  );
});
