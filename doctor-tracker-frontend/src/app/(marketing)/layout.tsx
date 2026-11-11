import type { ReactNode } from "react";

import { SiteFooter } from "@/features/marketing/components/site-footer";
import { SiteHeader } from "@/features/marketing/components/site-header";

/** Public website shell. Fully static: no auth check and no API call anywhere below it. */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col text-base">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
