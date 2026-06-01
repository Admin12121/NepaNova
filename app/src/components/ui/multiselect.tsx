"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type Option = {
  label: string;
  value: string;
  disabled?: boolean;
};

type MultipleSelectorProps = {
  value?: Option[];
  defaultOptions?: Option[];
  options?: Option[];
  onChange?: (options: Option[]) => void;
  placeholder?: string;
  emptyIndicator?: React.ReactNode;
  commandProps?: React.ComponentPropsWithoutRef<typeof Command>;
  disabled?: boolean;
  className?: string;
};

const optionMatchesQuery = (option: Option, query: string) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return [option.label, option.value]
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
};

export default function MultipleSelector({
  value,
  defaultOptions = [],
  options,
  onChange,
  placeholder = "Select options",
  emptyIndicator = <p className="py-3 text-center text-sm">No results found</p>,
  commandProps,
  disabled,
  className,
}: MultipleSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [internalValue, setInternalValue] = React.useState<Option[]>([]);
  const selected = value ?? internalValue;
  const allOptions = options ?? defaultOptions;
  const selectedValues = new Set(selected.map((option) => option.value));
  const filteredOptions = allOptions.filter(
    (option) =>
      !selectedValues.has(option.value) && optionMatchesQuery(option, query),
  );

  const updateSelected = (nextSelected: Option[]) => {
    if (value === undefined) {
      setInternalValue(nextSelected);
    }
    onChange?.(nextSelected);
  };

  const addOption = (option: Option) => {
    if (option.disabled) return;
    updateSelected([...selected, option]);
    setQuery("");
  };

  const removeOption = (optionValue: string) => {
    updateSelected(selected.filter((option) => option.value !== optionValue));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex min-h-9 w-full items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-left text-sm ring-offset-background",
            "focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          <div className="flex min-w-0 flex-1 flex-wrap gap-1">
            {selected.length === 0 ? (
              <span className="truncate text-muted-foreground">
                {placeholder}
              </span>
            ) : (
              selected.map((option) => (
                <span
                  key={option.value}
                  className="inline-flex max-w-full items-center gap-1 rounded-md border bg-background px-2 py-0.5 text-xs"
                  onClick={(event) => event.stopPropagation()}
                >
                  <span className="truncate">{option.label}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Remove ${option.label}`}
                    className="rounded-sm p-0.5 hover:bg-muted"
                    onClick={() => removeOption(option.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        removeOption(option.value);
                      }
                    }}
                  >
                    <X className="h-3 w-3" />
                  </span>
                </span>
              ))
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[--radix-popover-trigger-width] p-0"
      >
        <Command
          {...commandProps}
          shouldFilter={false}
          className={cn("rounded-md", commandProps?.className)}
        >
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={placeholder}
          />
          <CommandList className="max-h-64">
            {filteredOptions.length === 0 ? (
              <CommandEmpty>{emptyIndicator}</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    onSelect={() => addOption(option)}
                  >
                    <Check className="mr-2 h-4 w-4 opacity-0" />
                    <span>{option.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
