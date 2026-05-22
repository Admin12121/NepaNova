"use client";

import React, { useState } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ColorOption {
  name: string;
  code: string;
}

interface ColorPickerFieldProps {
  value?: string | null;
  colorName?: string | null;
  onChange: (colorCode: string, colorName: string) => void;
  error?: string;
  label?: string;
}

// Predefined color palette - organized by category
const COLOR_PALETTE: ColorOption[] = [
  // Reds & Pinks
  { name: "Red", code: "#EF4444" },
  { name: "Pink", code: "#EC4899" },
  { name: "Rose", code: "#F43F5E" },
  { name: "Crimson", code: "#C5433C" },

  // Oranges & Yellows
  { name: "Orange", code: "#F97316" },
  { name: "Amber", code: "#F59E0B" },
  { name: "Yellow", code: "#EAB308" },
  { name: "Gold", code: "#D2B179" },

  // Greens
  { name: "Green", code: "#22C55E" },
  { name: "Emerald", code: "#10B981" },
  { name: "Teal", code: "#14B8A6" },
  { name: "Forest", code: "#2F5948" },

  // Blues & Cyans
  { name: "Blue", code: "#3B82F6" },
  { name: "Sky", code: "#7FB8D4" },
  { name: "Navy", code: "#1F3F6D" },
  { name: "Cyan", code: "#06B6D4" },

  // Purples
  { name: "Purple", code: "#A855F7" },
  { name: "Violet", code: "#7C3AED" },
  { name: "Indigo", code: "#4F46E5" },
  { name: "Wine", code: "#7A3A45" },

  // Neutrals
  { name: "Beige", code: "#CBB48E" },
  { name: "Gray", code: "#9CA3AF" },
  { name: "Black", code: "#1F2937" },
  { name: "White", code: "#FFFFFF" },

  // Earth Tones
  { name: "Brown", code: "#92400E" },
  { name: "Tan", code: "#D2B48C" },
  { name: "Maroon", code: "#6B3434" },
];

export const ColorPickerField = ({
  value = null,
  colorName = null,
  onChange,
  error,
  label = "Color (optional)",
}: ColorPickerFieldProps) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredColors = searchTerm
    ? COLOR_PALETTE.filter(
        (color) =>
          color.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          color.code.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : COLOR_PALETTE;

  const selectedColor = COLOR_PALETTE.find((c) => c.code === value);

  const handleColorSelect = (color: ColorOption) => {
    onChange(color.code, color.name);
    setOpen(false);
    setSearchTerm("");
  };

  const handleClear = (e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onChange("", "");
    setSearchTerm("");
  };

  const isLightColor = (hexColor: string): boolean => {
    const hex = hexColor.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128;
  };

  return (
    <div className="space-y-2 w-full">
      <label className="text-sm font-medium">{label}</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-between h-10 px-3",
              "bg-white dark:bg-neutral-900",
              "hover:bg-neutral-50 dark:hover:bg-neutral-800",
              error && "border-red-500 border-2",
              !selectedColor && "text-neutral-500"
            )}
          >
            <span className="flex items-center gap-2 flex-1">
              {selectedColor ? (
                <>
                  <div
                    className="w-6 h-6 rounded-md border border-neutral-300 dark:border-neutral-600 shadow-sm flex-shrink-0"
                    style={{ backgroundColor: selectedColor.code }}
                  />
                  <span className="text-sm font-medium">{selectedColor.name}</span>
                  <span className="text-xs text-neutral-500 hidden sm:inline">
                    ({selectedColor.code})
                  </span>
                </>
              ) : (
                <span className="text-sm">Select a color...</span>
              )}
            </span>
            {selectedColor && (
              <div
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleClear(e as any);
                  }
                }}
                className="ml-2 p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded flex-shrink-0 cursor-pointer"
                aria-label="Clear color selection"
              >
                <X className="w-4 h-4" />
              </div>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start" side="bottom">
          <div className="space-y-4">
            {/* Search Input */}
            <div>
              <input
                type="text"
                placeholder="Search color..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn(
                  "w-full px-3 py-2 text-sm border rounded-md",
                  "bg-white dark:bg-neutral-900",
                  "border-neutral-200 dark:border-neutral-700",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500"
                )}
              />
            </div>

            {/* Color Grid */}
            {filteredColors.length === 0 ? (
              <div className="py-8 text-center text-sm text-neutral-500">
                No colors found matching "{searchTerm}"
              </div>
            ) : (
              <div className="grid grid-cols-6 gap-2">
                {filteredColors.map((color) => {
                  const isSelected = selectedColor?.code === color.code;
                  const lightText = isLightColor(color.code);

                  return (
                    <button
                      key={color.code}
                      type="button"
                      onClick={() => handleColorSelect(color)}
                      className={cn(
                        "relative w-full aspect-square rounded-md",
                        "border-2 transition-all cursor-pointer",
                        "hover:scale-105 active:scale-95",
                        "focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500",
                        isSelected
                          ? "border-blue-500 shadow-lg ring-2 ring-blue-300"
                          : "border-neutral-300 dark:border-neutral-600 hover:border-neutral-400"
                      )}
                      style={{ backgroundColor: color.code }}
                      title={`${color.name} (${color.code})`}
                      aria-label={`Select ${color.name} color`}
                      aria-pressed={isSelected}
                    >
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Check
                            className={cn(
                              "w-5 h-5 font-bold drop-shadow-lg",
                              lightText ? "text-gray-900" : "text-white"
                            )}
                          />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Selected Color Info */}
            {selectedColor && (
              <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700">
                <div className="text-xs text-neutral-600 dark:text-neutral-400 space-y-1">
                  <div className="flex justify-between">
                    <span className="font-medium">Name:</span>
                    <span>{selectedColor.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Code:</span>
                    <span className="font-mono">{selectedColor.code}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
};
