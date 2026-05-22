"use client";

import React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { SelectWithAddNew } from "./select-with-add-new";
import { CategoryOption } from "@/types/product-form";
import { FieldErrors } from "react-hook-form";

interface CategorySectionProps {
  selectedCategory: number | null;
  categoryOptions: CategoryOption[];
  isCategoryLoading: boolean;
  onCategoryChange: (value: CategoryOption | null) => void;
  onAddCategory: (data: { name: string }) => Promise<void>;
  errors: FieldErrors;
}

export function CategorySection({
  selectedCategory,
  categoryOptions,
  isCategoryLoading,
  onCategoryChange,
  onAddCategory,
  errors,
}: CategorySectionProps) {
  const selectedCategoryOption =
    categoryOptions.find((cat) => Number(cat.id) === selectedCategory) ||
    null;

  return (
    <Card className="bg-default-100 w-[30%] min-w-[380px] max-lg:w-full flex flex-col gap-3">
      <CardContent className="flex flex-col gap-3">
        <SelectWithAddNew<CategoryOption>
          label="Category"
          value={selectedCategoryOption}
          onChange={(value) => onCategoryChange(value)}
          options={categoryOptions}
          isLoading={isCategoryLoading}
          onAddNew={onAddCategory}
          renderOption={(cat) => cat.name}
          getOptionId={(cat) => cat.id}
          placeholder="Select a Category"
          searchPlaceholder="Search category..."
          error={errors.category?.message as string | undefined}
          type="category"
        />
      </CardContent>
    </Card>
  );
}
