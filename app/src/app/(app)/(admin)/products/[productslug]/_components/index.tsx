"use client";

import React, {
  useState,
  useRef,
  useCallback,
  DragEvent,
  useEffect,
  useMemo,
} from "react";
import { useForm, useFieldArray } from "react-hook-form";

import {
  useCategoryViewQuery,
  useProductsViewQuery,
  useProductsUpdateMutation,
  useVariantDeleteMutation,
  useAddVariantAttributeMutation,
  useVariantAttributesQuery,
} from "@/lib/store/Service/api";
import { cn, delay } from "@/lib/utils";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { toast } from "sonner";
import { ChevronDown, Trash as DeleteIcon } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Label } from "@/components/ui/label";
import GlobalInput from "@/components/global/input";
import { ColorPickerField } from "@/components/admin/color-picker-field";
import { useAuthUser } from "@/hooks/use-auth-user";
import DeleteProduct from "./delete-product";
import Uploader from "./image-uploader";
import {
  getVariantOptionLabel,
} from "@/lib/variant-attributes";
import { VariantAttributeDefinition } from "@/types/product";

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

interface GetCategory {
  id: string;
  name: string;
  categoryslug: string;
}

const schema = z
  .object({
    id: z.string().nonempty("Product ID is required"),
    productName: z.string().nonempty("Product name is required"),
    description: z.string().nonempty("Description is required"),
    isMultiVariant: z.boolean(),
    category: z.number(),
    basePrice: z.number().optional().nullable(),
    stock: z.number().int().nonnegative().optional().nullable(),
    discount: z.number().min(0).optional().nullable(),
    variants: z.array(
      z.object({
        id: z.string().optional(),
        size: z.string().optional().nullable(),
        color_code: z.string().optional().nullable(),
        color_name: z.string().optional().nullable(),
        attributes: z
          .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
          .optional()
          .nullable(),
        price: z.number().positive("Price must be positive"),
        stock: z.number().int().nonnegative("Stock must be non-negative"),
        discount: z.number().min(0).max(100).optional().nullable(),
      }),
    ),
  })
  .superRefine((data, ctx) => {
    if (data.isMultiVariant && (!data.variants || data.variants.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["variants"],
        message: "Variants are required when the product is multi-variant",
      });
    } else if (!data.isMultiVariant) {
      if (data.basePrice === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["basePrice"],
          message:
            "Base price is required when the product is not multi-variant",
        });
      }
      if (data.stock === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["stock"],
          message: "Stock is required when the product is not multi-variant",
        });
      }
    }
  });

interface FormValues {
  id: string;
  productName: string;
  description: string;
  isMultiVariant: boolean;
  category: number;
  subCategory: number;
  basePrice?: number | null;
  stock?: number | null;
  discount?: number | null;
    variants?: Array<{
    id?: string;
    size?: string;
    color_code?: string;
    color_name?: string;
    attributes?: Record<string, string | number | boolean | null>;
    price: number;
    stock: number;
    discount?: number;
  }>;
}

interface ImageData {
  id: string | null;
  src: string;
  color?: string | null;
  variant?: number | null;
}

interface AvailableColor {
  code: string;
  name: string;
}

