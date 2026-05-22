"use client";

import * as z from "zod";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { useRouter } from "nextjs-toploader/app";
import { useCart } from "@/lib/cart-context";
import { ReviewSheet } from "./review-sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Separator as Divider } from "@/components/ui/separator";
import {
  Card,
  CardContent as CardBody,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

import {
  Box as FiBox,
  Star as MdOutlineStar,
  OctagonAlert as PiWarningOctagon,
} from "lucide-react";

import {
  useNotifyuserMutation,
  useGetnotifyuserQuery,
} from "@/lib/store/Service/api";
import { useAuthUser } from "@/hooks/use-auth-user";
import { cn } from "@/lib/utils";
import StockWarningMessage from "./stock-warning";
import WishList from "@/components/global/wishlist-button";
import { encryptData } from "@/lib/transition";
import { parseDescription } from "@/lib/parse-decsription";
import { renderUI } from "./description-automation";
import WriteReview from "./write-review";
import { delay } from "@/lib/utils";

const EmailSchema = z.object({
  email: z.string().min(1, { message: "UID is required" }),
});

interface VariantObject {
  id: number;
  color?: string | null;
  color_code?: string | null;
  color_name?: string | null;
  size: string | null;
  price: string;
  discount: string;
  stock: number;
  product: number;
}

interface Product {
  id: number;
  categoryname: string;
  subcategoryname: string;
  comments: any[];
  rating: number;
  total_ratings: number;
  product_name: string;
  description: string;
  productslug: string;
  category: number;
  subcategory: number;
  variants: VariantObject | VariantObject[];
  images: any[];
}

export const getSizeCategory = (index: number) => {
  const sizeNames = [
    "Small",
    "Medium",
    "Large",
    "X-Large",
    "XX-Large",
    "XXX-Large",
  ];
  return sizeNames[index] || `Size-${index + 1}`;
};

const SIZE_ORDER = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "2XL",
  "3XL",
  "4XL",
  "5XL",
];
const getSizeOrder = (size: string) => {
  const idx = SIZE_ORDER.indexOf(size.toUpperCase());
  return idx === -1 ? 999 : idx;
};

