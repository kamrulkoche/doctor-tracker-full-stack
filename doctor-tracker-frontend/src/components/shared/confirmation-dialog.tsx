"use client";

import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type ConfirmationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** A question naming the record: "Delete Dr. Sara Khan?". */
  title: string;
  /** One or two sentences stating the consequence. */
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  isPending?: boolean;
  destructive?: boolean;
  /** Extra content under the description (e.g. why the action is blocked). */
  children?: ReactNode;
  /** Hide the confirm button when the action cannot proceed. */
  hideConfirm?: boolean;
};

/**
 * Confirmation for destructive actions (design system 6.9). Cancel receives initial
 * focus; while pending both buttons are disabled and Escape is blocked.
 */
export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  isPending = false,
  destructive = false,
  children,
  hideConfirm = false,
}: ConfirmationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => (isPending ? undefined : onOpenChange(next))}>
      <AlertDialogContent
        className="gap-0 rounded-xl p-6 data-[size=default]:max-w-[calc(100%-2rem)] data-[size=default]:sm:max-w-md"
        onEscapeKeyDown={(event) => {
          if (isPending) event.preventDefault();
        }}
      >
        <AlertDialogTitle className="text-left text-lg font-semibold">{title}</AlertDialogTitle>
        <AlertDialogDescription className="mt-2 text-left text-sm text-muted-foreground">
          {description}
        </AlertDialogDescription>
        {children ? <div className="mt-4">{children}</div> : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel disabled={isPending} className="h-10 sm:h-9">
            {hideConfirm ? "Close" : cancelLabel}
          </AlertDialogCancel>
          {hideConfirm ? null : (
            <Button
              variant={destructive ? "destructive" : "default"}
              className="h-10 sm:h-9"
              disabled={isPending}
              aria-busy={isPending}
              onClick={onConfirm}
            >
              {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {confirmLabel}
            </Button>
          )}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
