import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type FieldControlProps = {
  id: string;
  "aria-invalid": boolean;
  "aria-describedby": string | undefined;
  "aria-required": boolean | undefined;
};

type FormFieldProps = {
  /** Unique within the page; also used to derive the help/error ids. */
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  help?: string;
  className?: string;
  /** Receives the accessibility props to spread onto the control. */
  children: (control: FieldControlProps) => ReactNode;
};

/**
 * Label + control + help/error (design system 6.8). The error replaces the help text
 * and is linked to the control through `aria-describedby`.
 */
export function FormField({ id, label, required, error, help, className, children }: FormFieldProps) {
  const messageId = error ? `${id}-error` : help ? `${id}-help` : undefined;

  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required ? (
          <span className="text-destructive" aria-hidden="true">
            {" "}
            *
          </span>
        ) : null}
      </label>
      {children({
        id,
        "aria-invalid": Boolean(error),
        "aria-describedby": messageId,
        "aria-required": required ? true : undefined,
      })}
      {error ? (
        <p id={messageId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : help ? (
        <p id={messageId} className="text-xs text-muted-foreground">
          {help}
        </p>
      ) : null}
    </div>
  );
}