const ProductPage = ({ productslug }: { productslug: string }) => {
  const { accessToken } = useAuthUser();
  const [images, setImages] = useState<ImageData[]>([]);
  const [productImages, setProductImages] = useState<File[]>([]);
  const [isMultiVariant, setIsMultiVariant] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data } = useCategoryViewQuery({});
  const { data: productData, refetch } = useProductsViewQuery(
    { productslug, token: accessToken },
    { skip: !productslug },
  );
  const { data: variantAttributes = [] } = useVariantAttributesQuery({
    token: accessToken,
  });
  const [updateProduct] = useProductsUpdateMutation();
  const [deleteVariant] = useVariantDeleteMutation();
  const [addVariantAttribute] = useAddVariantAttributeMutation();
  const getcategory = useMemo(() => (data as GetCategory[]) || [], [data]);
  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
    setValue,
    watch,
    control,
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      discount: 0,
      variants: [{ discount: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "variants",
  });

  useEffect(() => {
    setValue("isMultiVariant", isMultiVariant);
    if (isMultiVariant) {
      setValue("basePrice", null);
      setValue("stock", null);
      setValue("discount", null);
    } else {
      setValue("variants", []);
    }
  }, [isMultiVariant, setValue]);

  // const toggleVariantType = (isMulti: boolean) => {
  //   setIsMultiVariant(isMulti);
  //   if (isMulti && fields.length === 0) {
  //     append({ size: "", price: 0, stock: 0, discount: 1 });
  //   } else {
  //     remove(Array.from({ length: fields.length }, (_, i) => i));
  //   }
  // };

  const handleBlur = (name: any) => {
    trigger(name);
  };

  const validateFile = (file: File): boolean => {
    const isValidSize = file.size <= 50 * 1024 * 1024;
    const isValidType = file.type === "image/png";
    return isValidSize && isValidType;
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    setIsDragging(false);
    setDraggingIndex(null);
    handleFiles(e.dataTransfer.files, index);
  };

  const handleFiles = (files: FileList, index: number) => {
    const newImages = [...images];
    const newProductImages = [...productImages];
    const maxImages = 5;
    let newIndex = index;

    Array.from(files).forEach((file) => {
      if (validateFile(file) && newImages.length < maxImages) {
        setLoadingIndex(newIndex);
        newProductImages.push(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          newImages[newIndex] = { id: null, src: e.target?.result as string };
          newIndex++;
          setImages([...newImages]);
          setLoadingIndex(null);
        };
        reader.readAsDataURL(file);
      } else {
        toast.success(
          "Invalid File Format. Please upload a PNG image with a maximum size of 10MB.",
        );
      }
    });
    setProductImages(newProductImages);
    setTimeout(() => setLoadingIndex(null), 2000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFiles(files, draggingIndex || 0);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    setIsDragging(true);
    setDraggingIndex(index);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
    setDraggingIndex(null);
  };

  const handleImageUpload = (index: number) => {
    setDraggingIndex(index);
    fileInputRef.current?.click();
  };

  const onSubmit = async (data: FormValues) => {
    const cleanedData = { ...data };

    if (data.isMultiVariant) {
      delete cleanedData.basePrice;
      delete cleanedData.stock;
      delete cleanedData.discount;
    } else {
      delete cleanedData.variants;
    }

    const toastId = toast.loading("Preparing data...", {
      position: "top-center",
    });

    try {
      const formData = new FormData();
      formData.append("product_name", cleanedData.productName || "");
      formData.append("description", cleanedData.description || "");
      formData.append("is_multi_variant", String(cleanedData.isMultiVariant));
      formData.append("category", String(cleanedData.category ?? ""));

      if (!cleanedData.isMultiVariant) {
        formData.append("id", cleanedData.id || "");
        formData.append("price", String(cleanedData.basePrice ?? 0));
        formData.append("size", "0");
        formData.append("stock", String(cleanedData.stock ?? 0));
        formData.append("discount", String(cleanedData.discount ?? 0));
      } else {
        cleanedData.variants?.forEach((variant, index) => {
          formData.append(`variants[${index}][id]`, variant.id || "");
          formData.append(`variants[${index}][size]`, variant.size || "");
          formData.append(
            `variants[${index}][color_code]`,
            variant.color_code || "",
          );
          formData.append(
            `variants[${index}][color_name]`,
            variant.color_name || "",
          );
          if (variant.attributes) {
            Object.entries(variant.attributes).forEach(([key, value]) => {
              if (value !== null && value !== undefined && value !== "") {
                formData.append(
                  `variants[${index}][attributes][${key}]`,
                  String(value),
                );
              }
            });
          }
          formData.append(
            `variants[${index}][price]`,
            String(variant.price ?? 0),
          );
          formData.append(
            `variants[${index}][stock]`,
            String(variant.stock ?? 0),
          );
          formData.append(
            `variants[${index}][discount]`,
            String(variant.discount ?? 0),
          );
        });
      }

      setTimeout(() => {
        toast.loading("Uploading Product Details...", {
          id: toastId,
          position: "top-center",
        });
      }, 500);

      await new Promise((resolve) => setTimeout(resolve, 500));

      toast.loading("Uploading Product Details...", {
        id: toastId,
        position: "top-center",
      });

      await new Promise((resolve) => setTimeout(resolve, 500));

      toast.loading("Compressing Images...", {
        id: toastId,
        position: "top-center",
      });
      const res = await updateProduct({
        formData,
        token: accessToken,
        id: productData?.id,
      });
      if (res.data) {
        refetch();
        toast.success("Product updated successfully!", {
          id: toastId,
          position: "top-center",
        });
      } else if (res.error) {
        toast.error("Failed to update product", {
          id: toastId,
          position: "top-center",
        });
      }
    } catch (error: any) {
      console.error("Product update error:", error);
      toast.error(error?.message || "Error updating product", {
        id: toastId,
        position: "top-center",
      });
    }
  };

  const handleVariantDelete = async (variantId: string) => {
    try {
      const toastId = toast.loading("Deleting Variant...", {
        position: "top-center",
      });
      await delay(500);
      const res = await deleteVariant({
        token: accessToken,
        id: variantId,
      });
      if (res.data) {
        refetch();
        toast.success("Variant deleted successfully!", {
          id: toastId,
          position: "top-center",
        });
      } else {
        toast.error("Failed to delete variant", {
          id: toastId,
          position: "top-center",
        });
      }
    } catch (error) {
      toast.error("Failed to delete variant", {
        position: "top-center",
      });
    }
  };

  const selectedCategory = watch("category");

  // Extract unique colors from variants for image tagging
  const watchedVariants = watch("variants");
  const variantsColorKey = JSON.stringify(
    (watchedVariants || []).map((v: any) => [v?.color_code, v?.color_name]),
  );
  const availableColors: AvailableColor[] = useMemo(() => {
    if (!watchedVariants || !Array.isArray(watchedVariants)) return [];
    const colorMap = new Map<string, AvailableColor>();
    watchedVariants.forEach((v: any) => {
      if (v?.color_code && v?.color_name) {
        colorMap.set(v.color_code, { code: v.color_code, name: v.color_name });
      }
    });
    return Array.from(colorMap.values());
  }, [variantsColorKey]);
  const availableVariants = useMemo(() => {
    if (!watchedVariants || !Array.isArray(watchedVariants)) return [];
    return watchedVariants.map((variant: any, index: number) => ({
      id: String(variant?.id || ""),
      label: getVariantOptionLabel(variant) || `Variant ${index + 1}`,
      colorCode: variant?.color_code || null,
    })).filter((variant) => variant.id);
  }, [watchedVariants]);

  useEffect(() => {
    if (productData) {
      setImages(
        productData.images.map((img: any) => ({
          id: img.id,
          src: img.image,
          color: img.color || null,
          variant: img.variant || null,
        })),
      );
      if (Array.isArray(productData.variants)) {
        setIsMultiVariant(true);
        reset({ variants: [] });
        productData.variants.forEach((variant: any) => {
          append({
            id: String(variant.id),
            size: variant.size,
            color_code: variant.color_code,
            color_name: variant.color_name,
            attributes: variant.attributes || {},
            price: parseFloat(variant.price),
            stock: variant.stock,
            discount: parseFloat(variant.discount),
          });
        });
      } else {
        setIsMultiVariant(false);
        setValue("basePrice", parseFloat(productData.variants.price));
        setValue("stock", productData.variants.stock);
        setValue("discount", parseFloat(productData.variants.discount));
      }
      setValue("id", String(productData.id));
      setValue("productName", productData.product_name);
      setValue("description", productData.description);
      setValue("category", productData.category);
    }
  }, [productData]);

  const [open, setOpen] = useState<boolean>(false);
  const [cat, setCat] = useState<boolean>(false);
  const [isAddingOption, setIsAddingOption] = useState(false);
  const [newOptionLabel, setNewOptionLabel] = useState("");
  const [newOptionType, setNewOptionType] = useState<"text" | "number" | "select">(
    "text",
  );
  const normalizedAttributes: VariantAttributeDefinition[] = useMemo(() => {
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
    [...fallback, ...(variantAttributes as VariantAttributeDefinition[])].forEach(
      (attribute) => byKey.set(attribute.key, attribute),
    );
    return Array.from(byKey.values()).sort(
      (a, b) => a.position - b.position || a.label.localeCompare(b.label),
    );
  }, [variantAttributes]);
  const colorAttribute = normalizedAttributes.find((item) => item.key === "color");
  const sizeAttribute = normalizedAttributes.find((item) => item.key === "size");
  const customAttributes = normalizedAttributes.filter(
    (item) => item.key !== "color" && item.key !== "size",
  );

  const handleAddVariantAttribute = useCallback(async () => {
    const label = newOptionLabel.trim();
    if (!label) return;
    const key = label.toLowerCase().replace(/[\s-]+/g, "_");
    try {
      await addVariantAttribute({
        actualData: {
          key,
          label,
          type: newOptionType,
          filterable: true,
        },
        token: accessToken,
      }).unwrap();
      setNewOptionLabel("");
      setNewOptionType("text");
      setIsAddingOption(false);
      toast.success("Variant option added");
    } catch (error) {
      toast.error("Could not add variant option");
    }
  }, [accessToken, addVariantAttribute, newOptionLabel, newOptionType]);

  const onFormError = useCallback((formErrors: any) => {
    console.error("Form validation errors:", formErrors);
    const messages: string[] = [];
    if (formErrors.id) messages.push(`ID: ${formErrors.id.message}`);
    if (formErrors.productName)
      messages.push(`Name: ${formErrors.productName.message}`);
    if (formErrors.description)
      messages.push(`Description: ${formErrors.description.message}`);
    if (formErrors.category)
      messages.push(`Category: ${formErrors.category.message}`);
    if (formErrors.basePrice)
      messages.push(`Price: ${formErrors.basePrice.message}`);
    if (formErrors.stock) messages.push(`Stock: ${formErrors.stock.message}`);
    if (formErrors.variants) {
      if (formErrors.variants.message) {
        messages.push(`Variants: ${formErrors.variants.message}`);
      } else if (Array.isArray(formErrors.variants)) {
        formErrors.variants.forEach((v: any, i: number) => {
          if (v) {
            Object.entries(v).forEach(([key, val]: [string, any]) => {
              if (val?.message)
                messages.push(`Variant ${i + 1} ${key}: ${val.message}`);
            });
          }
        });
      }
    }
    toast.error(
      messages.length > 0
        ? messages.join(", ")
        : "Please fix form errors before submitting",
      {
        position: "top-center",
      },
    );
  }, []);

  return (
    <form
      className="flex flex-col gap-5 px-2 md:px-5 pb-5 w-full h-[90dvh]"
      onSubmit={handleSubmit(onSubmit, onFormError)}
    >
      <span className="md:absolute right-2 top-2 flex gap-2 ">
        <Button className="" type="submit">
          Update Product
        </Button>
        {accessToken && (
          <DeleteProduct
            token={accessToken}
            refetch={refetch}
            id={productData?.id}
            active={productData?.deactive}
          />
        )}
      </span>
      <span className="flex w-full gap-5 max-lg:flex-col ">
        <Card className="bg-default-100 w-[70%] max-lg:w-full p-3 flex flex-col gap-3">
          <CardHeader>
            <h1>General information</h1>
          </CardHeader>
          <CardContent className="flex gap-5 w-full flex-col">
            <GlobalInput
              label="Product Name"
              placeholder="buddha statue"
              className="bg-white dark:bg-neutral-900"
              error={errors.productName?.message}
              type="text"
              {...register("productName", {
                onBlur: () => handleBlur("productName"),
              })}
            />
            <div className="space-y-2">
              <Label htmlFor="description">Product Description</Label>
              <Textarea
                className="bg-white dark:bg-neutral-900 min-h-[200px] max-h-[200px]"
                {...register("description", {
                  onBlur: () => handleBlur("description"),
                })}
                placeholder="Enter your description"
              />
            </div>
            <span className="flex gap-2 flex-col">
              <h1>Product Type</h1>
              <span className="flex gap-3">
                <Button
                  type="button"
                  variant={isMultiVariant ? "secondary" : "active"}
                >
                  Single Variant
                </Button>
                <Button
                  type="button"
                  variant={!isMultiVariant ? "secondary" : "active"}
                >
                  Multi Variant
                </Button>
              </span>
            </span>
          </CardContent>
        </Card>
        <Card className="bg-default-100 w-[30%] min-w-[380px] max-lg:w-full flex flex-col gap-3">
          <CardHeader>
            <span className="flex w-full justify-between px-1">
              <h1>Images</h1>
            </span>
          </CardHeader>
          <CardContent className="flex gap-5 flex-wrap">
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              accept="image/png"
              onChange={handleInputChange}
              multiple
            />
            <div className="flex w-full gap-5 flex-col h-full custom-md:flex-row">
              <Button
                type="button"
                variant="secondary"
                className={`group bg-white w-full h-80 flex justify-center items-center p-0 custom-md:w-[50%] dark:bg-neutral-900 hover:dark:!bg-neutral-800 ${
                  isDragging && draggingIndex === 0 ? "dragging" : ""
                }`}
                onDrop={(e: any) => !images[0] && handleDrop(e, 0)}
                onDragOver={(e: any) => !images[0] && handleDragOver(e, 0)}
                onDragLeave={() => !images[0] && handleDragLeave()}
                onClick={() => !images[0] && handleImageUpload(0)}
              >
                {loadingIndex === 0 ? (
                  <Spinner color="secondary" />
                ) : images[0] ? (
                  <Uploader
                    images={images[0]}
                    token={accessToken}
                    product="h-80 w-full max-lg:h-full max-lg:w-full object-contain"
                    className=" w-4 h-4 absolute right-1 top-1  hidden group-hover:flex transition duration-500"
                    availableColors={availableColors}
                    availableVariants={availableVariants}
                  />
                ) : (
                  "Click or Drop here"
                )}
              </Button>
              <div className="flex items-center justify-center gap-3 custom-md:w-[50%] flex-wrap">
                {[1, 2, 3, 4].map((index) => (
                  <Button
                    type="button"
                    variant="secondary"
                    key={index}
                    className={`group bg-white w-20 h-20 items-center justify-center custom-md:w-[48%] custom-md:h-[48%] p-0 dark:bg-neutral-900 hover:dark:!bg-zinc-800 svg:hidden hover::svg:flex ${
                      isDragging && draggingIndex === index ? "dragging" : ""
                    }`}
                    onDrop={(e: any) => !images[index] && handleDrop(e, index)}
                    onDragOver={(e: any) =>
                      !images[index] && handleDragOver(e, index)
                    }
                    onDragLeave={() => !images[index] && handleDragLeave()}
                    onClick={() => !images[index] && handleImageUpload(index)}
                  >
                    {loadingIndex === index ? (
                      <Spinner color="secondary" />
                    ) : images[index] ? (
                      <Uploader
                        images={images[index]}
                        token={accessToken}
                        className=" w-4 h-4 absolute right-1 top-1  hidden group-hover:flex transition duration-500"
                        availableColors={availableColors}
                        availableVariants={availableVariants}
                      />
                    ) : (
                      "+"
                    )}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </span>
      <span className="flex w-full gap-5 max-lg:flex-col pb-5">
        <Card className="bg-default-100 w-[70%] max-lg:w-full flex flex-col gap-3">
          <CardHeader>
            <h1>Pricing And Stock</h1>
          </CardHeader>
          <CardContent className="flex gap-5 w-full max-xxl:w-full flex-col">
            {!isMultiVariant ? (
              <span className="flex gap-5 w-full flex-col md:flex-row">
                <GlobalInput
                  label="Price"
                  placeholder="रु 12"
                  className="bg-white dark:bg-neutral-900 w-full "
                  base="w-full"
                  error={errors.basePrice?.message}
                  type="text"
                  {...register("basePrice", {
                    valueAsNumber: true,
                    onBlur: () => handleBlur("basePrice"),
                  })}
                />
                <GlobalInput
                  label="Stock"
                  placeholder="stock"
                  className="bg-white dark:bg-neutral-900 w-full "
                  base="w-full"
                  error={errors.stock?.message}
                  type="text"
                  {...register("stock", {
                    valueAsNumber: true,
                    onBlur: () => handleBlur("stock"),
                  })}
                />
                <GlobalInput
                  label="Discount"
                  placeholder="discount"
                  className="bg-white dark:bg-neutral-900 w-full "
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
                        Color and size are locked defaults. Add custom options
                        like flavor, weight, pack, or material.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddingOption((value) => !value)}
                    >
                      Add Option
                    </Button>
                  </div>
                  {isAddingOption && (
                    <div className="grid gap-2 md:grid-cols-[1fr_160px_auto]">
                      <GlobalInput
                        label="Option Name"
                        placeholder="e.g., Flavor"
                        className="bg-white dark:bg-neutral-900 w-full"
                        value={newOptionLabel}
                        onChange={(event: any) =>
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
                      <Button
                        type="button"
                        className="self-end"
                        onClick={handleAddVariantAttribute}
                      >
                        Save
                      </Button>
                    </div>
                  )}
                </div>
                {fields.map((variant, index) => {
                  const watchedColor = watch(`variants.${index}.color_code`);
                  const watchedColorName = watch(
                    `variants.${index}.color_name`,
                  );
                  return (
                    <div key={variant.id} className="flex gap-5 flex-col">
                      <div className="flex gap-5 flex-col md:flex-row">
                        {sizeAttribute && (
                          <div className="w-full md:flex-1">
                          <GlobalInput
                            label={`${sizeAttribute.label} (optional)`}
                            placeholder="e.g., 250g, M, Large"
                            className="bg-white dark:bg-neutral-900 w-full"
                            error={errors.variants?.[index]?.size?.message}
                            {...register(`variants.${index}.size`, {
                              onBlur: () =>
                                handleBlur(`variants[${index}].size`),
                            })}
                          />
                          </div>
                        )}
                        {colorAttribute && (
                          <div className="w-full md:flex-1">
                          <ColorPickerField
                            label={`${colorAttribute.label} (optional)`}
                            value={
                              (typeof watchedColor === "string" &&
                                watchedColor) ||
                              ""
                            }
                            colorName={
                              (typeof watchedColorName === "string" &&
                                watchedColorName) ||
                              ""
                            }
                            onChange={(colorCode, colorName) => {
                              setValue(
                                `variants.${index}.color_code`,
                                colorCode || "",
                              );
                              setValue(
                                `variants.${index}.color_name`,
                                colorName || "",
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
                            error={
                              errors.variants?.[index]?.color_code?.message
                            }
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
                                    handleBlur(
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
                            onBlur: () =>
                              handleBlur(`variants[${index}].price`),
                          })}
                        />
                        <GlobalInput
                          label="Stock"
                          placeholder="Stock"
                          className="bg-white dark:bg-neutral-900 w-full"
                          error={errors.variants?.[index]?.stock?.message}
                          {...register(`variants.${index}.stock`, {
                            valueAsNumber: true,
                            onBlur: () =>
                              handleBlur(`variants[${index}].stock`),
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
                            errors.variants?.[index] ? "self-center" : ""
                          }`}
                        >
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                type="button"
                                variant="destructive"
                                className="w-full md:w-auto p-2"
                                disabled={fields.length === 1}
                              >
                                <DeleteIcon className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Are you absolutely sure?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will
                                  permanently delete variant data and remove it
                                  from our servers.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    const variantId =
                                      watch(`variants.${index}.id`) ?? "";
                                    handleVariantDelete(variantId);
                                  }}
                                >
                                  Continue
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </span>
                      </div>
                    </div>
                  );
                })}
                <Button
                  type="button"
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
          </CardContent>
        </Card>
        <Card className="bg-default-100 w-[30%] min-w-[380px] max-lg:w-full flex flex-col gap-3">
          <CardContent className="flex flex-col gap-3">
            <span className="flex w-full gap-3 justify-center flex-col">
              <span className="flex w-full gap-3 items-end justify-center">
                <span className="flex-col w-full space-y-2">
                  <Label>Category</Label>
                  <Popover open={cat} onOpenChange={setCat}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="secondary"
                        role="combobox"
                        aria-expanded={open}
                        className={cn(
                          "rounded-lg w-full justify-between dark:bg-neutral-900 px-3 font-normal outline-offset-0 hover:bg-background focus-visible:border-ring focus-visible:outline-[3px] focus-visible:outline-ring/20",
                          cat &&
                            "ring-2 ring-offset-2 ring-offset-default-100 dark:ring-offset-black ring-neutral-700",
                        )}
                      >
                        {!selectedCategory
                          ? "Select a Category"
                          : getcategory.find(
                              (cat) =>
                                cat.id.toString() ==
                                selectedCategory.toString(),
                            )?.name}
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
                        <CommandInput placeholder="Search category..." />
                        <CommandList>
                          <CommandEmpty>No category found.</CommandEmpty>
                          <CommandGroup>
                            {getcategory.map(({ id, name }) => (
                              <CommandItem
                                key={id}
                                value={id}
                                className="rounded-lg"
                                onSelect={(value: any) => {
                                  setValue("category", Number(id));
                                  setCat(false);
                                }}
                              >
                                {name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </span>
              </span>
              {errors.category && (
                <p className="text-red-500">{errors.category.message}</p>
              )}
            </span>
          </CardContent>
        </Card>
      </span>
    </form>
  );
};

export default ProductPage;