const Sidebar = ({
  products,
  selectedColor,
  onColorChange,
}: {
  products: Product;
  selectedColor?: { code: string; name: string } | null;
  onColorChange?: (color: { code: string; name: string }) => void;
}) => {
  const router = useRouter();
  const { status } = useAuthUser();
  const { updateProductList } = useCart();

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  // Use internal state only if parent doesn't control color
  const [internalColor, setInternalColor] = useState<{
    code: string;
    name: string;
  } | null>(null);
  const activeColor =
    selectedColor !== undefined ? selectedColor : internalColor;
  const setActiveColor = (color: { code: string; name: string }) => {
    if (onColorChange) {
      onColorChange(color);
    } else {
      setInternalColor(color);
    }
  };
  const [variantsData, setVariantsData] = useState<
    VariantObject[] | VariantObject | null
  >(null);

  const [selectedVariantOutOfStock, setSelectedVariantOutOfStock] =
    useState<boolean>(false);
  const [outOfStock, setOutOfStock] = useState<boolean>(false);
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null);

  // All unique colors across all variants
  const uniqueColors = useMemo(() => {
    if (!Array.isArray(variantsData)) return [];
    const colorMap = new Map<string, { code: string; name: string }>();
    variantsData.forEach((variant) => {
      if (variant.color_code && variant.color_name) {
        colorMap.set(variant.color_code, {
          code: variant.color_code,
          name: variant.color_name,
        });
      }
    });
    return Array.from(colorMap.values());
  }, [variantsData]);

  // ALL unique sizes across all variants (never filtered)
  const allUniqueSizes = useMemo(() => {
    if (!Array.isArray(variantsData)) return [];
    const sizeSet = new Set<string>();
    variantsData.forEach((v) => {
      if (v.size) sizeSet.add(v.size);
    });
    return Array.from(sizeSet).sort(
      (a, b) => getSizeOrder(a) - getSizeOrder(b),
    );
  }, [variantsData]);

  // Sizes that exist for the currently selected color (for highlighting)
  const sizesForSelectedColor = useMemo(() => {
    if (!Array.isArray(variantsData) || !activeColor) return new Set<string>();
    const sizes = new Set<string>();
    variantsData.forEach((v) => {
      if (v.color_code === activeColor.code && v.size) {
        sizes.add(v.size);
      }
    });
    return sizes;
  }, [variantsData, activeColor]);

  // Colors that exist for the currently selected size (for highlighting)
  const colorsForSelectedSize = useMemo(() => {
    if (!Array.isArray(variantsData) || !selectedSize) return new Set<string>();
    const codes = new Set<string>();
    variantsData.forEach((v) => {
      if (v.size === selectedSize && v.color_code) {
        codes.add(v.color_code);
      }
    });
    return codes;
  }, [variantsData, selectedSize]);

  // The matched variant based on selected color + size
  const matchedVariant = useMemo(() => {
    if (!Array.isArray(variantsData)) return variantsData;
    if (!activeColor || !selectedSize) return null;
    return (
      variantsData.find(
        (v) => v.color_code === activeColor.code && v.size === selectedSize,
      ) || null
    );
  }, [variantsData, activeColor, selectedSize]);

  // Initialize variants and default selections
  useEffect(() => {
    if (products?.variants) {
      if (!Array.isArray(products.variants)) {
        setVariantsData(products.variants);
        setSelectedSize(products.variants.size);
      } else {
        setVariantsData(products.variants);
        const firstVariant = products.variants[0];
        if (firstVariant) {
          if (firstVariant.color_code && firstVariant.color_name) {
            setActiveColor({
              code: firstVariant.color_code,
              name: firstVariant.color_name,
            });
          }
          if (firstVariant.size) {
            setSelectedSize(firstVariant.size);
          }
        }
        const anyOutOfStock = products.variants.some((v) => v.stock === 0);
        setOutOfStock(anyOutOfStock);
      }
    }
  }, [products]);

  // When color changes, auto-switch size if current combo doesn't exist
  useEffect(() => {
    if (!Array.isArray(variantsData) || !activeColor) return;
    const sizesForColor = variantsData
      .filter((v) => v.color_code === activeColor.code)
      .map((v) => v.size);
    if (!selectedSize || !sizesForColor.includes(selectedSize)) {
      const sorted = sizesForColor
        .filter((s): s is string => s !== null)
        .sort((a, b) => getSizeOrder(a) - getSizeOrder(b));
      setSelectedSize(sorted[0] || null);
    }
  }, [activeColor, variantsData]);

  // When size changes, auto-switch color if current combo doesn't exist
  useEffect(() => {
    if (!Array.isArray(variantsData) || !selectedSize) return;
    const colorsForSize = variantsData
      .filter((v) => v.size === selectedSize)
      .map((v) => v.color_code);
    if (!activeColor || !colorsForSize.includes(activeColor.code)) {
      const firstMatch = variantsData.find(
        (v) => v.size === selectedSize && v.color_code && v.color_name,
      );
      if (firstMatch && firstMatch.color_code && firstMatch.color_name) {
        setActiveColor({
          code: firstMatch.color_code,
          name: firstMatch.color_name,
        });
      }
    }
  }, [selectedSize, variantsData]);

  // Update variant out-of-stock state based on matched variant
  useEffect(() => {
    if (matchedVariant) {
      setSelectedVariant(matchedVariant.id);
      setSelectedVariantOutOfStock(matchedVariant.stock === 0);
    } else if (variantsData && !Array.isArray(variantsData)) {
      setSelectedVariant(variantsData.id);
      setSelectedVariantOutOfStock(variantsData.stock === 0);
    } else {
      setSelectedVariant(null);
      setSelectedVariantOutOfStock(false);
    }
  }, [matchedVariant, variantsData]);

  const convertedPrice = matchedVariant
    ? Number(matchedVariant.price)
    : !Array.isArray(variantsData) && variantsData
      ? Number(variantsData.price)
      : 0;
  const discount = matchedVariant
    ? Number(matchedVariant.discount)
    : !Array.isArray(variantsData) && variantsData
      ? Number(variantsData.discount)
      : 0;
  const stock = matchedVariant
    ? matchedVariant.stock
    : !Array.isArray(variantsData) && variantsData
      ? variantsData.stock
      : 0;
  const finalPrice = useMemo(() => {
    return Number(
      (convertedPrice - convertedPrice * (discount / 100)).toFixed(2),
    );
  }, [convertedPrice, discount]);

  const handleRoute = () => {
    router.push(`/collections?category=${products?.categoryname}`);
  };

  const currentVariantId = matchedVariant
    ? matchedVariant.id
    : !Array.isArray(variantsData) && variantsData
      ? variantsData.id
      : null;

  // Expose selected color to parent on mount/change
  useEffect(() => {
    if (
      activeColor &&
      onColorChange &&
      selectedColor?.code !== activeColor.code
    ) {
      onColorChange(activeColor);
    }
  }, [activeColor]);

  const handleAddToCart = () => {
    if (!currentVariantId) {
      toast.error("Please select a valid size and color combination", {
        position: "top-center",
      });
      return;
    }
    updateProductList({
      product: products.id,
      variant: currentVariantId,
    });
  };

  const handleenc = () => {
    if (!currentVariantId) {
      toast.error("Please select a valid size and color combination", {
        position: "top-center",
      });
      return;
    }
    if (status) {
      const data = [
        {
          product: products?.id,
          variant: currentVariantId,
          pcs: 1,
        },
      ];
      encryptData(data, router);
    } else {
      router.push(`/login`);
    }
  };
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
    });
  };
  const calculateEstimatedArrival = (): string => {
    const today = new Date();
    const deliveryDate = new Date(today);
    deliveryDate.setDate(today.getDate() + 2);
    return formatDate(deliveryDate);
  };
  const arrivalDate = calculateEstimatedArrival();
  const description = parseDescription(products.description);
  return (
    <>
      <aside className="sidebar  w-full sticky top-[65px] space-y-8 ">
        {selectedVariantOutOfStock ? (
          <StockWarningMessage message="This item is out of stock" />
        ) : stock > 0 && stock < 5 ? (
          <StockWarningMessage message="Few items left in stock!" />
        ) : null}
        <Card className=" w-full !bg-transparent border-none border-0 shadow-none p-0 pt-3">
          <CardHeader className="flex flex-row gap-3 justify-between items-center px-4">
            <div className="flex gap-3 items-center">
              <div className="flex flex-col">
                <p className="text-2xl font-medium">{products?.product_name}</p>
                <p
                  className="text-sm text-neutral-600 cursor-pointer"
                  onClick={handleRoute}
                >
                  {products?.categoryname}
                </p>
              </div>
            </div>
            <WishList productId={products.id} />
          </CardHeader>
          <CardBody className="flex flex-col p-4 gap-5 flex-initial ">
            {Array.isArray(variantsData) && (
              <>
                {uniqueColors.length > 0 && (
                  <span className="flex gap-3 flex-col">
                    <p className="text-sm">Color</p>
                    <span className="flex gap-2 items-center flex-wrap">
                      {uniqueColors.map((color) => {
                        const isActive = activeColor?.code === color.code;
                        const hasCurrentSize =
                          !selectedSize ||
                          colorsForSelectedSize.has(color.code);
                        return (
                          <button
                            key={color.code}
                            type="button"
                            onClick={() => setActiveColor(color)}
                            className={cn(
                              "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all",
                              isActive
                                ? "border-neutral-900 dark:border-neutral-100 ring-2 ring-offset-2 ring-neutral-900 dark:ring-neutral-100"
                                : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-500",
                              !hasCurrentSize && !isActive && "opacity-60",
                            )}
                            style={{ backgroundColor: color.code }}
                            title={color.name}
                            aria-label={`Select ${color.name} color`}
                          >
                            {isActive && (
                              <svg
                                className="w-5 h-5"
                                style={{
                                  color:
                                    parseInt(color.code.slice(1), 16) >
                                    0xffffff / 2
                                      ? "#000000"
                                      : "#ffffff",
                                }}
                                fill="none"
                                strokeWidth={3}
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </span>
                  </span>
                )}
                {allUniqueSizes.length > 0 && (
                  <span className="flex gap-3 flex-col">
                    <p className="text-sm">Statue Size</p>
                    <span className="flex gap-2 items-center flex-wrap">
                      {allUniqueSizes.map((size) => {
                        const isActive = selectedSize === size;
                        const hasCurrentColor =
                          !activeColor || sizesForSelectedColor.has(size);
                        return (
                          <Button
                            key={size}
                            variant={isActive ? "active" : "secondary"}
                            size="sm"
                            onClick={() => setSelectedSize(size)}
                            className={cn(
                              !hasCurrentColor && !isActive && "opacity-60",
                            )}
                          >
                            {size}
                          </Button>
                        );
                      })}
                    </span>
                  </span>
                )}
                <Card className="w-full mt-5 rounded-md bg-white dark:bg-neutral-900 border-none shadow-none p-3">
                  <CardBody>
                    <p className="text-sm text-zinc-400">Details</p>
                    <Divider className="my-1" />
                    {selectedSize && (
                      <span className="flex justify-between items-center">
                        <p className="text-xs text-zinc-400">Statue Size</p>
                        <p className="text-xs text-zinc-400">
                          {selectedSize} cm
                        </p>
                      </span>
                    )}
                    {activeColor && (
                      <span className="flex justify-between items-center mt-1">
                        <p className="text-xs text-zinc-400">Color</p>
                        <span className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full border border-neutral-300 dark:border-neutral-700"
                            style={{ backgroundColor: activeColor.code }}
                          />
                          <p className="text-xs text-zinc-400">
                            {activeColor.name}
                          </p>
                        </span>
                      </span>
                    )}
                  </CardBody>
                </Card>
              </>
            )}
            {stock > 0 && stock < 5 && (
              <span className="flex items-center gap-2 text-sm font-extralight">
                <PiWarningOctagon className="w-4 h-4" /> {stock} items left
              </span>
            )}
            <span className="w-full flex gap-5 items-center">
              <span className="text-xs text-zinc-400 flex gap-2">
                <FiBox size={16} /> Delivery on {arrivalDate}
              </span>
            </span>
            <span className="w-full flex gap-3 items-center">
              <span className="flex gap-2">
                <p className="text-lg">{discount > 0 && `रु ${finalPrice}`}</p>
                <p
                  className={cn(
                    "text-lg",
                    discount > 0 && "text-neutral-500 line-through",
                  )}
                >
                  रु {convertedPrice}
                </p>
              </span>
            </span>
            {!selectedVariantOutOfStock ? (
              <span className="flex gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full h-[40px] text-base"
                  onClick={handleAddToCart}
                >
                  Add to Cart
                </Button>
                {status && (
                  <Button
                    variant="active"
                    className="w-full h-[40px] text-base"
                    onClick={handleenc}
                  >
                    Buy now
                  </Button>
                )}
              </span>
            ) : (
              <>
                {currentVariantId && (
                  <NotifyForm
                    product={products.id}
                    stock={stock}
                    selectedVariant={currentVariantId}
                  />
                )}
              </>
            )}
          </CardBody>
          <CardFooter className="gap-5 flex flex-col pb-0">
            <span className="w-full p-0">
              <Card className="w-full border-none border-0 bg-white dark:bg-neutral-950 p-0">
                <CardHeader className="flex gap-3 p-3">
                  <div className="w-full flex justify-between items-center px-1">
                    <p className="text-md">Reviews({products.total_ratings})</p>
                    <WriteReview link={true} product={products} />
                  </div>
                </CardHeader>
                <CardBody className="gap-3 p-3 flex flex-col">
                  <div className="w-full flex justify-between items-center px-1">
                    <p className="text-xs">Overall rating</p>
                    <p className="text-xs flex gap-1 items-center">
                      {products.rating}{" "}
                      <MdOutlineStar color="orange" size={16} />
                    </p>
                  </div>
                  <ReviewSheet
                    rating={products.rating}
                    slug={products.productslug}
                    product={products}
                  />
                </CardBody>
              </Card>
              {description && renderUI(description)}
            </span>
          </CardFooter>
        </Card>
      </aside>
    </>
  );
};

interface NotifyFormProps {
  product: number;
  selectedVariant: number;
  stock: number;
}

const NotifyForm = ({ product, selectedVariant, stock }: NotifyFormProps) => {
  const { accessToken } = useAuthUser();
  const [notifyuser] = useNotifyuserMutation();
  const [notifyadded, setNotifyAdded] = useState<boolean>(false);
  const { data: Notify, isLoading: loading } = useGetnotifyuserQuery(
    { product: product, variant: selectedVariant, token: accessToken },
    { skip: !product || !selectedVariant || stock !== 0 },
  );
  useEffect(() => {
    setNotifyAdded(Notify?.requested || false);
  }, [Notify]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    resolver: zodResolver(EmailSchema),
  });

  const emailValue = watch("email", "");

  const [isNotifying, setIsNotifying] = useState(false);

  const onSubmit = async (data: any) => {
    if (isNotifying) return;
    setIsNotifying(true);

    const toastId = toast.loading("Adding to waiting list...", {
      position: "top-center",
    });
    const actualData = {
      ...data,
      variant: selectedVariant,
      product: product,
    };
    const res = await notifyuser({ actualData, token: accessToken });
    if (res.data) {
      toast.success("Added to waiting list", {
        id: toastId,
        position: "top-center",
      });
    }
    if (res.error) {
      toast.error("Something went wrong, try again later", {
        id: toastId,
        position: "top-center",
      });
    }
    setIsNotifying(false);
  };

  if (loading) {
    return (
      <span className="flex w-full h-[185px] items-center justify-center">
        <Spinner color="default" />
      </span>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className=" flex flex-col gap-2 py-5"
    >
      <span>
        <h1 className="text-xl font-medium text-neutral-600 dark:text-zinc-300">
          This item is out of stock!
        </h1>
        <p className="text-sm text-zinc-400">
          Enter your email and we&apos;ll notify you when it&apos;s back in
          stock
        </p>
      </span>
      <Input
        {...register("email")}
        type="email"
        placeholder={
          notifyadded ? "You will be notify soon!!" : "Enter your email"
        }
        className={cn(
          "dark:bg-custom/40 border-0 bg-white outline-none focus:ring-0 focus:border-transparent",
          notifyadded && "border-ring ring-2 ring-orange-400/50 ring-offset-2",
        )}
        disabled={notifyadded}
      />
      <span className="flex gap-2">
        <Button
          color="default"
          variant="custom"
          className={cn(
            "w-full h-[40px] text-base disabled:cursor-not-allowed",
          )}
          type="submit"
          loading={isNotifying}
          disabled={notifyadded || !emailValue || !!errors.email || isNotifying}
        >
          Notify me when available
        </Button>
        <WishList productId={product} custom={false} />
      </span>
    </form>
  );
};

export default Sidebar;
