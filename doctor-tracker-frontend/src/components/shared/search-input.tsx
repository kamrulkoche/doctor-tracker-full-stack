"use client";

import { Search, X } from "lucide-react";
import { memo, useCallback, useEffect, useId, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { SEARCH_DEBOUNCE_MS, SEARCH_MAX_LENGTH } from "@/constants/app";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

type SearchInputProps = {
  /** The committed value (from the URL). */
  value: string;
  /** Called with the trimmed text once typing pauses. */
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  /** Focus this input when "/" is pressed outside a form control. */
  enableShortcut?: boolean;
  className?: string;
};

/**
 * Debounced search box. Keystrokes stay local; only the settled value is committed, so
 * typing never re-renders the table. When the committed value changes from outside
 * (Reset, back button) the draft follows it and any pending keystroke is dropped.
 */
export const SearchInput = memo(function SearchInput({
  value,
  onChange,
  label,
  placeholder = "Search",
  enableShortcut = false,
  className,
}: SearchInputProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(value);
  const [committed, setCommitted] = useState(value);
  // What this input last committed itself; anything else arriving in `value` came from outside.
  const [emitted, setEmitted] = useState(value);
  const [outsideChanges, setOutsideChanges] = useState(0);
  const emit = useCallback(
    (next: string) => {
      setEmitted(next);
      onChange(next);
    },
    [onChange],
  );
  const { run, cancel } = useDebouncedCallback(emit, SEARCH_DEBOUNCE_MS);

  // Derived-state reset during render (no effect, no extra paint): when the committed value
  // changes from outside (Reset, back button), the draft follows it.
  if (value !== committed) {
    setCommitted(value);
    if (value !== emitted) {
      setEmitted(value);
      setDraft(value);
      setOutsideChanges((count) => count + 1);
    }
  }

  useEffect(() => {
    // ...and a keystroke still waiting in the debounce timer must not overwrite it.
    if (outsideChanges > 0) cancel();
  }, [outsideChanges, cancel]);

  useEffect(() => {
    if (!enableShortcut) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enableShortcut]);

  const update = (next: string) => {
    setDraft(next);
    run(next.trim());
  };

  const clear = () => {
    cancel();
    setDraft("");
    if (value !== "") emit("");
    inputRef.current?.focus();
  };

  return (
    <div className={cn("relative w-full lg:w-72", className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        ref={inputRef}
        id={id}
        type="search"
        inputMode="search"
        autoComplete="off"
        spellCheck={false}
        maxLength={SEARCH_MAX_LENGTH}
        placeholder={placeholder}
        value={draft}
        onChange={(event) => update(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && draft) {
            event.preventDefault();
            clear();
          }
        }}
        className="h-10 pr-10 pl-9 md:h-9 [&::-webkit-search-cancel-button]:appearance-none"
      />
      {draft ? (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear search"
          className="absolute top-1/2 right-1 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:size-7"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
});
