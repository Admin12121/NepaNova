"use client";
import React, {
  ChangeEvent,
  useReducer,
  useRef,
  useState,
  DragEvent,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  JSX,
} from "react";
import { Badge, BadgeCheck, PackageCheck, Trash2, Truck } from "lucide-react";
import { motion, PanInfo } from "framer-motion";
import { cn, delay } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  useGetOrdersQuery,
  useUpdateSaleMutation,
  useDeleteSaleMutation,
  useGetlayoutQuery,
  useLazyGetPickdropPayloadQuery,
  usePackWithPickdropMutation,
} from "@/lib/store/Service/api";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useRouter } from "nextjs-toploader/app";
import { Badge as Clip } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  addDays,
  getStoreSettings,
  type StoreSettings,
} from "@/lib/store-settings";

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
    address?: string;
    phone?: string;
    city: string;
    country: string;
    zipcode?: string;
  };
  discount: number;
  payment_method: string;
  redeem_data: any;
  payment_intent_id: any;
  created: string;
  updated_at: string;
  expected_delivery_date?: string;
}

type PickDropDimWeight = {
  length: string;
  width: string;
  height: string;
  unit: string;
};

type PickDropPayload = {
  vendorTrackingNumber: string;
  codAmount: string;
  orderDescription: string;
  customerName: string;
  landmark: string;
  primaryMobileNo: string;
  destinationBranch: string;
  destinationCityArea: string;
  businessAddress: string;
  weight: string;
  orderType: string;
  instruction: string;
  ref: string;
  dimWeight: PickDropDimWeight;
};

const emptyPickDropPayload: PickDropPayload = {
  vendorTrackingNumber: "",
  codAmount: "",
  orderDescription: "",
  customerName: "",
  landmark: "",
  primaryMobileNo: "",
  destinationBranch: "",
  destinationCityArea: "",
  businessAddress: "",
  weight: "1",
  orderType: "Regular",
  instruction: "",
  ref: "",
  dimWeight: {
    length: "",
    width: "",
    height: "",
    unit: "cm",
  },
};

interface State {
  onShippingOrders: Order[];
  arrivedOrders: Order[];
  deliveredOrders: Order[];
  canceledOrders: Order[];
  onShippingPage: number;
  arrivedPage: number;
  deliveredPage: number;
  canceledPage: number;
}

type Action =
  | { type: "SET_ONSHIPPING_ORDERS"; payload: Order[] }
  | { type: "SET_ARRIVED_ORDERS"; payload: Order[] }
  | { type: "SET_DELIVERED_ORDERS"; payload: Order[] }
  | { type: "SET_CANCELED_ORDERS"; payload: Order[] }
  | { type: "INCREMENT_ONSHIPPING_PAGE" }
  | { type: "INCREMENT_ARRIVED_PAGE" }
  | { type: "INCREMENT_DELIVERED_PAGE" }
  | { type: "INCREMENT_CANCELED_PAGE" };

export const initialState: State = {
  onShippingOrders: [],
  arrivedOrders: [],
  deliveredOrders: [],
  canceledOrders: [],
  onShippingPage: 1,
  arrivedPage: 1,
  deliveredPage: 1,
  canceledPage: 1,
};

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "SET_ONSHIPPING_ORDERS":
      return {
        ...state,
        onShippingOrders: [...state.onShippingOrders, ...action.payload],
      };
    case "SET_ARRIVED_ORDERS":
      return {
        ...state,
        arrivedOrders: [...state.arrivedOrders, ...action.payload],
      };
    case "SET_DELIVERED_ORDERS":
      return {
        ...state,
        deliveredOrders: [...state.deliveredOrders, ...action.payload],
      };
    case "SET_CANCELED_ORDERS":
      return {
        ...state,
        canceledOrders: [...state.canceledOrders, ...action.payload],
      };
    case "INCREMENT_ONSHIPPING_PAGE":
      return { ...state, onShippingPage: state.onShippingPage + 1 };
    case "INCREMENT_ARRIVED_PAGE":
      return { ...state, arrivedPage: state.arrivedPage + 1 };
    case "INCREMENT_DELIVERED_PAGE":
      return { ...state, deliveredPage: state.deliveredPage + 1 };
    case "INCREMENT_CANCELED_PAGE":
      return { ...state, canceledPage: state.canceledPage + 1 };
    default:
      return state;
  }
};

