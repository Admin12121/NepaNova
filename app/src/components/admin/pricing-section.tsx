"use client";

import React from "react";
import {
  FieldErrors,
  UseFormRegister,
  UseFieldArrayReturn,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import { ProductFormValues } from "@/schemas/product";
import GlobalInput from "@/components/global/input";
import { ColorPickerField } from "./color-picker-field";
import { Button } from "@/components/ui/button";
import { Trash as DeleteIcon } from "lucide-react";

interface PricingSectionProps {
  isMultiVariant: boolean;
  register: UseFormRegister<ProductFormValues>;
  errors: FieldErrors<ProductFormValues>;
  fields: UseFieldArrayReturn<ProductFormValues, "variants">["fields"];
  append: UseFieldArrayReturn<ProductFormValues, "variants">["append"];
  remove: UseFieldArrayReturn<ProductFormValues, "variants">["remove"];
  onBlur: (name: any) => void;
  setValue?: UseFormSetValue<ProductFormValues>;
  watch?: UseFormWatch<ProductFormValues>;
}

export function PricingSection({
  isMultiVariant,
  register,
  errors,
  fields,
  append,
  remove,
  onBlur,
  setValue,
  watch,
}: PricingSectionProps) {
  // Watch variants to get real-time updates when form values change
  const watchedVariants = watch ? watch("variants") : fields;
  return (
    <div className="flex gap-5 w-full max-xxl:w-full flex-col">
      {!isMultiVariant ? (
        <span className="flex gap-5 w-full flex-col md:flex-row">
          <GlobalInput
            label="Price"
            placeholder="रु 12"
            className="bg-white dark:bg-neutral-900 w-full"
            base="w-full"
            error={errors.basePrice?.message}
            type="text"
            {...register("basePrice", {
              valueAsNumber: true,
              onBlur: () => onBlur("basePrice"),
            })}
          />
          <GlobalInput
            label="Stock"
            placeholder="stock"
            className="bg-white dark:bg-neutral-900 w-full"
            base="w-full"
            error={errors.stock?.message}
            type="text"
            {...register("stock", {
              valueAsNumber: true,
              onBlur: () => onBlur("stock"),
            })}
          />
          <GlobalInput
            label="Discount"
            placeholder="discount"
            className="bg-white dark:bg-neutral-900 w-full"
            base="w-full"
            error={errors.discount?.message}
            type="text"
            {...register("discount", {
              valueAsNumber: true,
            })}
          />
        </span>
      ) : (
        <span className="flex gap-5 flex-col">
          {watchedVariants?.map((variant, index) => (
            <div key={index} className="flex gap-5 flex-col">
              <div className="flex gap-5 flex-col md:flex-row">
                <div className="w-full md:flex-1">
                  <GlobalInput
                    label="Size (optional)"
                    placeholder="e.g., M, L, 15cm"
                    className="bg-white dark:bg-neutral-900 w-full"
                    error={errors.variants?.[index]?.size?.message}
                    {...register(`variants.${index}.size`, {
                      onBlur: () => onBlur(`variants[${index}].size`),
                    })}
                  />
                </div>
                {setValue && (
                  <div className="w-full md:flex-1">
                    <ColorPickerField
                      label="Color (optional)"
                      value={
                        (typeof variant?.color_code === "string" &&
                          variant.color_code) ||
                        ""
                      }
                      colorName={
                        (typeof variant?.color_name === "string" &&
                          variant.color_name) ||
                        ""
                      }
                      onChange={(colorCode, colorName) => {
                        setValue(
                          `variants.${index}.color_code`,
                          colorCode || ""
                        );
                        setValue(
                          `variants.${index}.color_name`,
                          colorName || ""
                        );
                      }}
                      error={errors.variants?.[index]?.color_code?.message}
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-5 flex-col md:flex-row">
                <GlobalInput
                  label="Price"
                  placeholder="Price"
                  className="bg-white dark:bg-neutral-900 w-full"
                  error={errors.variants?.[index]?.price?.message}
                  {...register(`variants.${index}.price`, {
                    valueAsNumber: true,
                    onBlur: () => onBlur(`variants[${index}].price`),
                  })}
                />
                <GlobalInput
                  label="Stock"
                  placeholder="Stock"
                  className="bg-white dark:bg-neutral-900 w-full"
                  error={errors.variants?.[index]?.stock?.message}
                  {...register(`variants.${index}.stock`, {
                    valueAsNumber: true,
                    onBlur: () => onBlur(`variants[${index}].stock`),
                  })}
                />
                <GlobalInput
                  label="Discount"
                  placeholder="Discount"
                  className="bg-white dark:bg-neutral-900 w-full"
                  error={errors.variants?.[index]?.discount?.message}
                  {...register(`variants.${index}.discount`, {
                    valueAsNumber: true,
                  })}
                />
                <span
                  className={`flex items-end justify-end ${
                    errors.variants?.[index] ? "self-center" : "mb-1"
                  }`}
                >
                  <Button
                    variant="destructive"
                    className="w-full md:w-auto p-2"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                  >
                    <DeleteIcon className="w-4 h-4" />
                  </Button>
                </span>
              </div>
            </div>
          ))}
          <Button
            variant="secondary"
            onClick={(e) => {
              e.preventDefault();
              append({ size: "", color_code: "", color_name: "", price: 0, stock: 0, discount: 0 });
            }}
          >
            Add Variant
          </Button>
        </span>
      )}
    </div>
  );
}
