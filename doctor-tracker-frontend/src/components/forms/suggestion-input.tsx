import { useId, type ComponentProps } from "react";

import { Input } from "@/components/ui/input";

type SuggestionInputProps = Omit<ComponentProps<typeof Input>, "list"> & {
  suggestions: readonly string[];
};

/**
 * Free-text input with native suggestions (`<datalist>`): the admin can pick an existing
 * value to keep data consistent, or type a new one. No custom listbox to keep accessible.
 */
export function SuggestionInput({ suggestions, ...props }: SuggestionInputProps) {
  const listId = useId();
  return (
    <>
      <Input list={listId} autoComplete="off" {...props} />
      <datalist id={listId}>
        {suggestions.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
    </>
  );
}