const getApiErrorMessage = (error: unknown, fallback: string) => {
  const data = (error as { data?: { error?: string; detail?: string } })?.data;
  return data?.error || data?.detail || fallback;
};

const Kanban = ({ deferredSearch }: { deferredSearch?: string }) => {
  const { accessToken } = useAuthUser();
  const [state, dispatch] = useReducer(reducer, initialState);
  const { data: layoutData } = useGetlayoutQuery({ layoutslug: "home" });
  const storeSettings = useMemo(
    () => getStoreSettings(layoutData?.config),
    [layoutData],
  );

  const {
    data: onShippingOrders,
    refetch: refetchOnShipping,
    isLoading: isLoadingOnShipping,
  } = useGetOrdersQuery(
    {
      token: accessToken,
      status: "onshipping",
      search: deferredSearch,
      page: state.onShippingPage,
    },
    { skip: !accessToken },
  );

  const {
    data: arrivedOrders,
    refetch: refetchArrived,
    isLoading: isLoadingArrived,
  } = useGetOrdersQuery(
    {
      token: accessToken,
      status: "arrived",
      search: deferredSearch,
      page: state.arrivedPage,
    },
    { skip: !accessToken },
  );

  const {
    data: deliveredOrders,
    refetch: refetchDelivered,
    isLoading: isLoadingDelivered,
  } = useGetOrdersQuery(
    {
      token: accessToken,
      status: "delivered",
      search: deferredSearch,
      page: state.deliveredPage,
    },
    { skip: !accessToken },
  );

  const {
    data: canceledOrders,
    refetch: refetchCanceled,
    isLoading: isLoadingCanceled,
  } = useGetOrdersQuery(
    {
      token: accessToken,
      status: "canceled",
      search: deferredSearch,
      page: state.canceledPage,
    },
    { skip: !accessToken },
  );

  const refetchData = (type: string, multiple: boolean) => {
    switch (type) {
      case "onshipping":
        refetchOnShipping();
        if (multiple) refetchArrived();
        break;
      case "arrived":
        refetchArrived();
        if (multiple) refetchDelivered();
        break;
      case "delivered":
        refetchDelivered();
        break;
      case "canceled":
        refetchCanceled();
        if (multiple) {
          refetchOnShipping();
          refetchArrived();
        }
        break;
      default:
        console.warn(`Unknown refetch type: ${type}`);
    }
  };

  const loadMore = (type: string) => {
    switch (type) {
      case "onshipping":
        dispatch({ type: "INCREMENT_ONSHIPPING_PAGE" });
        break;
      case "arrived":
        dispatch({ type: "INCREMENT_ARRIVED_PAGE" });
        break;
      case "delivered":
        dispatch({ type: "INCREMENT_DELIVERED_PAGE" });
        break;
      case "canceled":
        dispatch({ type: "INCREMENT_CANCELED_PAGE" });
        break;
      default:
        console.warn(`Unknown load more type: ${type}`);
    }
  };
  return (
    <div className="h-[calc(100dvh_-_120px)] w-full overflow-hidden">
      <div className="grid grid-cols-4 h-full w-full gap-1 px-6">
        <Column
          title="Payment Pending"
          column="onshipping"
          headingColor="orange-400"
          data={onShippingOrders}
          refetchData={refetchData}
          loadMore={() => loadMore("onshipping")}
          loading={isLoadingOnShipping}
          storeSettings={storeSettings}
        />
        <Column
          title="OnShipping"
          column="arrived"
          headingColor="blue-400"
          data={arrivedOrders}
          refetchData={refetchData}
          loadMore={() => loadMore("arrived")}
          loading={isLoadingArrived}
          storeSettings={storeSettings}
        />
        <Column
          title="Delivered"
          column="delivered"
          headingColor="green-400"
          data={deliveredOrders}
          refetchData={refetchData}
          loadMore={() => loadMore("delivered")}
          loading={isLoadingDelivered}
          storeSettings={storeSettings}
        />
        <Column
          title="Canceled"
          column="canceled"
          headingColor="red-400"
          data={canceledOrders}
          refetchData={refetchData}
          loadMore={() => loadMore("canceled")}
          loading={isLoadingCanceled}
          storeSettings={storeSettings}
        />
      </div>
    </div>
  );
};

