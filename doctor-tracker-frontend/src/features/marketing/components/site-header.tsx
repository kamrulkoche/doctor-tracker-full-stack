"use client";

import { ArrowRight, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { APP_NAME, ROUTES } from "@/constants/app";
import { BrandMark } from "@/features/marketing/components/brand-mark";
import { Container } from "@/features/marketing/components/section";
import { SITE_NAV } from "@/features/marketing/content/site";
import { cn } from "@/lib/utils";

function useScrolled(threshold = 8) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > threshold);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [threshold]);
  return scrolled;
}

export function SiteHeader() {
  const pathname = usePathname();
  const scrolled = useScrolled();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-background transition-shadow duration-150",
        scrolled ? "shadow-xs" : "border-transparent",
      )}
    >
      <Container className="flex h-16 items-center gap-6">
        <BrandMark />

        <nav aria-label="Main" className="hidden flex-1 lg:block">
          <ul className="flex items-center justify-center gap-1">
            {SITE_NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-md px-3 py-2 text-sm transition-colors duration-150 hover:text-foreground",
                      active ? "font-medium text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <ThemeSwitcher />
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href={ROUTES.login}>Sign in</Link>
          </Button>
          <Button asChild className="hidden sm:inline-flex">
            <Link href={ROUTES.contact}>
              Get started
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Link>
          </Button>

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="size-10 lg:hidden" aria-label="Open menu">
                <Menu className="size-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 max-w-[85vw]">
              <SheetHeader>
                <SheetTitle>{APP_NAME}</SheetTitle>
                <SheetDescription className="sr-only">Site navigation</SheetDescription>
              </SheetHeader>
              <nav aria-label="Mobile" className="px-4">
                <ul className="grid gap-1">
                  {[{ label: "Home", href: ROUTES.home }, ...SITE_NAV].map((item) => {
                    const active = pathname === item.href;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setMenuOpen(false)}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex min-h-11 items-center rounded-md px-3 text-base transition-colors duration-150 hover:bg-muted",
                            active ? "bg-accent font-medium text-accent-foreground" : "text-foreground",
                          )}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-6 grid gap-2 border-t pt-6">
                  <Button asChild size="lg">
                    <Link href={ROUTES.contact} onClick={() => setMenuOpen(false)}>
                      Get started
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href={ROUTES.login} onClick={() => setMenuOpen(false)}>
                      Sign in
                    </Link>
                  </Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </Container>
    </header>
  );
}
