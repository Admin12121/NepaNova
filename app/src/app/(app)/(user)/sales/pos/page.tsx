"use client";

import React, { useDeferredValue, useMemo, useState } from "react";
import Image from "next/image";
import { Minus, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { OrderReceiptActions } from "@/components/billing/order-receipt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthUser } from "@/hooks/use-auth-user";
import {
  usePostPosSaleMutation,
  useProductsViewQuery,
} from "@/lib/store/Service/api";
import { formatMoney, roundMoney } from "@/lib/money";
import { formatVariantSummary } from "@/lib/variant-attributes";
import { cn } from "@/lib/utils";

type ProductVariant = {
  id: number;
  product: number;
  size?: string | null;
  color_name?: string | null;
  color_code?: string | null;
  price: string | number;
  discount?: number | null;
  stock: number;
  attributes?: Record<string, unknown> | null;
};

type Product = {
  id: number;
  product_name: string;
  productslug?: string;
  categoryname?: string | null;
  images?: { image: string; color?: string | null; variant?: number | null }[];
  variants?: ProductVariant | ProductVariant[];
};

type PosCartItem = {
  key: string;
  productId: number;
  productName: string;
  categoryname?: string | null;
  imageUrl: string;
  variant: ProductVariant;
  qty: number;
};

type ReceiptSnapshot = {
  order: {
    id?: number;
    transactionuid: string;
    status: string;
    total_amt: number;
    sub_total: number;
    discount: number;
    payment_method: string;
    created: string;
    shipping: null;
  };
  products: {
    product_name: string;
    categoryname?: string | null;
    pcs: number;
    price: number;
    total: number;
    variantDetails: ProductVariant;
  }[];
  createdBy?: string;
};

const toArray = <T,>(value?: T | T[] | null): T[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const numberValue = (value?: number | string | null) => Number(value ?? 0);

const unitPrice = (variant: ProductVariant) => {
  const price = numberValue(variant.price);
  const discount = numberValue(variant.discount);
  if (!discount) return price;
  return price - (price * discount) / 100;
};

const money = (value: number | string | null | undefined) => formatMoney(value);

const buildTransactionUid = () =>
  `POS-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Math.random()
    .toString(16)
    .slice(2, 10)
    .toUpperCase()}`;

const getProductImage = (product: Product, variant: ProductVariant) => {
  const images = product.images || [];
  const variantImage = images.find((image) => image.variant === variant.id);
  const colorImage = images.find(
    (image) => variant.color_code && image.color === variant.color_code,
  );
  return variantImage?.image || colorImage?.image || images[0]?.image || "/logo.png";
};

const PosProductCard = ({
  product,
  variant,
  onAdd,
}: {
  product: Product;
  variant: ProductVariant;
  onAdd: () => void;
}) => {
  const image = getProductImage(product, variant);
  const convertedPrice = numberValue(variant.price);
  const discount = numberValue(variant.discount);
  const finalPrice = unitPrice(variant);
  const variantLabel =
    formatVariantSummary(variant as any) ||
    variant.size ||
    variant.color_name ||
    "Default";

  return (
    <article className="group flex min-w-0 flex-col gap-1 rounded-lg bg-white p-1 dark:bg-neutral-950">
      <div className="relative h-[280px] overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-900">
        <div className="absolute left-2 top-2 z-10 flex items-center gap-1">
          {variant.stock <= 0 ? (
            <span className="rounded-md bg-neutral-900 px-2 py-1 text-xs text-white dark:bg-zinc-300 dark:text-black">
              Out of stock
            </span>
          ) : (
            <span className="rounded-md bg-neutral-900 px-2 py-1 text-xs text-white dark:bg-zinc-300 dark:text-black">
              Stock {variant.stock}
            </span>
          )}
          {discount > 0 ? (
            <span className="rounded-md bg-neutral-900 px-2 py-1 text-xs text-white dark:bg-zinc-300 dark:text-black">
              {discount}% Off
            </span>
          ) : null}
        </div>
        <Image
          src={image}
          alt={product.product_name}
          width={600}
          height={600}
          className="h-full w-full object-contain p-4 transition duration-300 group-hover:scale-[1.02]"
        />
      </div>
      <div className="flex min-h-[110px] flex-col justify-between rounded-lg px-2 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-medium text-neutral-950 dark:text-neutral-50">
            {product.product_name}
          </h2>
          <p className="mt-1 truncate text-xs text-neutral-500">
            {[product.categoryname, variantLabel].filter(Boolean).join(" / ")}
          </p>
          {variant.color_code ? (
            <span className="mt-2 inline-flex items-center gap-2 text-xs text-neutral-500">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: variant.color_code }}
              />
              {variant.color_name || variant.color_code}
            </span>
          ) : null}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className={cn("flex items-center gap-2", discount > 0 && "gap-2")}>
            {discount > 0 ? (
              <span className="text-sm font-semibold">{money(finalPrice)}</span>
            ) : null}
            <span
              className={cn(
                "text-sm font-semibold",
                discount > 0 && "font-normal text-neutral-400 line-through",
              )}
            >
              {money(convertedPrice)}
            </span>
          </span>
          <Button
            type="button"
            size="sm"
            onClick={onAdd}
            disabled={variant.stock <= 0}
            className="h-8 px-3"
          >
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
      </div>
    </article>
  );
};

