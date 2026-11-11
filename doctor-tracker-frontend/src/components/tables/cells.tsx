import Link from "next/link";
import { memo } from "react";

import { EntityAvatar } from "@/components/shared/entity-avatar";
import { EM_DASH, formatDate, formatDateTime } from "@/lib/format";

/** Avatar + linked name + secondary line. The name is the only link; rows are not clickable. */
export const IdentityCell = memo(function IdentityCell({
  name,
  href,
  secondary,
}: {
  name: string;
  href: string;
  secondary?: string | null;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <EntityAvatar name={name} size="sm" />
      <div className="grid min-w-0">
        <Link
          href={href}
          title={name}
          className="truncate text-sm font-medium underline-offset-4 hover:text-primary hover:underline"
        >
          {name}
        </Link>
        {secondary ? (
          <span title={secondary} className="truncate text-xs text-muted-foreground">
            {secondary}
          </span>
        ) : null}
      </div>
    </div>
  );
});

/** `12 Nov 2026`, with the full timestamp on hover. */
export function DateCell({ value }: { value: string }) {
  return (
    <time dateTime={value} title={formatDateTime(value)} className="whitespace-nowrap tabular-nums">
      {formatDate(value)}
    </time>
  );
}

/** Truncating text; unset values render as an em dash, never blank. */
export function TextCell({
  value,
  numeric = false,
}: {
  value: string | null | undefined;
  numeric?: boolean;
}) {
  if (!value) return <span className="text-muted-foreground">{EM_DASH}</span>;
  return (
    <span title={value} className={numeric ? "block truncate tabular-nums" : "block truncate"}>
      {value}
    </span>
  );
}