type ColumnProps = {
  title: string;
  headingColor: string;
  column: any;
  data: any;
  refetchData: (type: string, multiple: boolean) => void;
  loadMore: () => void;
  loading: boolean;
  storeSettings: StoreSettings;
};

const getStatusTransition = (
  currentIndex: number,
  targetIndex: number,
): string | null => {
  if (currentIndex === 0 && targetIndex === 1) return "proceed";
  if (currentIndex === 1 && targetIndex === 2) return "delivered";
  if (
    (currentIndex === 0 && targetIndex === 3) ||
    (currentIndex === 1 && targetIndex === 3)
  )
    return "canceled";
  return null;
};

const Column = ({
  title,
  headingColor,
  column,
  data,
  refetchData,
  loadMore,
  loading,
  storeSettings,
}: ColumnProps) => {
  const { accessToken, hasPermission, role } = useAuthUser();
  const canManageOrders = role === "Admin" || hasPermission("orders.manage");
  const [updateSale] = useUpdateSaleMutation();
  const [deleteSale] = useDeleteSaleMutation();
  const isActionInProgressRef = useRef(false);
  const [packDialogOrder, setPackDialogOrder] = useState<Order | null>(null);
  const [packDialogCurrentColumn, setPackDialogCurrentColumn] =
    useState("arrived");

  const [active, setActive] = useState(false);

  const handleOpenPackDialog = (order: Order, currentColumnIndex: number) => {
    if (!canManageOrders) {
      toast.error("You do not have permission to manage orders", {
        position: "top-center",
      });
      return;
    }

    const columnOrder = ["onshipping", "arrived", "delivered", "canceled"];
    setPackDialogCurrentColumn(columnOrder[currentColumnIndex] || "arrived");
    setPackDialogOrder(order);
  };

  const handleDragStart = (e: DragEvent, card: CardType) => {
    if (!canManageOrders) {
      toast.error("You do not have permission to manage orders", {
        position: "top-center",
      });
      e.preventDefault();
      return;
    }

    const nonDraggableStatuses = ["pending", "proceed", "delivered"];
    if (nonDraggableStatuses.includes(card.status)) {
      toast.error("This order isn't verified yet", { position: "top-center" });
      e.preventDefault();
      return;
    }

    e.dataTransfer.setData("cardId", card.id.toString());
    e.dataTransfer.setData("status", card.status);
  };

  const handleDragEnd = (e: DragEvent) => {
    const cardId = e.dataTransfer.getData("cardId");
    const status = e.dataTransfer.getData("status");
    setActive(false);
    clearHighlights();

    const columnOrder = ["onshipping", "arrived", "delivered", "canceled"];
    let currentColumnIndex = -1;
    switch (status) {
      case "pending":
      case "verified":
        currentColumnIndex = columnOrder.indexOf("onshipping");
        break;
      case "proceed":
      case "packed":
        currentColumnIndex = columnOrder.indexOf("arrived");
        break;
      case "delivered":
      case "successful":
        currentColumnIndex = columnOrder.indexOf("delivered");
        break;
      default:
        currentColumnIndex = columnOrder.indexOf(status);
    }
    const targetColumnIndex = columnOrder.indexOf(column);
    if (targetColumnIndex - currentColumnIndex > 1) {
      toast.error("Cannot Skip Process", { position: "top-center" });
    } else if (targetColumnIndex < currentColumnIndex) {
      toast.error("Reverse Process is not allowed", { position: "top-center" });
      return;
    }
    const indicators = getIndicators();
    const { element } = getNearestIndicator(e, indicators);
    if (!element) return;
    const transition = getStatusTransition(
      currentColumnIndex,
      targetColumnIndex,
    );
    if (transition) {
      handleUpdateSale(parseInt(cardId), transition, currentColumnIndex, true);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    highlightIndicator(e);
    setActive(true);
  };

  const clearHighlights = (els?: HTMLElement[]) => {
    const indicators = els || getIndicators();

    indicators.forEach((i) => {
      i.style.opacity = "0";
    });
  };

  const highlightIndicator = (e: DragEvent) => {
    const indicators = getIndicators();

    clearHighlights(indicators);

    const el = getNearestIndicator(e, indicators);

    el.element.style.opacity = "1";
  };

  const getNearestIndicator = (e: DragEvent, indicators: HTMLElement[]) => {
    const DISTANCE_OFFSET = 50;

    const el = indicators.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();

        const offset = e.clientY - (box.top + DISTANCE_OFFSET);

        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      },
      {
        offset: Number.NEGATIVE_INFINITY,
        element: indicators[indicators.length - 1],
      },
    );

    return el;
  };

  const getIndicators = () => {
    return Array.from(
      document.querySelectorAll(
        `[data-column="${column}"]`,
      ) as unknown as HTMLElement[],
    );
  };

  const handleDragLeave = () => {
    clearHighlights();
    setActive(false);
  };

  const handleUpdateSale = async (
    id: number,
    status: string,
    currentStatus: number,
    type: boolean = false,
  ) => {
    if (!canManageOrders) {
      toast.error("You do not have permission to manage orders", {
        position: "top-center",
      });
      return;
    }

    if (status === "packed") {
      const order = data?.results?.find((item: Order) => item.id === id);
      if (order?.status === "proceed") {
        handleOpenPackDialog(order, currentStatus);
      } else {
        toast.error("Order must be in proceed status before packing", {
          position: "top-center",
        });
      }
      return;
    }

    if (isActionInProgressRef.current) return;
    isActionInProgressRef.current = true;

    const columnOrder = ["onshipping", "arrived", "delivered", "canceled"];
    const currentColumn = columnOrder[currentStatus];
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
      const res = await updateSale({ actualData, token: accessToken });
      if (res.data) {
        toast.success("Status updated successfully", {
          id: toastId,
          position: "top-center",
        });
        refetchData(currentColumn, type);
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
      isActionInProgressRef.current = false;
    }
  };

  const handleDeleteSale = async (id: number) => {
    if (!canManageOrders) {
      toast.error("You do not have permission to manage orders", {
        position: "top-center",
      });
      return;
    }

    if (isActionInProgressRef.current) return;
    isActionInProgressRef.current = true;

    const toastId = toast.loading("Deleting order...", {
      position: "top-center",
    });
    try {
      const res = await deleteSale({ id, token: accessToken });
      if (res.data) {
        toast.success("Order deleted successfully", {
          id: toastId,
          position: "top-center",
        });
        refetchData("canceled", false);
      } else {
        toast.error("Failed to delete order", {
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
      isActionInProgressRef.current = false;
    }
  };

  return (
    <div className="w-full shrink-0">
      <div className="mb-3 flex items-center justify-between">
        <h3
          className={`font-medium flex gap-2 relative items-center px-2 text-${headingColor}`}
        >
          <span
            className={cn(
              `animate-ping absolute inline-flex h-2 w-2  rounded-full bg-${headingColor}`,
            )}
          ></span>
          <span
            className={cn(
              `inline-flex h-2 w-2 right-0 top-0 rounded-full
              bg-${headingColor}`,
            )}
          ></span>
          {title}
        </h3>
        <span className="rounded text-sm text-neutral-400">{data?.count}</span>
      </div>
      <div
        onDrop={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`h-[calc(100dvh_-_145px)] pb-10 w-full overflow-y-auto transition-colors px-1 ${
          active ? "bg-neutral-800/50" : "bg-neutral-800/0"
        }`}
      >
        <SalesSkeleton loading={loading}>
          {data?.results.length > 0 ? (
            data?.results.map((c: Order) => {
              return (
                <Card
                  key={c.id}
                  {...c}
                  title={title}
                  handleDragStart={handleDragStart}
                  handleUpdateSale={handleUpdateSale}
                  handleOpenPackDialog={handleOpenPackDialog}
                  handleDeleteSale={handleDeleteSale}
                  storeSettings={storeSettings}
                  order={c}
                  canManageOrders={canManageOrders}
                />
              );
            })
          ) : (
            <div className="w-full flex justify-center">
              <p className="text-neutral-400 pt-10">No orders found</p>
            </div>
          )}
        </SalesSkeleton>
        <DropIndicator beforeId={null} column={column} />
        {data?.next && (
          <div className="w-full flex justify-center">
            <Button onClick={loadMore}>Load more</Button>
          </div>
        )}
      </div>
      <PickDropPackDialog
        order={packDialogOrder}
        open={Boolean(packDialogOrder)}
        onOpenChange={(open) => {
          if (!open) setPackDialogOrder(null);
        }}
        accessToken={accessToken}
        onPacked={() => {
          refetchData(packDialogCurrentColumn, false);
          setPackDialogOrder(null);
        }}
      />
    </div>
  );
};

const normalizePickDropPayload = (draft: any): PickDropPayload => ({
  ...emptyPickDropPayload,
  vendorTrackingNumber: String(draft?.vendorTrackingNumber ?? ""),
  codAmount: String(draft?.codAmount ?? ""),
  orderDescription: String(draft?.orderDescription ?? ""),
  customerName: String(draft?.customerName ?? ""),
  landmark: String(draft?.landmark ?? ""),
  primaryMobileNo: String(draft?.primaryMobileNo ?? ""),
  destinationBranch: String(draft?.destinationBranch ?? ""),
  destinationCityArea: String(draft?.destinationCityArea ?? ""),
  businessAddress: String(draft?.businessAddress ?? ""),
  weight: String(draft?.weight ?? "1"),
  orderType: String(draft?.orderType ?? "Regular"),
  instruction: String(draft?.instruction ?? ""),
  ref: String(draft?.ref ?? draft?.vendorTrackingNumber ?? ""),
  dimWeight: {
    length: String(draft?.dimWeight?.length ?? ""),
    width: String(draft?.dimWeight?.width ?? ""),
    height: String(draft?.dimWeight?.height ?? ""),
    unit: String(draft?.dimWeight?.unit ?? "cm"),
  },
});

const PickDropPackDialog = ({
  order,
  open,
  onOpenChange,
  accessToken,
  onPacked,
}: {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accessToken?: string;
  onPacked: () => void;
}) => {
  const [triggerPayload, payloadState] = useLazyGetPickdropPayloadQuery();
  const [packWithPickdrop, packWithPickdropState] =
    usePackWithPickdropMutation();
  const [payload, setPayload] =
    useState<PickDropPayload>(emptyPickDropPayload);

  useEffect(() => {
    if (!open || !order || !accessToken) return;

    setPayload(emptyPickDropPayload);
    triggerPayload({ id: order.id, token: accessToken })
      .unwrap()
      .then((draft: any) => {
        setPayload(normalizePickDropPayload(draft));
      })
      .catch((error: unknown) => {
        toast.error(
          getApiErrorMessage(error, "Failed to load Pick & Drop details"),
          { position: "top-center" },
        );
      });
  }, [accessToken, open, order, triggerPayload]);

  const updateField = (
    field: keyof PickDropPayload,
    value: string,
  ) => {
    setPayload((current) => ({ ...current, [field]: value }));
  };

  const updateDimField = (
    field: keyof PickDropDimWeight,
    value: string,
  ) => {
    setPayload((current) => ({
      ...current,
      dimWeight: { ...current.dimWeight, [field]: value },
    }));
  };

  const hasDimensions = ["length", "width", "height"].some(
    (field) =>
      payload.dimWeight[field as keyof PickDropDimWeight]?.trim() !== "",
  );

  const validateRequiredFields = () => {
    const requiredFields: Array<[keyof PickDropPayload, string]> = [
      ["businessAddress", "Business address"],
      ["customerName", "Customer name"],
      ["primaryMobileNo", "Mobile number"],
      ["destinationBranch", "Destination branch"],
      ["destinationCityArea", "Destination area"],
      ["landmark", "Landmark"],
      ["orderDescription", "Order description"],
      ["weight", "Package weight"],
      ["orderType", "Package type"],
    ];
    const missing = requiredFields
      .filter(([field]) => String(payload[field] ?? "").trim() === "")
      .map(([, label]) => label);

    if (missing.length > 0) {
      toast.error(`Missing: ${missing.join(", ")}`, {
        position: "top-center",
      });
      return false;
    }

    if (
      hasDimensions &&
      ["length", "width", "height"].some(
        (field) =>
          payload.dimWeight[field as keyof PickDropDimWeight].trim() === "",
      )
    ) {
      toast.error("Package dimensions need length, width, and height", {
        position: "top-center",
      });
      return false;
    }

    return true;
  };

  const handleConfirm = async () => {
    if (!order || !accessToken || !validateRequiredFields()) return;

    const dimWeight = hasDimensions
      ? {
          length: payload.dimWeight.length,
          width: payload.dimWeight.width,
          height: payload.dimWeight.height,
          unit: payload.dimWeight.unit || "cm",
        }
      : undefined;

    const toastId = toast.loading("Booking Pick & Drop shipment...", {
      position: "top-center",
    });

    const response = await packWithPickdrop({
      id: order.id,
      token: accessToken,
      actualData: {
        businessAddress: payload.businessAddress,
        customerName: payload.customerName,
        primaryMobileNo: payload.primaryMobileNo,
        destinationBranch: payload.destinationBranch,
        destinationCityArea: payload.destinationCityArea,
        landmark: payload.landmark,
        orderDescription: payload.orderDescription,
        weight: payload.weight,
        orderType: payload.orderType,
        instruction: payload.instruction,
        ref: payload.ref,
        dimWeight,
      },
    });

    if (response.data) {
      toast.success("Pick & Drop booked and order packed", {
        id: toastId,
        position: "top-center",
      });
      onPacked();
      return;
    }

    toast.error(
      getApiErrorMessage(response.error, "Failed to book Pick & Drop shipment"),
      { id: toastId, position: "top-center" },
    );
  };

  const isLoading =
    Boolean(payloadState.isFetching) || packWithPickdropState.isLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5" />
            Pick & Drop shipment
          </DialogTitle>
          <DialogDescription>
            Confirm courier details for order {order?.transactionuid}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Vendor tracking number</Label>
            <Input value={payload.vendorTrackingNumber} disabled />
          </div>
          <div className="space-y-2">
            <Label>COD amount</Label>
            <Input value={payload.codAmount} disabled />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Business pickup address</Label>
            <Input
              value={payload.businessAddress}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                updateField("businessAddress", event.target.value)
              }
              placeholder="Pickup address"
            />
          </div>
          <div className="space-y-2">
            <Label>Customer name</Label>
            <Input
              value={payload.customerName}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                updateField("customerName", event.target.value)
              }
              placeholder="Customer name"
            />
          </div>
          <div className="space-y-2">
            <Label>Mobile number</Label>
            <Input
              value={payload.primaryMobileNo}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                updateField("primaryMobileNo", event.target.value)
              }
              placeholder="98XXXXXXXX"
            />
          </div>
          <div className="space-y-2">
            <Label>Destination branch</Label>
            <Input
              value={payload.destinationBranch}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                updateField("destinationBranch", event.target.value)
              }
              placeholder="Destination branch"
            />
          </div>
          <div className="space-y-2">
            <Label>Destination area</Label>
            <Input
              value={payload.destinationCityArea}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                updateField("destinationCityArea", event.target.value)
              }
              placeholder="City or area"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Landmark / delivery address</Label>
            <Input
              value={payload.landmark}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                updateField("landmark", event.target.value)
              }
              placeholder="Delivery landmark"
            />
          </div>
          <div className="space-y-2">
            <Label>Package type</Label>
            <Input
              value={payload.orderType}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                updateField("orderType", event.target.value)
              }
              placeholder="Regular"
            />
          </div>
          <div className="space-y-2">
            <Label>Weight</Label>
            <Input
              value={payload.weight}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                updateField("weight", event.target.value)
              }
              placeholder="1"
              type="number"
              min="0.1"
              step="0.1"
            />
          </div>
          <div className="space-y-2">
            <Label>Length</Label>
            <Input
              value={payload.dimWeight.length}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                updateDimField("length", event.target.value)
              }
              type="number"
              min="0"
            />
          </div>
          <div className="space-y-2">
            <Label>Width</Label>
            <Input
              value={payload.dimWeight.width}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                updateDimField("width", event.target.value)
              }
              type="number"
              min="0"
            />
          </div>
          <div className="space-y-2">
            <Label>Height</Label>
            <Input
              value={payload.dimWeight.height}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                updateDimField("height", event.target.value)
              }
              type="number"
              min="0"
            />
          </div>
          <div className="space-y-2">
            <Label>Dimension unit</Label>
            <Select
              value={payload.dimWeight.unit}
              onValueChange={(value) => updateDimField("unit", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cm">cm</SelectItem>
                <SelectItem value="inch">inch</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Order description</Label>
            <Textarea
              value={payload.orderDescription}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                updateField("orderDescription", event.target.value)
              }
              placeholder="Order description"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Instruction</Label>
            <Textarea
              value={payload.instruction}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                updateField("instruction", event.target.value)
              }
              placeholder="Delivery instruction"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Reference</Label>
            <Input
              value={payload.ref}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                updateField("ref", event.target.value)
              }
              placeholder="Reference"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={isLoading}>
            Book and mark packed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const statusMap: Record<string, boolean> = {
  pending: false,
  verified: true,
  proceed: false,
  packed: true,
  delivered: false,
  successful: true,
};

