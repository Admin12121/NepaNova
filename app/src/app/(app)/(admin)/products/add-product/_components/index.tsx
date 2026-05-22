"use client";

import React, { useCallback, useMemo, useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import GlobalInput from "@/components/global/input";
import { useAuthUser } from "@/hooks/use-auth-user";

import { useProductForm } from "@/hooks/useProductForm";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useProductSubmit } from "@/hooks/useProductSubmit";
import { ImageUploadSection } from "@/components/admin/image-upload-section";
import { PricingSection } from "@/components/admin/pricing-section";
import { CategorySection } from "@/components/admin/category-section";

import {
  useAddCategoryMutation,
  useGetCategoryQuery,
} from "@/lib/store/Service/api";
import { CategoryOption } from "@/types/product-form";

const AddProduct = () => {
  const { accessToken = "" } = useAuthUser();
  const {
    form,
    fields,
    append,
    remove,
    isMultiVariant,
    toggleVariantType,
    handleBlur,
  } = useProductForm();

  // Create watch function for real-time color updates
  const watchVariants = form.watch;
  const {
    images,
    productImages,
    imageColors,
    isDragging,
    draggingIndex,
    loadingIndex,
    fileInputRef,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handleImageUpload,
    handleInputChange,
    removeImage,
    removeAllImages,
    setImageColor,
    clearImageColor,
  } = useImageUpload();

  // Extract unique colors from the current variants for image tagging
  const watchedVariants = form.watch("variants");
  const variantsColorKey = JSON.stringify(
    (watchedVariants || []).map((v: any) => [v?.color_code, v?.color_name]),
  );
  const availableColors = useMemo(() => {
    if (!watchedVariants || !Array.isArray(watchedVariants)) return [];
    const colorMap = new Map<string, { code: string; name: string }>();
    watchedVariants.forEach((v: any) => {
      if (v?.color_code && v?.color_name) {
        colorMap.set(v.color_code, {
          code: v.color_code,
          name: v.color_name,
        });
      }
    });
    return Array.from(colorMap.values());
  }, [variantsColorKey]);

  const { onSubmit: handleProductSubmit } = useProductSubmit(accessToken);

  // Category query
  const selectedCategory = form.watch("category");

  const {
    data: categoryData,
    isLoading: isCategoryLoading,
    refetch: refetchCategories,
  } = useGetCategoryQuery({ name: "" }, { skip: false });

  const [addCategory] = useAddCategoryMutation();

  // Convert API data to component types
  const categoryOptions: CategoryOption[] = (categoryData?.results || []).map(
    (cat: any) => ({
      id: cat.id,
      name: cat.name,
      categoryslug: cat.categoryslug,
    }),
  );

  const handleCategoryChange = useCallback(
    (value: CategoryOption | null) => {
      if (value) {
        form.setValue("category", Number(value.id));
      }
    },
    [form],
  );

  const handleAddCategory = useCallback(
    async (data: { name: string }) => {
      const { error } = await addCategory({
        formData: data,
        token: accessToken,
      });
      if (error) {
        throw error;
      }
      await refetchCategories();
    },
    [addCategory, accessToken, refetchCategories],
  );

  const onSubmit = useCallback(
    async (data: any) => {
      await handleProductSubmit(
        data,
        productImages,
        images,
        () => form.reset(),
        removeAllImages,
        imageColors,
      );
    },
    [
      handleProductSubmit,
      productImages,
      images,
      form,
      removeAllImages,
      imageColors,
    ],
  );

  return (
    <form
      className="flex flex-col gap-5 px-2 md:px-5 pb-5 w-full h-[90dvh]"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <Button className="absolute right-2 top-2" type="submit">
        Save Product
      </Button>
      <span className="flex w-full gap-5 max-lg:flex-col">
        <Card className="bg-default-100 w-[70%] max-lg:w-full p-3 flex flex-col gap-3">
          <CardHeader>
            <h1>General information</h1>
          </CardHeader>
          <CardContent className="flex gap-5 w-full flex-col">
            <GlobalInput
              label="Product Name"
              placeholder="buddha statue"
              className="bg-white dark:bg-neutral-900"
              error={form.formState.errors.productName?.message}
              type="text"
              {...form.register("productName", {
                onBlur: () => handleBlur("productName"),
              })}
            />
            <div className="space-y-2">
              <Label htmlFor="description">Product Description</Label>
              <Textarea
                className="bg-white dark:bg-neutral-900 min-h-[200px] max-h-[200px]"
                {...form.register("description", {
                  onBlur: () => handleBlur("description"),
                })}
                placeholder="Enter your description"
              />
            </div>
            <span className="flex gap-2 flex-col">
              <h1>Product Type</h1>
              <span className="flex gap-3">
                <Button
                  variant={isMultiVariant ? "secondary" : "active"}
                  onClick={(e) => {
                    e.preventDefault();
                    toggleVariantType(false);
                  }}
                >
                  Single Variant
                </Button>
                <Button
                  variant={!isMultiVariant ? "secondary" : "active"}
                  onClick={(e) => {
                    e.preventDefault();
                    toggleVariantType(true);
                  }}
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
              {images.length >= 1 && (
                <span
                  className="cursor-pointer"
                  onClick={() => removeAllImages()}
                >
                  Remove All
                </span>
              )}
            </span>
          </CardHeader>
          <CardContent>
            <ImageUploadSection
              images={images}
              productImages={productImages}
              isDragging={isDragging}
              draggingIndex={draggingIndex}
              loadingIndex={loadingIndex}
              fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onImageUpload={handleImageUpload}
              onRemoveImage={removeImage}
              onRemoveAll={removeAllImages}
              onInputChange={handleInputChange}
              availableColors={availableColors}
              imageColors={imageColors}
              onSetImageColor={setImageColor}
              onClearImageColor={clearImageColor}
            />
          </CardContent>
        </Card>
      </span>
      <span className="flex w-full gap-5 max-lg:flex-col pb-5">
        <Card className="bg-default-100 w-[70%] max-lg:w-full flex flex-col gap-3">
          <CardHeader>
            <h1>Pricing And Stock</h1>
          </CardHeader>
          <CardContent>
            <PricingSection
              isMultiVariant={isMultiVariant}
              register={form.register}
              errors={form.formState.errors}
              fields={fields}
              append={append}
              remove={remove}
              onBlur={handleBlur}
              setValue={form.setValue}
              watch={watchVariants}
            />
          </CardContent>
        </Card>
        <CategorySection
          selectedCategory={selectedCategory}
          categoryOptions={categoryOptions}
          isCategoryLoading={isCategoryLoading}
          onCategoryChange={handleCategoryChange}
          onAddCategory={handleAddCategory}
          errors={form.formState.errors}
        />
      </span>
    </form>
  );
};

export default AddProduct;
