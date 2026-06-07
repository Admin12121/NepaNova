"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  Mail,
  Package,
  ShieldCheck,
  ShoppingBag,
  UserRound,
} from "lucide-react";

import {
  useAdminUserByIdQuery,
  useAdminUserDetailQuery,
  useGetOrdersQuery,
  useLazySalesRetrieveQuery,
  useProductsByIdsQuery,
} from "@/lib/store/Service/api";
import { useAuthUser } from "@/hooks/use-auth-user";
import { decriptData } from "@/hooks/dec-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { renderBadge } from "@/components/global/renderBadge";
import { formatVariantSummary } from "@/lib/variant-attributes";
import { getProductImageSrc, type ProductImageInput } from "@/lib/product-image";

type AdminUserDetail = {
  id: number;
  email: string;
  profile?: string | null;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  role?: string | null;
  roles?: string[];
  permissions?: string[];
  gender?: string | null;
  dob?: string | null;
  total_orders?: number;
  total_spent?: number;
  orders?: OrderSummary[];
};

type AdminUserRecord = {
  id: number;
  state?: string | null;
  provider?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  last_login?: string | null;
  is_admin?: boolean;
  is_superuser?: boolean;
};

type OrderSummary = {
  id: number;
  transactionuid: string;
  status: string;
  total_amt: number;
  created: string;
  shipping?: ShippingAddress | null;
  payment_method?: string | null;
};

type ShippingAddress = {
  city?: string | null;
  country?: string | null;
  address?: string | null;
};

type OrderProduct = {
  id: number;
  product: string | number;
  variant: string | number;
  price: number;
  qty: number;
  total: number;
};

type Shipment = {
  status?: string | null;
  tracking_number?: string | null;
  provider?: string | null;
};

type OrderDetail = OrderSummary & {
  products: OrderProduct[];
  sub_total?: number;
  discount?: number | null;
  shipping?: ShippingAddress | null;
  shipment?: Shipment | null;
};

type ProductRecord = {
  id: string | number;
  product_name?: string | null;
  productslug?: string | null;
  categoryname?: string | null;
  images?: ProductImageInput;
  variants?: any[] | Record<string, unknown> | null;
};

type ProductsByIdsResponse = {
  results?: ProductRecord[];
};

const formatMoney = (value?: number | string | null) => {
  const amount = Number(value ?? 0);
  return `Rs ${amount.toLocaleString("en-NP", {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (value?: string | null) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const normalizeStatus = (value?: string | null) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : "Unknown";

const getName = (user?: AdminUserDetail | null) => {
  const fullName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
  return fullName || user?.username || user?.email || "Unknown user";
};

const getInitials = (user?: AdminUserDetail | null) => {
  const source = getName(user);
  return source.slice(0, 2).toUpperCase();
};

const getVariant = (product: ProductRecord | undefined, variantId: string | number) => {
  if (!product?.variants) return null;
  if (Array.isArray(product.variants)) {
    return (
      product.variants.find((variant: any) => String(variant.id) === String(variantId)) ||
      null
    );
  }
  return product.variants;
};

const InfoItem = ({
  label,
  value,
}: {
  label: string;
  value?: React.ReactNode;
}) => (
  <div className="min-w-0 rounded-md border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
    <div className="text-xs text-neutral-500">{label}</div>
    <div className="mt-1 truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
      {value || "Not available"}
    </div>
  </div>
);

const MetricCard = ({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
}) => (
  <Card className="rounded-lg border border-neutral-200 shadow-none dark:border-neutral-800">
    <CardContent className="flex items-center justify-between gap-3">
      <div>
        <div className="text-xs text-neutral-500">{label}</div>
        <div className="mt-1 text-xl font-semibold">{value}</div>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-neutral-100 dark:bg-neutral-900">
        <Icon className="h-5 w-5 text-neutral-600 dark:text-neutral-300" />
      </div>
    </CardContent>
  </Card>
);

const ProductLine = ({
  item,
  product,
}: {
  item: OrderProduct;
  product?: ProductRecord;
}) => {
  const imageSrc = getProductImageSrc(product?.images);
  const variant = getVariant(product, item.variant);
  const variantSummary = formatVariantSummary(variant);

  return (
    <div className="flex gap-3 rounded-md border border-neutral-200 p-2 dark:border-neutral-800">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-neutral-100 dark:bg-neutral-900">
        <Image
          src={imageSrc}
          alt={product?.product_name || "Product image"}
          width={56}
          height={56}
          className="h-full w-full object-contain"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">
          {product?.product_name || `Product #${item.product}`}
        </div>
        <div className="mt-0.5 text-xs text-neutral-500">
          {product?.categoryname || "Uncategorized"}
          {variantSummary ? ` / ${variantSummary}` : ""}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
          <span>Qty {item.qty}</span>
          <span>Unit {formatMoney(item.price)}</span>
          <span>Total {formatMoney(item.total)}</span>
        </div>
      </div>
    </div>
  );
};

