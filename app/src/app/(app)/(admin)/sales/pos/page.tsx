"use client";

import React, { useDeferredValue, useMemo, useState } from "react";
import { Minus, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { OrderReceiptActions } from "@/components/billing/order-receipt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatVariantSummary } from "@/lib/variant-attributes";

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
  variants?: ProductVariant | ProductVariant[];
};

type PosCartItem = {
  key: string;
  productId: number;
  productName: string;
  categoryname?: string | null;
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

const money = (value: number) =>
  `Rs ${value.toLocaleString("en-NP", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

const buildTransactionUid = () =>
  `POS-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Math.random()
    .toString(16)
    .slice(2, 10)
    .toUpperCase()}`;

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
  const cartTotal = cart.reduce(
    (total, item) => total + unitPrice(item.variant) * item.qty,
    0,
  );
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
          customer_id: customerId ? Number(customerId) : undefined,
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
          sub_total: numberValue(sale.sub_total || cartTotal),
          total_amt: numberValue(sale.total_amt || cartTotal),
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
    <div className="flex min-h-full flex-col gap-4 p-4 md:p-6">
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
        <Card>
          <CardContent className="py-10 text-sm text-neutral-500">
            You need order management permission to create POS orders.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Card>
            <CardHeader className="space-y-4">
              <CardTitle>Products</CardTitle>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search products"
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-10 text-sm text-neutral-500">Loading products...</div>
              ) : products.length ? (
                <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                  {products.map((product) =>
                    toArray(product.variants).map((variant) => {
                      const variantLabel =
                        formatVariantSummary(variant as any) ||
                        variant.size ||
                        variant.color_name ||
                        "Default";
                      return (
                        <div
                          key={`${product.id}-${variant.id}`}
                          className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h2 className="truncate text-sm font-medium">
                                {product.product_name}
                              </h2>
                              <p className="mt-1 text-xs text-neutral-500">
                                {variantLabel}
                              </p>
                            </div>
                            <Badge variant={variant.stock > 0 ? "outline" : "destructive"}>
                              {variant.stock}
                            </Badge>
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <span className="text-sm font-semibold">
                              {money(unitPrice(variant))}
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => addVariant(product, variant)}
                              disabled={variant.stock <= 0}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Add
                            </Button>
                          </div>
                        </div>
                      );
                    }),
                  )}
                </div>
              ) : (
                <div className="py-10 text-sm text-neutral-500">
                  No in-stock products found.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Cart
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cart.length ? (
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div
                        key={item.key}
                        className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {item.productName}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {formatVariantSummary(item.variant as any) || "Default"}
                            </p>
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
                  <div className="rounded-lg border border-dashed border-neutral-300 py-10 text-center text-sm text-neutral-500 dark:border-neutral-800">
                    Cart is empty.
                  </div>
                )}

                <div className="space-y-3 border-t pt-4">
                  <div className="grid gap-2">
                    <Label htmlFor="customer-id">Customer user ID (optional)</Label>
                    <Input
                      id="customer-id"
                      value={customerId}
                      onChange={(event) => setCustomerId(event.target.value)}
                      placeholder="Leave blank for walk-in"
                      inputMode="numeric"
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

                <div className="flex items-center justify-between border-t pt-4">
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
              </CardContent>
            </Card>

            {receipt ? (
              <Card>
                <CardHeader>
                  <CardTitle>Last bill</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <p className="font-medium">{receipt.order.transactionuid}</p>
                    <p className="text-neutral-500">
                      {receipt.products.length} line item
                      {receipt.products.length === 1 ? "" : "s"} ·{" "}
                      {money(receipt.order.total_amt)}
                    </p>
                  </div>
                  <OrderReceiptActions
                    order={receipt.order}
                    products={receipt.products}
                    createdBy={receipt.createdBy}
                  />
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default PosPage;