const relevantStatuses: Record<string, string[]> = {
  pending: ["pending"],
  verified: ["verified"],
  proceed: ["verified", "proceed"],
  packed: ["verified", "packed"],
  delivered: ["verified", "packed", "delivered"],
  successful: ["verified", "packed", "successful"],
};

type DragStartHandler = (e: DragEvent, card: CardType) => void;

const Card = ({
  order,
  transactionuid,
  id,
  status,
  total_amt,
  payment_method,
  created,
  title,
  handleDragStart,
  handleUpdateSale,
  handleOpenPackDialog,
  handleDeleteSale,
  expected_delivery_date,
  storeSettings,
  canManageOrders,
}: Order & {
  order: Order;
  handleDragStart: DragStartHandler;
  handleUpdateSale: any;
  handleOpenPackDialog: (order: Order, currentColumnIndex: number) => void;
  handleDeleteSale: (id: number) => Promise<void>;
  title: string;
  storeSettings: StoreSettings;
  canManageOrders: boolean;
}) => {
  const route = useRouter();

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
    return formatDate(addDays(new Date(created), daysToAdd));
  };

  const handleMotionDragStart = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    const dragEvent = event as unknown as DragEvent;
    handleDragStart(dragEvent, { transactionuid, id: id.toString(), status });
  };

  const getAchievedBadges = ({
    currentStatus,
    id,
  }: {
    currentStatus: string;
    id: number;
  }): JSX.Element[] => {
    const relevant = relevantStatuses[currentStatus] || [];

    const handleUpdate = () => {
      let state = "";
      let currentIndex = -1;
      switch (currentStatus) {
        case "pending":
          state = "verified";
          currentIndex = 0;
          break;
        case "proceed":
          state = "packed";
          currentIndex = 1;
          break;
        case "delivered":
          state = "successful";
          currentIndex = 2;
          break;
        default:
          toast.error("Not a valid state", { position: "top-center" });
          return;
      }
      if (currentStatus === "proceed") {
        handleOpenPackDialog(order, currentIndex);
        return;
      }
      handleUpdateSale(id, state, currentIndex);
    };

    return relevant.map((status) => {
      const isVerified = statusMap[status];
      return isVerified ? (
        <BadgeCheck className="w-4 h-4 stroke-brandNavy " key={status} />
      ) : (
        <Badge
          onClick={canManageOrders ? handleUpdate : undefined}
          className={cn(
            "w-4 h-4 stroke-main",
            canManageOrders
              ? "!cursor-pointer hover:fill-main/40"
              : "cursor-not-allowed opacity-60",
          )}
          key={status}
        />
      );
    });
  };

  return (
    <>
      <DropIndicator beforeId={id.toString()} column={status} />
      <motion.div
        layout
        layoutId={id.toString()}
        draggable={canManageOrders}
        onDragStart={handleMotionDragStart}
        {...{
          className: cn(
            "cursor-grab rounded-lg border hover:ring-2 ring-offset-background hover:ring-offset-2 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 p-2 active:cursor-grabbing transition-all duration-500",
            title === "OnShipping" && "ring-brandNavy",
            title === "Arrived" && "ring-brandNavy",
            title === "Delivered" && "ring-brandGreen",
            title === "Canceled" && "ring-brandRed",
          ),
        }}
      >
        <span className="flex gap-2 items-center justify-between">
          <p className="text-sm dark:text-neutral-100 flex items-center gap-1">
            <Truck className="w-4 h-4" />
            {truncateText(transactionuid, 15)}
          </p>
          <div className="flex gap-1">
            {getAchievedBadges({ currentStatus: status, id: id })}
            {status == "unpaid" && (
              <Clip variant="secondary" className={"relative border-0 gap-1"}>
                <span
                  className={
                    "animate-ping absolute inline-flex h-2 w-2  rounded-full bg-neutral-500"
                  }
                ></span>
                <span
                  className={
                    "inline-flex h-2 w-2 right-0 top-0 rounded-full bg-neutral-500"
                  }
                ></span>
                Unpaid
              </Clip>
            )}
          </div>
        </span>
        <p className="text-sm text-neutral-500 flex items-center gap-1 pt-2">
          Estimated arrival:{" "}
          {expected_delivery_date
            ? formatDate(new Date(expected_delivery_date))
            : calculateEstimatedArrival(
                created,
                storeSettings.deliveryEstimateDays,
              )}
        </p>
        <div className="w-full flex justify-between items-end">
          <p>Total: रु {total_amt}</p>
          <span className="flex gap-1 items-center">
            {canManageOrders &&
              (status === "cancelled" || status === "unpaid") && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="p-1.5 h-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this order?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete order #{transactionuid}. This
                      action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600 hover:bg-red-700"
                      onClick={() => handleDeleteSale(id)}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button
              size="sm"
              onClick={() => route.push(`sales/${transactionuid}`)}
            >
              Details
            </Button>
          </span>
        </div>
      </motion.div>
    </>
  );
};

