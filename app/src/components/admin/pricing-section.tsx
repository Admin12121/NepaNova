"use client";

import React, { useMemo, useState } from "react";
import {
  FieldErrors,
  UseFormRegister,
  UseFieldArrayReturn,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import { ProductFormValues } from "@/schemas/product";
import { VariantAttributeDefinition } from "@/types/product";
import GlobalInput from "@/components/global/input";
import { ColorPickerField } from "./color-picker-field";
import { Button } from "@/components/ui/button";
import { Plus, Trash as DeleteIcon } from "lucide-react";
import { toast } from "sonner";

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
  variantAttributes?: VariantAttributeDefinition[];
  onAddVariantAttribute?: (attribute: {
    key: string;
    label: string;
    type: "text" | "number" | "select";
  }) => Promise<void>;
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
  variantAttributes = [],
  onAddVariantAttribute,
}: PricingSectionProps) {
  const [isAddingOption, setIsAddingOption] = useState(false);
  const [newOptionLabel, setNewOptionLabel] = useState("");
  const [newOptionType, setNewOptionType] = useState<"text" | "number" | "select">(
    "text",
  );
  // Watch variants to get real-time updates when form values change
  const watchedVariants = watch ? watch("variants") : fields;
  const normalizedAttributes = useMemo(() => {
    const fallback: VariantAttributeDefinition[] = [
      {
        id: -1,
        key: "color",
        label: "Color",
        type: "color",
        required: false,
        filterable: true,
        is_system: true,
        is_locked: true,
        position: 10,
      },
      {
        id: -2,
        key: "size",
        label: "Size",
        type: "select",
        required: false,
        filterable: true,
        is_system: true,
        is_locked: true,
        position: 20,
      },
    ];
    const byKey = new Map<string, VariantAttributeDefinition>();
    [...fallback, ...variantAttributes].forEach((attribute) => {
      byKey.set(attribute.key, attribute);
    });
    return Array.from(byKey.values()).sort(
      (a, b) => a.position - b.position || a.label.localeCompare(b.label),
    );
  }, [variantAttributes]);
  const colorAttribute = normalizedAttributes.find((item) => item.key === "color");
  const sizeAttribute = normalizedAttributes.find((item) => item.key === "size");
  const customAttributes = normalizedAttributes.filter(
    (item) => item.key !== "color" && item.key !== "size",
  );

  const addCustomOption = async () => {
    const label = newOptionLabel.trim();
    if (!label || !onAddVariantAttribute) {
      return;
    }
    const key = label.toLowerCase().replace(/[\s-]+/g, "_");
    try {
      await onAddVariantAttribute({ key, label, type: newOptionType });
      setNewOptionLabel("");
      setNewOptionType("text");
      setIsAddingOption(false);
      toast.success("Variant option added");
    } catch (error) {
      toast.error("Could not add variant option");
    }
  };

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
          <div className="flex flex-col gap-2 rounded-md border border-dashed border-neutral-200 p-3 dark:border-neutral-800">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Variant options</p>
                <p className="text-xs text-neutral-500">
                  Color and size are locked defaults. Add custom options like
                  flavor, weight, pack, or material.
                </p>
              </div>
              {onAddVariantAttribute && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingOption((value) => !value)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Option
                </Button>
              )}
            </div>
            {isAddingOption && (
              <div className="grid gap-2 md:grid-cols-[1fr_160px_auto]">
                <GlobalInput
                  label="Option Name"
                  placeholder="e.g., Flavor"
                  className="bg-white dark:bg-neutral-900 w-full"
                  value={newOptionLabel}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setNewOptionLabel(event.target.value)
                  }
                />
                <label className="flex flex-col gap-2 text-sm">
                  Type
                  <select
                    value={newOptionType}
                    onChange={(event) =>
                      setNewOptionType(
                        event.target.value as "text" | "number" | "select",
                      )
                    }
                    className="h-10 rounded-md border border-input bg-white px-3 text-sm dark:bg-neutral-900"
                  >
                    <option value="text">Text</option>
                    <option value="select">Select</option>
                    <option value="number">Number</option>
                  </select>
                </label>
                <Button type="button" className="self-end" onClick={addCustomOption}>
                  Save
                </Button>
              </div>
            )}
          </div>
          {watchedVariants?.map((variant, index) => (
            <div key={index} className="flex gap-5 flex-col">
              <div className="flex gap-5 flex-col md:flex-row">
                {sizeAttribute && (
                  <div className="w-full md:flex-1">
                  <GlobalInput
                    label={`${sizeAttribute.label} (optional)`}
                    placeholder="e.g., 250g, M, Large"
                    className="bg-white dark:bg-neutral-900 w-full"
                    error={errors.variants?.[index]?.size?.message}
                    {...register(`variants.${index}.size`, {
                      onBlur: () => onBlur(`variants[${index}].size`),
                    })}
                  />
                  </div>
                )}
                {setValue && colorAttribute && (
                  <div className="w-full md:flex-1">
                    <ColorPickerField
                      label={`${colorAttribute.label} (optional)`}
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
                        setValue(
                          `variants.${index}.attributes.color` as any,
                          colorCode || "",
                        );
                        setValue(
                          `variants.${index}.attributes.color_name` as any,
                          colorName || "",
                        );
                      }}
                      error={errors.variants?.[index]?.color_code?.message}
                    />
                  </div>
                )}
              </div>
              {customAttributes.length > 0 && (
                <div className="grid gap-5 md:grid-cols-2">
                  {customAttributes.map((attribute) => (
                    <GlobalInput
                      key={attribute.key}
                      label={`${attribute.label} (optional)`}
                      placeholder={`Enter ${attribute.label.toLowerCase()}`}
                      className="bg-white dark:bg-neutral-900 w-full"
                      type={attribute.type === "number" ? "number" : "text"}
                      {...register(
                        `variants.${index}.attributes.${attribute.key}` as any,
                        {
                          onBlur: () =>
                            onBlur(
                              `variants[${index}].attributes.${attribute.key}`,
                            ),
                        },
                      )}
                    />
                  ))}
                </div>
              )}
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
              append({
                size: "",
                color_code: "",
                color_name: "",
                attributes: {},
                price: 0,
                stock: 0,
                discount: 0,
              });
            }}
          >
            Add Variant
          </Button>
        </span>
      )}
    </div>
  );
}
