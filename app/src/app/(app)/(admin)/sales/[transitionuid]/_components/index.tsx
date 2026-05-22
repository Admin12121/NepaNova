"use client";
import React, {
  useCallback,
  useDeferredValue,
  useMemo,
  useState,
  useRef,
} from "react";
import {
  useSalesRetrieveQuery,
  useProductsByIdsQuery,
  useUpdateSaleMutation,
} from "@/lib/store/Service/api";
import { useAuthUser } from "@/hooks/use-auth-user";
import { MapPin, ShoppingCart, Truck } from "lucide-react";
import {
  LeftIcon,
  RightIcon,
} from "@/app/(app)/(user)/(account)/orders/_components/icons";
import Voucher from "@/app/(app)/(user)/checkout/[transitionuid]/_components/voucher";
import { VoucherSkleton } from "@/app/(app)/(user)/checkout/[transitionuid]/_components/voucher";
import { Separator } from "@/components/ui/separator";
import { useDecryptedData } from "@/hooks/dec-data";
import { EllipsisIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { renderBadge } from "@/components/global/renderBadge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Product {
  id: string;
  variants: Array<{ id: string }>;
  categoryname: string;
  description: string;
  images: string[];
  product_name: string;
  productslug: string;
}
type ProductsByIdsResponse = { results: Product[] };
interface CartItem {
  id: number;
  price: number;
  qty: number;
  total: number;
  transition: number;
  product: string;
  variant: string;
  categoryname?: string;
  description?: string;
  images?: string;
  product_name?: string;
  productslug?: string;
}

export interface Order {
  id: number;
  products: CartItem[];
  costumer_name: string;
  transactionuid: string;
  status: string;
  total_amt: number;
  sub_total: number;
  shipping: {
    city: string;
    country: string;
  };
  discount: number;
  payment_method: string;
  redeem_data: any;
  payment_intent_id: any;
  created: string;
  updated_at: string;
  expected_delivery_date?: string;
  delivery_delay_reason?: string;
}

const OrderRetrieve = ({ transactionuid }: { transactionuid: string }) => {
  const { accessToken } = useAuthUser();
  const {
    data: encryptedData,
    isLoading,
    refetch,
  } = useSalesRetrieveQuery(
    { transactionuid, token: accessToken },
    { skip: !accessToken },
  );
  const { data, loading } = useDecryptedData<Order>(encryptedData, isLoading);
  const orderData = data;

  return (
    <PageSkeleton loading={loading}>
      {orderData ? (
        <ProductCard data={orderData} token={accessToken} refetch={refetch} />
      ) : null}
    </PageSkeleton>
  );
};