const PosPage = () => {
  const { accessToken, hasPermission, role, user } = useAuthUser();
  const canCreatePos = role === "Admin" || hasPermission("orders.manage");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [source, setSource] = useState("pos_web");
  const [customerId, setCustomerId] = useState("");
  const [receipt, setReceipt] = useState<ReceiptSnapshot | null>(null);
  const [postPosSale, { isLoading: creating }] = usePostPosSaleMutation();

  const { data, isLoading } = useProductsViewQuery(
    {
      token: accessToken,
      search: deferredSearch,
      page_size: 12,
      stock: "in",
    },
    { skip: !accessToken || !canCreatePos },
  );

  const products: Product[] = data?.results || [];
  const cartTotal = roundMoney(cart.reduce(
    (total, item) => total + unitPrice(item.variant) * item.qty,
    0,
  ));
  const cartQty = cart.reduce((total, item) => total + item.qty, 0);

  const receiptProducts = useMemo(
    () =>
      cart.map((item) => ({
        product_name: item.productName,
        categoryname: item.categoryname,
        pcs: item.qty,
        price: unitPrice(item.variant),
        total: unitPrice(item.variant) * item.qty,
        variantDetails: item.variant,
      })),
    [cart],
  );

  const updateQty = (key: string, qty: number) => {
    setCart((current) =>
      current
        .map((item) =>
          item.key === key
            ? { ...item, qty: Math.max(1, Math.min(qty, item.variant.stock)) }
            : item,
        )
        .filter((item) => item.qty > 0),
    );
  };

  const addVariant = (product: Product, variant: ProductVariant) => {
    if (variant.stock <= 0) {
      toast.error("This variant is out of stock");
      return;
    }
    const key = `${product.id}-${variant.id}`;
    const imageUrl = getProductImage(product, variant);
    setReceipt(null);
    setCart((current) => {
      const existing = current.find((item) => item.key === key);
      if (existing) {
        return current.map((item) =>
          item.key === key
            ? { ...item, qty: Math.min(item.qty + 1, variant.stock) }
            : item,
        );
      }
      return [
        ...current,
        {
          key,
          productId: product.id,
          productName: product.product_name,
          categoryname: product.categoryname,
          imageUrl,
          variant,
          qty: 1,
        },
      ];
    });
  };

  const submitOrder = async () => {
    if (!canCreatePos) {
      toast.error("You do not have permission to create POS orders");
      return;
    }
    if (!cart.length) {
      toast.error("Add at least one product");
      return;
    }

    const transactionuid = buildTransactionUid();
    const snapshotProducts = receiptProducts;

    try {
      const response = await postPosSale({
        token: accessToken,
        actualData: {
          transactionuid,
          payment_method: paymentMethod,
          source,
          customer_identifier: customerId.trim() || undefined,
          products: cart.map((item) => ({
            product: item.productId,
            variant: item.variant.id,
            pcs: item.qty,
          })),
        },
      }).unwrap();

      const sale = response?.sale || {};
      const sessionUser = user as { name?: string | null; email?: string | null };
      setReceipt({
        order: {
          id: sale.id,
          transactionuid: sale.transactionuid || transactionuid,
          status: sale.status || "successful",
          sub_total: roundMoney(numberValue(sale.sub_total || cartTotal)),
          total_amt: roundMoney(numberValue(sale.total_amt || cartTotal)),
          discount: numberValue(sale.discount),
          payment_method: sale.payment_method || paymentMethod,
          created: sale.created || new Date().toISOString(),
          shipping: null,
        },
        products: snapshotProducts,
        createdBy:
          sessionUser?.name ||
          sessionUser?.email ||
          "Current staff",
      });
      setCart([]);
      setCustomerId("");
      toast.success("POS order created");
    } catch (error: any) {
      toast.error(error?.data?.error || "Could not create POS order");
    }
  };

  return (
    <main className="mx-auto flex min-h-full w-full max-w-[95rem] flex-col gap-6 px-4 py-5 md:px-6 md:py-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-neutral-950 dark:text-neutral-50">
            Store POS
          </h1>
          <p className="text-sm text-neutral-500">
            Create direct purchase orders without delivery.
          </p>
        </div>
        <Badge variant="secondary" className="w-fit">
          {cartQty} item{cartQty === 1 ? "" : "s"} in cart
        </Badge>
      </div>

      {!canCreatePos ? (
        <section className="py-10 text-sm text-neutral-500">
            You need order management permission to create POS orders.
        </section>
      ) : (
        <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="min-w-0 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-semibold">Products</h2>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search products"
                  className="h-10 border-none bg-neutral-100 pl-9 shadow-none dark:bg-neutral-900 sm:w-[360px]"
                />
              </div>
            </div>
              {isLoading ? (
                <div className="py-10 text-sm text-neutral-500">Loading products...</div>
              ) : products.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                  {products.map((product) =>
                    toArray(product.variants).map((variant) => {
                      return (
                        <PosProductCard
                          key={`${product.id}-${variant.id}`}
                          product={product}
                          variant={variant}
                          onAdd={() => addVariant(product, variant)}
                        />
                      );
                    }),
                  )}
                </div>
              ) : (
                <div className="py-10 text-sm text-neutral-500">
                  No in-stock products found.
                </div>
              )}
          </section>

          <aside className="space-y-5 xl:sticky xl:top-20">
            <section className="space-y-4 rounded-lg bg-white p-1 dark:bg-neutral-950">
              <div className="px-2 pt-2">
                <h2 className="flex items-center gap-2 text-base font-semibold">
                  <ShoppingCart className="h-5 w-5" />
                  Cart
                </h2>
              </div>
              <div className="space-y-4 px-2 pb-2">
                {cart.length ? (
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div
                        key={item.key}
                        className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-900"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-white dark:bg-neutral-950">
                              <Image
                                src={item.imageUrl}
                                alt={item.productName}
                                width={96}
                                height={96}
                                className="h-full w-full object-contain p-1.5"
                              />
                            </div>
                            <div className="min-w-0 pt-1">
                              <p className="truncate text-sm font-medium">
                                {item.productName}
                              </p>
                              <p className="text-xs text-neutral-500">
                                {formatVariantSummary(item.variant as any) || "Default"}
                              </p>
                              {item.variant.color_code ? (
                                <span className="mt-1 inline-flex items-center gap-2 text-xs text-neutral-500">
                                  <span
                                    className="h-3 w-3 rounded-full"
                                    style={{
                                      backgroundColor: item.variant.color_code,
                                    }}
                                  />
                                  {item.variant.color_name || item.variant.color_code}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() =>
                              setCart((current) =>
                                current.filter((cartItem) => cartItem.key !== item.key),
                              )
                            }
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              onClick={() => updateQty(item.key, item.qty - 1)}
                              disabled={item.qty <= 1}
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <Input
                              value={item.qty}
                              onChange={(event) =>
                                updateQty(item.key, Number(event.target.value))
                              }
                              className="h-9 w-16 text-center"
                              inputMode="numeric"
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              onClick={() => updateQty(item.key, item.qty + 1)}
                              disabled={item.qty >= item.variant.stock}
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <span className="text-sm font-semibold">
                            {money(unitPrice(item.variant) * item.qty)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg bg-neutral-50 py-10 text-center text-sm text-neutral-500 dark:bg-neutral-900">
                    Cart is empty.
                  </div>
                )}

                <div className="space-y-3 pt-2">
                  <div className="grid gap-2">
                    <Label htmlFor="customer-identifier">
                      Customer email, username, or phone (optional)
                    </Label>
                    <Input
                      id="customer-identifier"
                      value={customerId}
                      onChange={(event) => setCustomerId(event.target.value)}
                      placeholder="Leave blank for walk-in"
                      className="border-none bg-neutral-100 shadow-none dark:bg-neutral-900"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Payment method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Card">Card</SelectItem>
                        <SelectItem value="Bank Transfer">Bank transfer</SelectItem>
                        <SelectItem value="Online Payment">Online payment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Source</Label>
                    <Select value={source} onValueChange={setSource}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pos_web">Web POS</SelectItem>
                        <SelectItem value="pos_local">Local store terminal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm text-neutral-500">Total</span>
                  <strong className="text-2xl">{money(cartTotal)}</strong>
                </div>
                <Button
                  type="button"
                  className="w-full"
                  onClick={submitOrder}
                  disabled={creating || !cart.length}
                >
                  {creating ? "Creating order" : "Complete direct purchase"}
                </Button>
              </div>
            </section>

            {receipt ? (
              <section className="space-y-3 rounded-lg bg-white p-3 dark:bg-neutral-950">
                <h2 className="text-base font-semibold">Last bill</h2>
                  <div className="text-sm">
                    <p className="font-medium">{receipt.order.transactionuid}</p>
                    <p className="text-neutral-500">
                      {receipt.products.length} line item
                      {receipt.products.length === 1 ? "" : "s"} -{" "}
                      {money(receipt.order.total_amt)}
                    </p>
                  </div>
                  <OrderReceiptActions
                    order={receipt.order}
                    products={receipt.products}
                    createdBy={receipt.createdBy}
                  />
              </section>
            ) : null}
          </aside>
        </div>
      )}
    </main>
  );
};

export default PosPage;
