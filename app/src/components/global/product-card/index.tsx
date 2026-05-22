"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Swiper, SwiperSlide } from "swiper/react";
import { useUpdateQueryParams } from "@/lib/query-params";
import React, { useState, useMemo, useDeferredValue, useEffect } from "react";
import { Autoplay, Navigation, Pagination, EffectFade } from "swiper/modules";

import { Star as FaStar } from "lucide-react";

import {
  Product,
  VariantObject,
  Image as InterfaceImage,
} from "@/types/product";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";
import WishList from "../wishlist-button";
import Cartbutton from "./cart-button";

interface Color {
  id: number;
  name: string;
  code: string;
}

interface ProductCardProps {
  data: Product;
  width?: string | null;
  base?: boolean;
}

interface SelectedColor {
  id: number;
  name: string;
  code: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  data,
  width,
  base,
}) => {
  const updateQueryParams = useUpdateQueryParams();
  const [variantsData, setVariantsData] = useState<
    VariantObject[] | VariantObject | null
  >(null);
  const [selectedColor, setSelectedColor] = useState<SelectedColor | null>(
    null,
  );
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Use backend colors if available, otherwise empty array
  const availableColors: Color[] =
    data.colors && data.colors.length > 0
      ? data.colors.map((color, index) => ({
          id: index + 1,
          name: color.color_name,
          code: color.color_code,
        }))
      : [];

  useEffect(() => {
    if (!data?.variants) return;

    if (Array.isArray(data.variants)) {
      setVariantsData(data.variants);
    } else {
      setVariantsData(data.variants);
      setSelectedSize(data.variants.size);
    }
  }, [data?.variants]);

  useEffect(() => {
    if (availableColors.length > 0 && !selectedColor) {
      setSelectedColor({
        id: availableColors[0].id,
        name: availableColors[0].name,
        code: availableColors[0].code,
      });
    }
  }, [availableColors, selectedColor]);

  useEffect(() => {
    if (!Array.isArray(variantsData) || !selectedColor) return;
    const variantsForColor = variantsData.filter(
      (v) => v.color_code === selectedColor.code,
    );
    const sizesForColor = variantsForColor
      .map((v) => v.size)
      .filter((s): s is string => s !== null);
    if (!selectedSize || !sizesForColor.includes(selectedSize)) {
      setSelectedSize(sizesForColor[0] || null);
    }
  }, [selectedColor, variantsData]);

  // Find the matched variant by color + size
  const matchedVariant = React.useMemo(() => {
    if (!Array.isArray(variantsData)) return variantsData || null;
    if (!selectedColor || !selectedSize) return variantsData[0] || null;
    return (
      variantsData.find(
        (v) => v.color_code === selectedColor.code && v.size === selectedSize,
      ) || null
    );
  }, [variantsData, selectedColor, selectedSize]);

  const convertedPrice = matchedVariant ? Number(matchedVariant.price) : 0;
  const discount = matchedVariant ? Number(matchedVariant.discount) : 0;
  const stocks = matchedVariant ? matchedVariant.stock : 0;

  const finalPrice =
    !convertedPrice || !discount
      ? convertedPrice
      : Number((convertedPrice - convertedPrice * (discount / 100)).toFixed(2));

  const displayImages = useMemo(() => {
    if (!data?.images) return [];
    if (!selectedColor) return data.images;
    const colorImages = data.images.filter(
      (img: any) => img.color === selectedColor.code,
    );
    return colorImages.length > 0 ? colorImages : data.images;
  }, [data?.images, selectedColor]);

  const productslug = data.productslug;

  const handleRoute = () => {
    updateQueryParams({ category: data?.categoryname }, "/collections");
  };

  return (
    <section className="relative w-full flex gap-5">
      <span
        className={cn(
          "relative rounded-lg overflow-hidden group grow isolation-auto z-10 svelte-483qmb p-1",
          "bg-white dark:bg-neutral-950",
          "flex flex-col gap-1",
        )}
      >
        <span
          className={cn(
            `absolute z-10 pl-1 top-2 flex items-center gap-1 h-5 w-full font-normal`,
          )}
        >
          {stocks === 0 ? (
            <span className="absolute left-1 px-2 h-full flex dark:bg-zinc-300 bg-neutral-900 rounded-md text-xs items-center justify-center text-white dark:text-black gap-1">
              Out of stock
            </span>
          ) : (
            <>
              {data?.rating > 0 && (
                <span className="px-2 -top-1 left-1 h-full flex dark:bg-zinc-300 bg-neutral-900 rounded-md text-xs items-center justify-center text-white dark:text-black gap-1">
                  {data?.rating ? data?.rating : 0.0}{" "}
                  <FaStar className="stroke-5 w-3 h-3" />
                </span>
              )}
              {discount > 0 && (
                <span className="px-2 h-full flex dark:bg-zinc-300 bg-neutral-900 rounded-md text-xs items-center justify-center text-white dark:text-black gap-1">
                  {discount}% Off
                </span>
              )}
            </>
          )}
          <span className="h-full flex text-xs items-center justify-center absolute right-2">
            {data.id && <WishList productId={data.id} />}
          </span>
        </span>

        <div className="relative w-full rounded-lg">
          <Swiper
            navigation
            pagination={{ type: "bullets", clickable: true }}
            loop={true}
            effect="fade"
            modules={[Autoplay, Navigation, Pagination, EffectFade]}
            style={{ margin: "0px" }}
            className={cn(
              `w-full h-[390px] rounded-lg relative overflow-hidden`,
              width,
            )}
          >
            {displayImages.map((imageData: InterfaceImage, index: number) => {
              const baseName =
                imageData.image.split("/").pop()?.split(".")[0] ?? "";
              const cleanBase = baseName.replace(/_[A-Za-z0-9]{7,}$/, "");
              const isFullCover = cleanBase.endsWith("not");
              const imageClassName = isFullCover
                ? "w-full h-full object-cover"
                : "";

              return (
                <SwiperSlide key={index}>
                  <div className="h-full w-full left-0 overflow-hidden top-0 bg-neutral-100 dark:bg-zinc-950 flex items-center justify-center">
                    <Link
                      href={`/collections/${productslug}`}
                      className={cn(imageClassName)}
                    >
                      <Image
                        src={imageData.image}
                        width={600}
                        height={600}
                        priority={index === 0}
                        loading={index === 0 ? "eager" : "lazy"}
                        className={cn(
                          "w-full cursor-pointer h-[350px] object-contain",
                          imageClassName,
                        )}
                        alt={`${productslug}-${index}`}
                      />
                    </Link>
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>

          {/* Color Picker - Only show if product has colors */}
          {availableColors.length > 0 && (
            <div
              className={cn(
                "flex flex-col-reverse absolute bottom-2 right-2 z-40",
                "rounded-full bg-white/90 dark:bg-neutral-900/90 shadow-lg",
                "isolate overflow-y-auto transition-all duration-300",
                showColorPicker
                  ? "w-10 lg:w-7 lg:p-1 lg:gap-1 p-2 gap-2"
                  : "w-6 lg:w-7 p-1 gap-1",
              )}
              onMouseEnter={() => setShowColorPicker(true)}
              onMouseLeave={() => setShowColorPicker(false)}
            >
              {/* All color options - stacked with negative margins when collapsed */}
              {availableColors.map((color, index, arr) => {
                const isCollapsed = !showColorPicker;
                const isSelected = selectedColor?.id === color.id;

                // First 3 are visible when collapsed, rest are invisible
                const isFirstThree = index < 3;

                return (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() =>
                      setSelectedColor({
                        id: color.id,
                        name: color.name,
                        code: color.code,
                      })
                    }
                    className={cn(
                      "w-full aspect-square rounded-full relative shrink-0",
                      "shadow-none outline-none border-none isolate hover:opacity-90",
                      "transition-all duration-300",
                      // Margin logic for stacking
                      isCollapsed
                        ? index === 0
                          ? ""
                          : isFirstThree
                            ? "-mb-[calc(100%+1px)]"
                            : "-mb-[calc(100%+4px)] invisible [transition:margin_0.3s,visibility_0.2s]"
                        : "mb-0 visible [transition:margin_0.3s,visibility_0.2s]",
                    )}
                    style={{
                      backgroundColor: color.code,
                      zIndex: `-${index}`,
                    }}
                    title={color.name}
                    disabled={isCollapsed && !isFirstThree}
                  >
                    {/* Selection indicator dot */}
                    {isSelected && (
                      <div
                        className={cn(
                          "w-1.5 h-1.5 aspect-square rounded-full absolute inset-0 m-auto",
                          "bg-white/90 dark:bg-black/90 z-10 transition-all",
                          showColorPicker ? "opacity-100" : "opacity-0",
                        )}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Product Info Section */}
        <span
          className={cn(
            "relative w-full h-[90px] flex flex-col rounded-lg p-3 py-2 justify-between dark:bg-transparent",
            base && "bg-[url('/bg.svg')] bg-cover dark:bg-img-inherit",
          )}
        >
          <div className="flex gap-3 items-center">
            <div className="flex flex-col cursor-pointer">
              <p className="text-sm">{data.product_name}</p>
              <p
                className="text-xs font-normal text-neutral-500 dark:text-zinc-100/80"
                onClick={handleRoute}
              >
                {data.categoryname}
              </p>
            </div>
          </div>
          <div className="flex w-full justify-between items-center gap-1">
            <span className={cn("flex", discount > 0 && " gap-2")}>
              <p className="text-sm">{discount > 0 && `रु ${finalPrice}`}</p>
              <p
                className={cn(
                  "text-sm",
                  discount > 0 && "text-neutral-400 line-through",
                )}
              >
                रु {convertedPrice}
              </p>
            </span>
            {variantsData && (
              <Cartbutton
                data={data.id}
                stocks={stocks}
                variantsData={variantsData}
                selectedSize={selectedSize}
                setSelectedSize={setSelectedSize}
                finalPrice={finalPrice}
                convertedPrice={convertedPrice}
                symbol="रु"
                selectedColor={selectedColor}
                matchedVariant={matchedVariant}
              />
            )}
          </div>
        </span>
      </span>
    </section>
  );
};

export const Skeleton = ({ className }: { className?: string }) => {
  return (
    <section
      className={cn(
        "w-full relative p-1 h-full flex flex-col gap-1 rounded-lg",
        className,
      )}
    >
      <div className="w-full animate-pulse bg-neutral-800/10 dark:bg-neutral-100/10 h-[390px] rounded-lg"></div>
      <div className="w-full flex flex-col p-2 animate-pulse bg-neutral-800/10 dark:bg-neutral-100/10 h-[100px] rounded-lg ">
        <span className="w-full h-[40px] flex">
          <span className="animate-pulse w-48 h-10 rounded-lg bg-neutral-800/10 dark:bg-neutral-100/10"></span>
        </span>
        <span className="w-full h-[40px] flex flex-row items-end justify-between">
          <span className="animate-pulse w-32 h-7 rounded-lg bg-neutral-800/10 dark:bg-neutral-100/10"></span>
          <span className="animate-pulse w-16 h-7 rounded-lg bg-neutral-800/10 dark:bg-neutral-100/10"></span>
        </span>
      </div>
    </section>
  );
};

export const ProductSkeleton = ({
  loading,
  children,
  filters,
  className,
  number,
  skleton,
}: {
  loading: boolean;
  children: React.ReactNode;
  filters?: boolean;
  className?: string;
  number?: number;
  skleton?: string;
}) => {
  const load = useDeferredValue(loading);
  if (load) {
    const randomLength = number || 5;
    return (
      <div
        className={cn(
          "grid grid-cols-1 md:grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-4 transition-opacity motion-reduce:transition-none",
          filters && "lg:grid-cols-2 xl:grid-cols-3",
          className,
        )}
      >
        {Array.from({ length: randomLength }, (_, index) => (
          <Skeleton key={index} className={skleton} />
        ))}
      </div>
    );
  }
  return <>{children}</>;
};
