import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  /** One line under the title; put the live total here ("128 doctors"). */
  description?: ReactNode;
  /** Actions, primary last. */
  actions?: ReactNode;
};

/** The single `<h1>` of every page (design system 6.2). */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold tracking-tight md:text-2xl">{title}</h1>
        {description ? (
          <div className="mt-1 text-sm text-muted-foreground tabular-nums" aria-live="polite">
            {description}
          </div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center [&>*]:w-full sm:[&>*]:w-auto">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
