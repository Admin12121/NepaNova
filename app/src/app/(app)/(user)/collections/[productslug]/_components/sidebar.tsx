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
  useGetlayoutQuery,
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
import { addDays, getStoreSettings } from "@/lib/store-settings";
import {
  formatVariantAttributeLabel,
  getComparableVariantAttributes,
  getVariantAttributeEntries,
} from "@/lib/variant-attributes";

const EmailSchema = z.object({
  email: z.string().min(1, { message: "UID is required" }),
});

interface VariantObject {
  id: number;
  color?: string | null;
  color_code?: string | null;
  color_name?: string | null;
  size: string | null;
  attributes?: Record<string, string | number | boolean | null>;
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
  onVariantChange,
}: {
  products: Product;
  selectedColor?: { code: string; name: string } | null;
  onColorChange?: (color: { code: string; name: string }) => void;
  onVariantChange?: (variantId: number | null) => void;
}) => {
  const router = useRouter();
  const { status } = useAuthUser();
  const { updateProductList } = useCart();
  const { data: layoutData } = useGetlayoutQuery({ layoutslug: "home" });
  const storeSettings = useMemo(
    () => getStoreSettings(layoutData?.config),
    [layoutData],
  );

  const [selectedAttributes, setSelectedAttributes] = useState<
    Record<string, string>
  >({});
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

  const variantAttributeData = useMemo(() => {
    if (!Array.isArray(variantsData)) return [];
    return variantsData.map((variant) => ({
      variant,
      attributes: getComparableVariantAttributes(variant),
    }));
  }, [variantsData]);

  const attributeKeys = useMemo(() => {
    const keys = new Set<string>();
    variantAttributeData.forEach(({ attributes }) => {
      Object.keys(attributes).forEach((key) => keys.add(key));
    });
    return Array.from(keys).sort((a, b) => {
      const order = ["color", "size"];
      const aIndex = order.indexOf(a);
      const bIndex = order.indexOf(b);
      if (aIndex !== -1 || bIndex !== -1) {
        return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
      }
      return a.localeCompare(b);
    });
  }, [variantAttributeData]);

  const attributeOptions = useMemo(() => {
    const options = new Map<
      string,
      Array<{ value: string; label: string; color?: string }>
    >();
    variantAttributeData.forEach(({ variant, attributes }) => {
      Object.entries(attributes).forEach(([key, value]) => {
        const stringValue = String(value);
        const existing = options.get(key) || [];
        if (!existing.some((item) => item.value === stringValue)) {
          existing.push({
            value: stringValue,
            label:
              key === "color"
                ? variant.color_name || stringValue
                : stringValue,
            color: key === "color" ? stringValue : undefined,
          });
        }
        options.set(key, existing);
      });
    });
    options.forEach((items, key) => {
      items.sort((a, b) =>
        key === "size"
          ? getSizeOrder(a.value) - getSizeOrder(b.value)
          : a.label.localeCompare(b.label),
      );
    });
    return options;
  }, [variantAttributeData]);

  const matchedVariant = useMemo(() => {
    if (!Array.isArray(variantsData)) return variantsData;
    if (attributeKeys.some((key) => !selectedAttributes[key])) return null;
    return (
      variantAttributeData.find(({ attributes }) =>
        attributeKeys.every(
          (key) => String(attributes[key]) === selectedAttributes[key],
        ),
      )?.variant || null
    );
  }, [variantsData, attributeKeys, selectedAttributes, variantAttributeData]);

  const selectAttribute = (key: string, value: string) => {
    const next = { ...selectedAttributes, [key]: value };
    const exactMatch = variantAttributeData.find(({ attributes }) =>
      attributeKeys.every(
        (attributeKey) =>
          !next[attributeKey] || String(attributes[attributeKey]) === next[attributeKey],
      ),
    );
    if (exactMatch) {
      attributeKeys.forEach((attributeKey) => {
        if (exactMatch.attributes[attributeKey] !== undefined) {
          next[attributeKey] = String(exactMatch.attributes[attributeKey]);
        }
      });
    }
    setSelectedAttributes(next);
  };

  // Initialize variants and default selections
  useEffect(() => {
    if (products?.variants) {
      if (!Array.isArray(products.variants)) {
        setVariantsData(products.variants);
        setSelectedAttributes(
          Object.fromEntries(
            Object.entries(getComparableVariantAttributes(products.variants)).map(
              ([key, value]) => [key, String(value)],
            ),
          ),
        );
      } else {
        setVariantsData(products.variants);
        const firstVariant = products.variants[0];
        if (firstVariant) {
          const firstAttributes = getComparableVariantAttributes(firstVariant);
          setSelectedAttributes(
            Object.fromEntries(
              Object.entries(firstAttributes).map(([key, value]) => [
                key,
                String(value),
              ]),
            ),
          );
          if (firstVariant.color_code && firstVariant.color_name) {
            setActiveColor({
              code: firstVariant.color_code,
              name: firstVariant.color_name,
            });
          }
        }
        const anyOutOfStock = products.variants.some((v) => v.stock === 0);
        setOutOfStock(anyOutOfStock);
      }
    }
  }, [products]);

  useEffect(() => {
    const selectedColorValue = selectedAttributes.color;
    if (!selectedColorValue) return;
    const option = attributeOptions
      .get("color")
      ?.find((item) => item.value === selectedColorValue);
    if (option) {
      setActiveColor({ code: option.value, name: option.label });
    }
  }, [selectedAttributes.color, attributeOptions]);

  // Update variant out-of-stock state based on matched variant
  useEffect(() => {
    if (matchedVariant) {
      setSelectedVariant(matchedVariant.id);
      onVariantChange?.(matchedVariant.id);
      setSelectedVariantOutOfStock(matchedVariant.stock === 0);
    } else if (variantsData && !Array.isArray(variantsData)) {
      setSelectedVariant(variantsData.id);
      onVariantChange?.(variantsData.id);
      setSelectedVariantOutOfStock(variantsData.stock === 0);
    } else {
      setSelectedVariant(null);
      onVariantChange?.(null);
      setSelectedVariantOutOfStock(false);
    }
  }, [matchedVariant, variantsData, onVariantChange]);

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
  const selectedDetailEntries = useMemo(
    () =>
      matchedVariant
        ? getVariantAttributeEntries(matchedVariant, { includeColor: true })
        : Object.entries(selectedAttributes).map(([key, value]) => ({
            label: formatVariantAttributeLabel(key),
            value,
          })),
    [matchedVariant, selectedAttributes],
  );
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
      toast.error("Please select a valid variant combination", {
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
      toast.error("Please select a valid variant combination", {
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
    return formatDate(addDays(new Date(), storeSettings.deliveryEstimateDays));
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
                {attributeKeys.map((attributeKey) => {
                  const options = attributeOptions.get(attributeKey) || [];
                  if (options.length === 0) return null;
                  return (
                    <span key={attributeKey} className="flex gap-3 flex-col">
                      <p className="text-sm">
                        {formatVariantAttributeLabel(attributeKey)}
                      </p>
                      <span className="flex gap-2 items-center flex-wrap">
                        {options.map((option) => {
                          const isActive =
                            selectedAttributes[attributeKey] === option.value;
                          const hasCurrentSelection = variantAttributeData.some(
                            ({ attributes }) =>
                              attributeKeys.every((key) => {
                                const selected =
                                  key === attributeKey
                                    ? option.value
                                    : selectedAttributes[key];
                                return (
                                  !selected ||
                                  String(attributes[key]) === selected
                                );
                              }),
                          );

                          if (attributeKey === "color") {
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() =>
                                  selectAttribute(attributeKey, option.value)
                                }
                                className={cn(
                                  "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all",
                                  isActive
                                    ? "border-neutral-900 dark:border-neutral-100 ring-2 ring-offset-2 ring-neutral-900 dark:ring-neutral-100"
                                    : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-500",
                                  !hasCurrentSelection &&
                                    !isActive &&
                                    "opacity-60",
                                )}
                                style={{ backgroundColor: option.color }}
                                title={option.label}
                                aria-label={`Select ${option.label}`}
                              >
                                {isActive && (
                                  <svg
                                    className="w-5 h-5"
                                    style={{
                                      color:
                                        parseInt(
                                          option.value.replace("#", ""),
                                          16,
                                        ) >
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
                          }

                          return (
                            <Button
                              key={option.value}
                              variant={isActive ? "active" : "secondary"}
                              size="sm"
                              onClick={() =>
                                selectAttribute(attributeKey, option.value)
                              }
                              className={cn(
                                !hasCurrentSelection && !isActive && "opacity-60",
                              )}
                            >
                              {option.label}
                            </Button>
                          );
                        })}
                      </span>
                    </span>
                  );
                })}
                <Card className="w-full mt-5 rounded-md bg-white dark:bg-neutral-900 border-none shadow-none p-3">
                  <CardBody>
                    <p className="text-sm text-zinc-400">Details</p>
                    <Divider className="my-1" />
                    {selectedDetailEntries.map((entry) => (
                      <span
                        key={`${entry.label}-${entry.value}`}
                        className="flex justify-between items-center mt-1"
                      >
                        <p className="text-xs text-zinc-400">{entry.label}</p>
                        <p className="text-xs text-zinc-400">{entry.value}</p>
                      </span>
                    ))}
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
