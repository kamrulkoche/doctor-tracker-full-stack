"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Returns `value` after it has stopped changing for `delayMs`. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

/**
 * Stable debounced function. `cancel` drops a pending call (used when the value is
 * changed from outside, e.g. "Reset filters", so a stale keystroke cannot win).
 */
export function useDebouncedCallback<TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
  delayMs: number,
): { run: (...args: TArgs) => void; cancel: () => void } {
  const callbackRef = useRef(callback);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const run = useCallback(
    (...args: TArgs) => {
      cancel();
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        callbackRef.current(...args);
      }, delayMs);
    },
    [cancel, delayMs],
  );

  useEffect(() => cancel, [cancel]);

  return { run, cancel };
}
