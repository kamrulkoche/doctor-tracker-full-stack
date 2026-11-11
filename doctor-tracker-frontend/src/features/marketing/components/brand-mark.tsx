import { Stethoscope } from "lucide-react";
import Link from "next/link";

import { APP_NAME, ROUTES } from "@/constants/app";

/** Same tile + wordmark as the console sidebar, so the two surfaces read as one product. */
export function BrandMark() {
  return (
    <Link href={ROUTES.home} className="flex items-center gap-2.5 rounded-md" aria-label={`${APP_NAME} home`}>
      <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Stethoscope className="size-5" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <span className="text-base font-semibold tracking-tight">{APP_NAME}</span>
    </Link>
  );
}