type DropIndicatorProps = {
  beforeId: string | null;
  column: string;
};

const DropIndicator = ({ beforeId, column }: DropIndicatorProps) => {
  return (
    <div
      data-before={beforeId || "-1"}
      data-column={column}
      className="my-0.5 h-0.5 w-full bg-violet-400 opacity-0"
    />
  );
};

const Skeleton = () => {
  return (
    <div className="w-full h-24 flex flex-col justify-between bg-neutral-700/40 mb-2 rounded-lg border border-neutral-700 p-1">
      <span className="flex gap-2">
        <span className="animate-pulse w-full h-10 rounded-lg bg-neutral-700/50"></span>
      </span>
      <span className="flex gap-2 justify-between">
        <span className="animate-pulse w-1/2 h-10 rounded-lg bg-neutral-700/50"></span>
        <span className="animate-pulse w-20 h-10 rounded-lg bg-neutral-700/50"></span>
      </span>
    </div>
  );
};

export const SalesSkeleton = ({
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
        {Array.from(
          { length: Math.floor(Math.random() * 4) + 1 },
          (_, index) => (
            <Skeleton key={index} />
          ),
        )}
      </>
    );
  }
  return <>{children}</>;
};

type CardType = {
  transactionuid: string;
  id: string;
  status: any;
};

export default Kanban;