const ProductCard = ({
  data,
  token,
  refetch,
}: {
  data: Order;
  token?: string;
  refetch?: any;
}) => {
  const [updateSale] = useUpdateSaleMutation();
  const isUpdatingRef = useRef(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Delivery date dialog state
  const [dateDialogOpen, setDateDialogOpen] = useState(false);
  const [pendingDate, setPendingDate] = useState<Date | undefined>(undefined);
  const [delayReason, setDelayReason] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);

  const productIds = useMemo(() => {
    return data?.products.map((item: CartItem) => item.product);
  }, [data]);

  const { data: products, isLoading } = useProductsByIdsQuery(
    { ids: productIds },
    { skip: !productIds || productIds.length === 0 },
  );
  const productsTyped = products as ProductsByIdsResponse | undefined;

  const productsWithData = useMemo(() => {
    if (!productsTyped || !data) return [] as any[];
    return data.products
      .map((cartItem: CartItem) => {
        const product = productsTyped.results.find(
          (p: Product) => p.id === cartItem.product,
        );
        if (!product) return null;
        const variantDetails = Array.isArray(product.variants)
          ? product.variants.find((v: any) => v.id === cartItem.variant)
          : (product.variants as any);

        return {
          ...cartItem,
          pcs: cartItem.qty,
          categoryname: product.categoryname,
          description: product.description,
          images: product.images,
          product_name: product.product_name,
          productslug: product.productslug,
          variantDetails: variantDetails || {},
        };
      })
      .filter(Boolean) as any[];
  }, [productsTyped, data]);

  const truncateText = useCallback(
    (text: string, maxLength: number): string => {
      return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
    },
    [],
  );

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const calculateEstimatedArrival = (
    created: string,
    daysToAdd: number,
  ): string => {
    const createdDate = new Date(created);
    createdDate.setDate(createdDate.getDate() + daysToAdd);
    return formatDate(createdDate);
  };

  // Step 1: User picks a date from the calendar → open confirmation dialog
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setPendingDate(date);
    setDelayReason("");
    setCalendarOpen(false);
    setDateDialogOpen(true);
  };

  // Step 2: User confirms the date change in the dialog (with optional reason)
  const confirmDateUpdate = async () => {
    if (!pendingDate) return;
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;
    setIsUpdating(true);

    const formattedDate = format(pendingDate, "yyyy-MM-dd");
    const toastId = toast.loading("Updating delivery date...", {
      position: "top-center",
    });

    const actualData: Record<string, any> = {
      id: data.id,
      expected_delivery_date: formattedDate,
    };

    // Include reason if provided (even empty string clears previous reason)
    if (delayReason.trim()) {
      actualData.delivery_delay_reason = delayReason.trim();
    } else {
      actualData.delivery_delay_reason = "";
    }

    try {
      const res = await updateSale({ actualData, token });
      if (res.data) {
        toast.success("Delivery date updated", {
          id: toastId,
          position: "top-center",
        });
        setDateDialogOpen(false);
        setPendingDate(undefined);
        setDelayReason("");
        if (refetch) refetch();
      } else {
        toast.error("Failed to update", {
          id: toastId,
          position: "top-center",
        });
      }
    } catch (e) {
      toast.error("Something went wrong", {
        id: toastId,
        position: "top-center",
      });
    } finally {
      isUpdatingRef.current = false;
      setIsUpdating(false);
    }
  };

  const handleUpdateSale = async (id: number, status: string) => {
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;
    setIsUpdating(true);

    const toastId = toast.loading(
      `Updating status for order ${id} to ${status}`,
      {
        position: "top-center",
      },
    );

    try {
      const actualData = {
        id: id,
        status: status,
      };
      const res = await updateSale({ actualData, token });
      if (res.data) {
        toast.success("Status updated successfully", {
          id: toastId,
          position: "top-center",
        });
        if (refetch) refetch();
      } else {
        toast.error("Failed to update status", {
          id: toastId,
          position: "top-center",
        });
      }
    } catch (e) {
      toast.error("Something went wrong", {
        id: toastId,
        position: "top-center",
      });
    } finally {
      isUpdatingRef.current = false;
      setIsUpdating(false);
    }
  };

  // Determine if the pending date is later than the current delivery date (i.e. a delay)
  const isDelay = useMemo(() => {
    if (!pendingDate) return false;
    if (!data.expected_delivery_date) return true; // no previous date, any date is "new"
    const currentDate = new Date(data.expected_delivery_date);
    return pendingDate > currentDate;
  }, [pendingDate, data.expected_delivery_date]);

  return (
    <>
      <div className="text-left hover:no-underline p-0 w-full lg:min-w-[450px] bg-white dark:bg-neutral-900/50 rounded-lg">
        <div className="flex w-full rounded-lg p-1 flex-col">
          <div className="w-full p-2 flex justify-between items-center rounded-lg">
            <h1 className="flex gap-1">
              <ShoppingCart className="w-5 h-5" />{" "}
              {truncateText(data?.transactionuid, 15)}
            </h1>
            <span className="gap-2 flex items-center">
              {renderBadge(data?.status)}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="shadow-none"
                    aria-label="Open edit menu"
                    disabled={isUpdating}
                  >
                    <EllipsisIcon size={16} aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                {(data.status == "pending" ||
                  data.status == "unpaid" ||
                  data.status == "verified") && (
                  <DropdownMenuContent>
                    {data.status != "pending" && (
                      <DropdownMenuItem
                        disabled={isUpdating}
                        onClick={() => handleUpdateSale(data.id, "pending")}
                      >
                        Pending
                      </DropdownMenuItem>
                    )}
                    {data.status != "unpaid" && (
                      <DropdownMenuItem
                        disabled={isUpdating}
                        onClick={() => handleUpdateSale(data.id, "unpaid")}
                      >
                        UnPaid
                      </DropdownMenuItem>
                    )}
                    {data.status != "verified" && (
                      <DropdownMenuItem
                        disabled={isUpdating}
                        onClick={() => handleUpdateSale(data.id, "verified")}
                      >
                        Verified
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      disabled={isUpdating}
                      onClick={() => handleUpdateSale(data.id, "cancelled")}
                    >
                      Cancelled
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                )}
              </DropdownMenu>
            </span>
          </div>
          <div className="w-full p-2 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 rounded-lg">
            <span className="p-2 border-1 rounded-xl">
              <p className="text-sm flex items-center gap-1">
                <Truck className="w-4 h-4" /> Kathmandu, Nepal
              </p>
            </span>
            <span className="flex items-center justify-center">
              <LeftIcon className="dark:fill-white/70 dark:stroke-white/70 stroke-neutral-700 hidden lg:flex" />
              <span className="p-2 border-1 rounded-xl flex items-center gap-2">
                <p className="text-sm text-neutral-500">
                  Estimated arrival:{" "}
                  {data.expected_delivery_date
                    ? formatDate(new Date(data.expected_delivery_date))
                    : calculateEstimatedArrival(data?.created, 2)}
                </p>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={isUpdating}
                    >
                      <CalendarIcon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[200]">
                    <Calendar
                      mode="single"
                      selected={
                        data.expected_delivery_date
                          ? new Date(data.expected_delivery_date)
                          : undefined
                      }
                      onSelect={handleDateSelect}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </span>
              <RightIcon className="dark:fill-white/70 dark:stroke-white/70 stroke-neutral-700 hidden lg:flex" />
            </span>
            <span className="p-2 border-1 rounded-xl">
              <p className="text-sm flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {data?.shipping?.city}, {data?.shipping?.country}
              </p>
            </span>
          </div>
        </div>
        <div className="p-2 pb-0 flex gap-2 flex-col">
          <VoucherSkleton loading={isLoading}>
            {productsWithData.map((product: any) => (
              <Voucher key={product.productslug} data={product} price={false} />
            ))}
          </VoucherSkleton>
          <Separator className="mt-1" />
          <div className="w-full p-1 py-2 flex justify-between items-center">
            <p>Total: रु {data?.total_amt}</p>
          </div>
        </div>
      </div>

      {/* Delivery Date Update Confirmation Dialog */}
      <Dialog
        open={dateDialogOpen}
        onOpenChange={(open) => {
          if (!isUpdating) {
            setDateDialogOpen(open);
            if (!open) {
              setPendingDate(undefined);
              setDelayReason("");
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update Delivery Date</DialogTitle>
            <DialogDescription>
              {isDelay
                ? "This date is later than the current delivery date. A delay notification email will be sent to the customer."
                : "Update the expected delivery date for this order."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>New Delivery Date</Label>
              <p className="text-sm font-medium">
                {pendingDate ? format(pendingDate, "MMMM dd, yyyy") : "—"}
              </p>
            </div>
            {isDelay && (
              <div className="grid gap-2">
                <Label htmlFor="delay-reason">
                  Reason for delay{" "}
                  <span className="text-xs text-neutral-500">(optional)</span>
                </Label>
                <Textarea
                  id="delay-reason"
                  placeholder="e.g. Due to weather conditions, your delivery has been rescheduled..."
                  value={delayReason}
                  onChange={(e) => setDelayReason(e.target.value)}
                  rows={3}
                  className="resize-none"
                  disabled={isUpdating}
                />
                <p className="text-xs text-neutral-500">
                  This message will be included in the delay notification email
                  to the customer.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDateDialogOpen(false);
                setPendingDate(undefined);
                setDelayReason("");
              }}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDateUpdate}
              loading={isUpdating}
              disabled={isUpdating}
            >
              {isDelay ? "Update & Notify Customer" : "Update Date"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const Skeleton = () => {
  return (
    <section className="w-full min-w-[350px] p-1 h-full flex flex-col gap-1 rounded-lg">
      <div className="w-full animate-pulse bg-neutral-800/10 dark:bg-neutral-100/10 h-[390px] rounded-lg"></div>
    </section>
  );
};

export const PageSkeleton = ({
  loading,
  children,
}: {
  loading: boolean;
  children: React.ReactNode;
}) => {
  const load = useDeferredValue(loading);
  if (load) {
    return (
      <>
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} />
        ))}
      </>
    );
  }
  return <>{children}</>;
};

export default OrderRetrieve;
