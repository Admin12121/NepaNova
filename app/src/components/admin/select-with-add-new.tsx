"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Spinner from "@/components/ui/spinner";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

import {
  SelectWithAddNewType,
  CategoryOption,
  CategorySchemaFormValues,
} from "@/types/product-form";

const CategorySchema = z.object({
  name: z.string().min(2, { message: "Name is required" }),
});

interface SelectWithAddNewProps<T> {
  label: string;
  value: T | null;
  onChange: (value: T | null) => void;
  options: T[];
  isLoading: boolean;
  onAddNew: (newItem: { name: string; [key: string]: any }) => Promise<void>;
  renderOption: (item: T) => string;
  getOptionId: (item: T) => string | number;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  error?: string;
  type: SelectWithAddNewType;
}

export function SelectWithAddNew<T extends Record<string, any>>({
  label,
  value,
  onChange,
  options,
  isLoading,
  onAddNew,
  renderOption,
  getOptionId,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  disabled = false,
  error,
  type,
}: SelectWithAddNewProps<T>) {
  const [open, setOpen] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CategorySchemaFormValues>({
    resolver: zodResolver(CategorySchema),
    mode: "onChange",
  });

  const onSubmit = useCallback(
    async (data: CategorySchemaFormValues) => {
      setIsSubmitting(true);
      try {
        await onAddNew(data);
        toast.success("Category added successfully");
        form.reset();
        setOpenDialog(false);
        setSearchValue("");
      } catch (error: any) {
        const errorMessages =
          error?.data && typeof error.data === "object"
            ? Object.values(error.data).flat().join(", ")
            : "An error occurred";
        toast.error(errorMessages);
      } finally {
        setIsSubmitting(false);
      }
    },
    [onAddNew, form, type],
  );

  const selectedOption = value ? renderOption(value) : null;

  return (
    <span className="flex w-full gap-3 justify-center flex-col">
      <span className="flex w-full gap-3 items-end justify-center">
        <span className="flex-col w-full space-y-2">
          <Label>{label}</Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="secondary"
                role="combobox"
                aria-expanded={open}
                disabled={disabled}
                className={cn(
                  "rounded-lg w-full justify-between dark:bg-neutral-900 px-3 font-normal outline-offset-0 hover:bg-background focus-visible:border-ring focus-visible:outline-[3px] focus-visible:outline-ring/20",
                  open &&
                    "ring-2 ring-offset-2 ring-offset-default-100 dark:ring-offset-black ring-neutral-700",
                )}
              >
                {selectedOption || placeholder}
                <ChevronDown
                  size={16}
                  strokeWidth={2}
                  className="shrink-0 text-muted-foreground/80"
                  aria-hidden="true"
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-full min-w-[var(--radix-popper-anchor-width)] border-input p-0 rounded-xl mt-1 border-none overflow-hidden"
              align="start"
            >
              <Command className="dark:bg-neutral-900">
                <CommandInput
                  placeholder={searchPlaceholder}
                  onValueChange={setSearchValue}
                  value={searchValue}
                />
                <CommandList>
                  <CommandEmpty>No option found.</CommandEmpty>
                  <CommandGroup>
                    {isLoading && <Spinner />}
                    {options.map((option) => (
                      <CommandItem
                        key={getOptionId(option)}
                        value={getOptionId(option).toString()}
                        onSelect={() => {
                          onChange(option);
                          setOpen(false);
                          setSearchValue("");
                        }}
                        className="rounded-lg"
                      >
                        {renderOption(option)}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </span>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button type="button">Add</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <div className="space-y-2">
              <DialogHeader className="flex flex-col gap-1">
                <DialogTitle>Add {label}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            className="dark:bg-neutral-900 bg-white mt-5"
                            placeholder={`Enter ${label.toLowerCase()}`}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter className="mt-6">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full md:w-auto"
                    >
                      {isSubmitting ? "Adding..." : `Add ${label}`}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </div>
          </DialogContent>
        </Dialog>
      </span>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </span>
  );
}
