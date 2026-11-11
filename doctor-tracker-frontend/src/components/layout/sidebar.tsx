"use client";

import { Stethoscope } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo } from "react";

import { isNavItemActive, MAIN_NAV, SECONDARY_NAV, type NavItem } from "@/components/layout/nav-items";
import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { APP_NAME, ROUTES } from "@/constants/app";

function NavList({ items, pathname }: { items: readonly NavItem[]; pathname: string }) {
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarMenu className="gap-1">
      {items.map((item) => {
        const active = isNavItemActive(pathname, item.href);
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={active}
              tooltip={item.label}
              className="h-11 gap-2.5 px-2.5 text-muted-foreground transition-colors duration-150 data-active:text-sidebar-accent-foreground md:h-9"
            >
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  // The mobile drawer closes as soon as a destination is chosen.
                  if (isMobile) setOpenMobile(false);
                }}
              >
                <item.icon aria-hidden="true" strokeWidth={1.75} />
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

/**
 * App navigation: a collapsible rail on desktop/tablet, a left drawer on phones
 * (the shadcn Sidebar switches to a Sheet below `md`).
 */
export const Sidebar = memo(function Sidebar() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarRoot collapsible="icon">
      <SidebarHeader className="h-14 flex-row items-center border-b px-3 py-0">
        <Link
          href={ROUTES.dashboard}
          className="flex min-w-0 items-center gap-2.5 rounded-md"
          onClick={() => {
            if (isMobile) setOpenMobile(false);
          }}
        >
          <span
            aria-hidden="true"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground"
          >
            <Stethoscope className="size-5" strokeWidth={1.75} />
          </span>
          <span className="truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">
            {APP_NAME}
          </span>
        </Link>
      </SidebarHeader>
      <nav aria-label="Main" className="flex min-h-0 flex-1 flex-col">
        <SidebarContent className="px-3 py-3">
          <NavList items={MAIN_NAV} pathname={pathname} />
        </SidebarContent>
        <SidebarFooter className="border-t px-3 py-3">
          <NavList items={SECONDARY_NAV} pathname={pathname} />
        </SidebarFooter>
      </nav>
    </SidebarRoot>
  );
});
