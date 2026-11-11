"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { memo } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
] as const;

/**
 * Header theme control. The trigger icon is swapped with CSS (`dark:` variants), so it
 * is correct on first paint and needs no mounted-state workaround.
 */
export const ThemeSwitcher = memo(function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-10 md:size-8" aria-label="Change theme">
          <Sun className="size-4 dark:hidden" aria-hidden="true" />
          <Moon className="hidden size-4 dark:block" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        <DropdownMenuRadioGroup value={theme ?? "light"} onValueChange={setTheme}>
          {THEME_OPTIONS.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value} className="min-h-10 md:min-h-0">
              <option.icon className="size-4" aria-hidden="true" />
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
