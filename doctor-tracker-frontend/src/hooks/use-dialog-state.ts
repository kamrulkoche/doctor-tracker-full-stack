"use client";

import { useCallback, useMemo, useState } from "react";

type DialogState<TTarget> = {
  open: boolean;
  target: TTarget | null;
};

/**
 * Open/closed state plus the record a dialog is about. The target is kept after closing
 * so the content does not blank out during the exit animation. `show` and `setOpen` are
 * stable, which keeps memoised table columns and rows from re-rendering.
 */
export function useDialogState<TTarget = true>() {
  const [state, setState] = useState<DialogState<TTarget>>({ open: false, target: null });

  const show = useCallback((target: TTarget) => setState({ open: true, target }), []);
  const setOpen = useCallback((open: boolean) => setState((current) => ({ ...current, open })), []);

  return useMemo(
    () => ({ open: state.open, target: state.target, show, setOpen }),
    [state.open, state.target, show, setOpen],
  );
}
