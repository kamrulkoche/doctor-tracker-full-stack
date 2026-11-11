"use client";

import { CircleAlert, Loader2 } from "lucide-react";
import { useId, useState, type FormEventHandler, type ReactNode } from "react";

import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

type FormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** The verb: "Add doctor", "Save changes". */
  submitLabel: string;
  onSubmit: FormEventHandler<HTMLFormElement>;
  isPending: boolean;
  /** When true, closing asks "Discard changes?" first. */
  isDirty?: boolean;
  /** Non-field error shown at the top of the form body. */
  formError?: string | null;
  children: ReactNode;
};

/**
 * Shell for every create/edit form (design system 6.8): a centred dialog on `sm+`,
 * a bottom sheet on phones, fixed header/footer with a scrolling body, a submit button
 * that is disabled with a spinner while pending, and a dirty-close guard.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  onSubmit,
  isPending,
  isDirty = false,
  formError,
  children,
}: FormDialogProps) {
  const formId = useId();
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const requestClose = (next: boolean) => {
    if (next) {
      onOpenChange(true);
      return;
    }
    if (isPending) return;
    if (isDirty) {
      setConfirmDiscard(true);
      return;
    }
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={requestClose}>
        <DialogContent
          className="flex max-h-[85vh] flex-col gap-0 overflow-hidden rounded-xl p-0 max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:h-[92dvh] max-sm:max-h-none max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none sm:max-w-lg"
          onEscapeKeyDown={(event) => {
            if (isPending) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            // A stray click outside must not throw away typed data.
            if (isPending || isDirty) event.preventDefault();
          }}
        >
          <div className="grid gap-1 border-b px-6 py-4 pr-12">
            <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">{description}</DialogDescription>
          </div>
          <form
            id={formId}
            onSubmit={onSubmit}
            noValidate
            className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4"
          >
            {formError ? (
              <Alert variant="destructive" role="alert">
                <CircleAlert aria-hidden="true" />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}
            {children}
          </form>
          <div className="flex flex-col-reverse gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-10 sm:h-9"
              disabled={isPending}
              onClick={() => requestClose(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form={formId}
              className="h-10 sm:h-9"
              disabled={isPending}
              aria-busy={isPending}
            >
              {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {submitLabel}
              {isPending ? <span className="sr-only"> (saving)</span> : null}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard changes?"
        description="You have unsaved changes in this form. If you close it now they will be lost."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        destructive
        onConfirm={() => {
          setConfirmDiscard(false);
          onOpenChange(false);
        }}
      />
    </>
  );
}