const OrderCard = ({
  order,
  productMap,
}: {
  order: OrderDetail | OrderSummary;
  productMap: Map<string, ProductRecord>;
}) => {
  const detail = order as OrderDetail;
  const products = Array.isArray(detail.products) ? detail.products : [];
  const shippingText = [order.shipping?.city, order.shipping?.country]
    .filter(Boolean)
    .join(", ");

  return (
    <Card className="rounded-lg border border-neutral-200 shadow-none dark:border-neutral-800">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0">
          <CardTitle className="truncate text-base">
            <Link href={`/sales/${order.transactionuid}`}>
              #{order.transactionuid}
            </Link>
          </CardTitle>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
            <span>{formatDate(order.created)}</span>
            {order.payment_method && <span>{order.payment_method}</span>}
            {detail.shipment?.tracking_number && (
              <span>Tracking {detail.shipment.tracking_number}</span>
            )}
          </div>
        </div>
        {renderBadge(order.status)}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 text-sm sm:grid-cols-3">
          <InfoItem label="Order Total" value={formatMoney(order.total_amt)} />
          <InfoItem
            label="Shipping"
            value={shippingText || order.shipping?.address || "Not available"}
          />
          <InfoItem
            label="Shipment"
            value={
              detail.shipment?.status
                ? normalizeStatus(detail.shipment.status)
                : "Not available"
            }
          />
        </div>

        {products.length > 0 ? (
          <div className="space-y-2">
            {products.map((item) => (
              <ProductLine
                key={`${order.transactionuid}-${item.id}`}
                item={item}
                product={productMap.get(String(item.product))}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-neutral-300 p-3 text-sm text-neutral-500 dark:border-neutral-800">
            Product rows are not available for this order summary.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const User = ({ userSlug }: { userSlug: string }) => {
  const { accessToken } = useAuthUser();
  const [loadOrderDetail] = useLazySalesRetrieveQuery();
  const [orderDetails, setOrderDetails] = useState<Record<string, OrderDetail>>({});
  const [orderDetailsLoading, setOrderDetailsLoading] = useState(false);
  const [orderDetailsError, setOrderDetailsError] = useState<string | null>(null);
  const [ordersPage, setOrdersPage] = useState(1);
  const [allOrderSummaries, setAllOrderSummaries] = useState<OrderSummary[]>([]);

  const {
    data: userDetail,
    isLoading: userLoading,
    error: userError,
  } = useAdminUserDetailQuery(
    { username: userSlug, token: accessToken },
    { skip: !accessToken || !userSlug },
  ) as {
    data?: AdminUserDetail;
    isLoading: boolean;
    error?: unknown;
  };

  const { data: userRecord } = useAdminUserByIdQuery(
    { id: userDetail?.id, token: accessToken },
    { skip: !accessToken || !userDetail?.id },
  ) as { data?: AdminUserRecord };

  const { data: ordersData, isLoading: orderListLoading } = useGetOrdersQuery(
    {
      token: accessToken,
      search: userDetail?.email,
      rowsperpage: 50,
      page: ordersPage,
    },
    { skip: !accessToken || !userDetail?.email },
  ) as {
    data?: { results?: OrderSummary[]; count?: number; next?: string | null };
    isLoading: boolean;
  };

  useEffect(() => {
    setOrdersPage(1);
    setAllOrderSummaries([]);
    setOrderDetails({});
  }, [userDetail?.email]);

  useEffect(() => {
    if (!ordersData?.results) return;

    setAllOrderSummaries((current) => {
      const source = ordersPage === 1 ? [] : current;
      const seen = new Set(source.map((order) => order.transactionuid));
      const next = [...source];

      ordersData.results?.forEach((order) => {
        if (!order.transactionuid || seen.has(order.transactionuid)) return;
        seen.add(order.transactionuid);
        next.push(order);
      });

      return next;
    });
  }, [ordersData, ordersPage]);

  const orderSummaries = useMemo(() => {
    const source =
      allOrderSummaries.length > 0
        ? allOrderSummaries
        : userDetail?.orders || [];
    const seen = new Set<string>();

    return source.filter((order) => {
      if (!order.transactionuid || seen.has(order.transactionuid)) return false;
      seen.add(order.transactionuid);
      return true;
    });
  }, [allOrderSummaries, userDetail]);

  useEffect(() => {
    if (!accessToken || orderSummaries.length === 0) {
      setOrderDetails({});
      setOrderDetailsLoading(false);
      return;
    }

    let cancelled = false;
    setOrderDetailsLoading(true);
    setOrderDetailsError(null);

    Promise.all(
      orderSummaries.map(async (order) => {
        try {
          const encrypted = await loadOrderDetail({
            transactionuid: order.transactionuid,
            token: accessToken,
          }).unwrap();
          const decrypted = decriptData(
            encrypted as { data: string },
            accessToken,
          ) as unknown as OrderDetail;
          return [order.transactionuid, decrypted] as const;
        } catch {
          return [order.transactionuid, null] as const;
        }
      }),
    )
      .then((entries) => {
        if (cancelled) return;
        const nextDetails: Record<string, OrderDetail> = {};
        let failed = 0;
        entries.forEach(([transactionuid, detail]) => {
          if (detail) {
            nextDetails[transactionuid] = detail;
          } else {
            failed += 1;
          }
        });
        setOrderDetails(nextDetails);
        setOrderDetailsError(
          failed > 0 ? `${failed} order detail record(s) could not be loaded.` : null,
        );
      })
      .finally(() => {
        if (!cancelled) setOrderDetailsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, loadOrderDetail, orderSummaries]);

  const productIds = useMemo(() => {
    const ids = Object.values(orderDetails).flatMap((order) =>
      (order.products || []).map((item) => String(item.product)),
    );
    return Array.from(new Set(ids));
  }, [orderDetails]);

  const { data: products } = useProductsByIdsQuery(
    { ids: productIds },
    { skip: productIds.length === 0 },
  ) as { data?: ProductsByIdsResponse };

  const productMap = useMemo(() => {
    const map = new Map<string, ProductRecord>();
    (products?.results || []).forEach((product) => {
      map.set(String(product.id), product);
    });
    return map;
  }, [products]);

  const enrichedOrders = useMemo(
    () =>
      orderSummaries.map((summary) => ({
        ...summary,
        ...(orderDetails[summary.transactionuid] || {}),
      })),
    [orderDetails, orderSummaries],
  );
  const hasMoreOrders = Boolean(ordersData?.next);

  const name = getName(userDetail);
  const roles = userDetail?.roles || [];
  const permissions = userDetail?.permissions || [];
  const isLoading = userLoading || !accessToken;

  if (isLoading) {
    return (
      <div className="flex h-[70dvh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (userError || !userDetail) {
    return (
      <div className="mx-auto flex h-[70dvh] max-w-[95rem] items-center justify-center p-4">
        <Card className="max-w-md rounded-lg border border-neutral-200 text-center shadow-none dark:border-neutral-800">
          <CardHeader>
            <CardTitle>User not found</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-neutral-500">
            The user profile for "{userSlug}" could not be loaded.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[95rem] flex-col gap-4 p-3 lg:px-6">
      <Card className="rounded-lg border border-neutral-200 shadow-none dark:border-neutral-800">
        <CardContent className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={userDetail.profile || ""} alt={name} />
              <AvatarFallback>{getInitials(userDetail)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-semibold">{name}</h1>
                {userRecord?.state && (
                  <Badge
                    variant={userRecord.state === "active" ? "success" : "danger"}
                    className="border-0"
                  >
                    {normalizeStatus(userRecord.state)}
                  </Badge>
                )}
                {userRecord?.is_superuser && (
                  <Badge variant="warning" className="border-0">
                    Superuser
                  </Badge>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-neutral-500">
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {userDetail.email}
                </span>
                {userDetail.username && (
                  <span className="inline-flex items-center gap-1">
                    <UserRound className="h-4 w-4" />
                    {userDetail.username}
                  </span>
                )}
                {userRecord?.provider && (
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck className="h-4 w-4" />
                    {userRecord.provider}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[32rem]">
            <MetricCard
              label="Total Orders"
              value={ordersData?.count ?? userDetail.total_orders ?? 0}
              icon={ShoppingBag}
            />
            <MetricCard
              label="Total Spent"
              value={formatMoney(userDetail.total_spent)}
              icon={CreditCard}
            />
            <MetricCard
              label="Products Bought"
              value={Object.values(orderDetails).reduce(
                (total, order) =>
                  total +
                  (order.products || []).reduce(
                    (sum, item) => sum + Number(item.qty || 0),
                    0,
                  ),
                0,
              )}
              icon={Package}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
        <div className="space-y-4">
          <Card className="rounded-lg border border-neutral-200 shadow-none dark:border-neutral-800">
            <CardHeader>
              <CardTitle className="text-base">User Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <InfoItem label="User ID" value={userDetail.id} />
              <InfoItem label="Legacy Role" value={userDetail.role} />
              <InfoItem label="Gender" value={userDetail.gender} />
              <InfoItem label="Date of Birth" value={formatDate(userDetail.dob)} />
              <InfoItem
                label="Joined"
                value={formatDate(userRecord?.created_at)}
              />
              <InfoItem
                label="Last Login"
                value={formatDate(userRecord?.last_login)}
              />
              <InfoItem
                label="Last Updated"
                value={formatDate(userRecord?.updated_at)}
              />
            </CardContent>
          </Card>

          <Card className="rounded-lg border border-neutral-200 shadow-none dark:border-neutral-800">
            <CardHeader>
              <CardTitle className="text-base">Roles & Permissions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-xs text-neutral-500">Roles</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {roles.length > 0 ? (
                    roles.map((role) => (
                      <Badge key={role} variant="secondary" className="border-0">
                        {role}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-neutral-500">No roles assigned</span>
                  )}
                </div>
              </div>
              <Separator />
              <div>
                <div className="text-xs text-neutral-500">Permissions</div>
                <div className="mt-2 flex max-h-56 flex-wrap gap-2 overflow-y-auto pr-1">
                  {permissions.length > 0 ? (
                    permissions.map((permission) => (
                      <Badge
                        key={permission}
                        variant="outline"
                        className="cursor-default"
                      >
                        {permission}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-neutral-500">
                      No direct permissions available
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-lg border border-neutral-200 shadow-none dark:border-neutral-800">
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="text-base">Purchase History</CardTitle>
              <div className="mt-1 text-sm text-neutral-500">
                Orders, delivery data, shipment state, and purchased products.
              </div>
            </div>
            {(orderListLoading || orderDetailsLoading) && <Spinner size="sm" />}
          </CardHeader>
          <CardContent className="space-y-3">
            {orderDetailsError && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                {orderDetailsError}
              </div>
            )}

            {enrichedOrders.length > 0 ? (
              <>
                {enrichedOrders.map((order) => (
                  <OrderCard
                    key={order.transactionuid}
                    order={order}
                    productMap={productMap}
                  />
                ))}
                {hasMoreOrders && (
                  <div className="flex justify-center pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setOrdersPage((page) => page + 1)}
                      disabled={orderListLoading || orderDetailsLoading}
                    >
                      Load more orders
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-neutral-300 text-center dark:border-neutral-800">
                <ShoppingBag className="h-8 w-8 text-neutral-400" />
                <div className="font-medium">No purchase history</div>
                <div className="max-w-sm text-sm text-neutral-500">
                  This user has no orders available in the current sales data.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default User;
