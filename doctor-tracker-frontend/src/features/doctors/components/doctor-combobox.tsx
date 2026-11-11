"use client";

import { Check, ChevronsUpDown, Loader2, Lock, X } from "lucide-react";
import { memo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SEARCH_DEBOUNCE_MS } from "@/constants/app";
import { useDoctor, useDoctorOptions } from "@/features/doctors/hooks/use-doctor-queries";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import type { DoctorOption } from "@/types/models";

export type DoctorChoice = Pick<DoctorOption, "id" | "name" | "specialization">;

type DoctorComboboxProps = {
  id?: string;
  /** Selected doctor id ("" / undefined when nothing is selected). */
  value: string | undefined;
  /** Name/specialization for `value` when the caller already knows them (avoids a lookup). */
  selected?: DoctorChoice | null;
  onChange: (doctor: DoctorChoice | null) => void;
  placeholder?: string;
  /** Show a clear button (filters); forms keep the field required instead. */
  clearable?: boolean;
  /** Pre-selected and not changeable (adding a patient from a doctor's page). */
  locked?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  "aria-required"?: boolean;
};

/**
 * Async searchable doctor picker backed by `GET /doctors/options`. The request is
 * debounced, only runs while the list is open, and shows the specialization next to
 * each name so same-named doctors can be told apart.
 */
export const DoctorCombobox = memo(function DoctorCombobox({
  id,
  value,
  selected,
  onChange,
  placeholder = "Select a doctor",
  clearable = false,
  locked = false,
  disabled = false,
  className,
  ...aria
}: DoctorComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const options = useDoctorOptions(debouncedSearch, open);

  // Deep links (`?doctorId=`) only carry the id; resolve the name once for the label.
  const known = selected && selected.id === value ? selected : null;
  const lookup = useDoctor(value && !known ? value : undefined);
  const current: DoctorChoice | null = known ?? (value && lookup.data ? lookup.data : null);

  const label = current
    ? `${current.name} · ${current.specialization}`
    : value
      ? lookup.isError
        ? "Unknown doctor"
        : "Loading…"
      : placeholder;

  const isSearching = options.isFetching && (options.isPlaceholderData || options.isPending);

  return (
    <div className={cn("relative min-w-0", className)}>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setSearch("");
        }}
      >
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            disabled={disabled || locked}
            className={cn(
              "h-10 w-full justify-between gap-2 bg-transparent px-3 font-normal md:h-9",
              !current && "text-muted-foreground",
              clearable && value && "pr-16",
              locked && "disabled:opacity-100",
            )}
            {...aria}
          >
            <span className="truncate">{label}</span>
            {locked ? (
              <Lock className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            ) : (
              <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-64 p-0">
          <Command shouldFilter={false}>
            <CommandInput
              value={search}
              onValueChange={setSearch}
              placeholder="Search doctors by name"
              aria-label="Search doctors by name"
            />
            <CommandList aria-busy={isSearching}>
              {options.isPending ? (
                <div
                  className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground"
                  role="status"
                >
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Loading doctors
                </div>
              ) : options.isError ? (
                <div className="grid justify-items-center gap-2 px-4 py-6 text-center text-sm" role="alert">
                  <p className="text-muted-foreground">Couldn&apos;t load doctors.</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => void options.refetch()}>
                    Try again
                  </Button>
                </div>
              ) : (
                <>
                  <CommandEmpty>
                    {debouncedSearch ? `No doctors match "${debouncedSearch}"` : "No doctors yet"}
                  </CommandEmpty>
                  <CommandGroup className={cn(isSearching && "opacity-60")}>
                    {options.data?.map((option) => (
                      <CommandItem
                        key={option.id}
                        value={option.id}
                        keywords={[option.name]}
                        data-checked={option.id === value}
                        onSelect={() => {
                          onChange({
                            id: option.id,
                            name: option.name,
                            specialization: option.specialization,
                          });
                          setOpen(false);
                          setSearch("");
                        }}
                        className="min-h-10 md:min-h-0 [&>svg:last-child]:hidden"
                      >
                        <div className="grid min-w-0 flex-1">
                          <span className="truncate">{option.name}</span>
                          <span className="truncate text-xs text-muted-foreground">
                            {option.specialization} · {option.hospital}
                          </span>
                        </div>
                        <Check
                          className={cn("size-4 shrink-0", option.id === value ? "opacity-100" : "opacity-0")}
                          aria-hidden="true"
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {clearable && value && !locked ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label="Clear doctor"
          className="absolute top-1/2 right-9 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
});
