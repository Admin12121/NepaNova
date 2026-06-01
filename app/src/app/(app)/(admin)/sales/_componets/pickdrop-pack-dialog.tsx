"use client";

import React, { ChangeEvent, useEffect, useState } from "react";
import { PackageCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  useLazyGetPickdropPayloadQuery,
  usePackWithPickdropMutation,
} from "@/lib/store/Service/api";

export type PickDropPackOrder = {
  id: number;
  transactionuid: string;
};

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
  weight: "",
  orderType: "",
  instruction: "",
  ref: "",
  dimWeight: {
    length: "",
    width: "",
    height: "",
    unit: "cm",
  },
};

const getApiErrorMessage = (error: unknown, fallback: string) => {
  const data = (error as { data?: { error?: string; detail?: string } })?.data;
  return data?.error || data?.detail || fallback;
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
  weight: String(draft?.weight ?? ""),
  orderType: String(draft?.orderType ?? ""),
  instruction: String(draft?.instruction ?? ""),
  ref: String(draft?.ref ?? draft?.vendorTrackingNumber ?? ""),
  dimWeight: {
    length: String(draft?.dimWeight?.length ?? ""),
    width: String(draft?.dimWeight?.width ?? ""),
    height: String(draft?.dimWeight?.height ?? ""),
    unit: String(draft?.dimWeight?.unit ?? "cm"),
  },
});

export const PickDropPackDialog = ({
  order,
  open,
  onOpenChange,
  accessToken,
  onPacked,
}: {
  order: PickDropPackOrder | null;
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

  const updateField = (field: keyof PickDropPayload, value: string) => {
    setPayload((current) => ({ ...current, [field]: value }));
  };

  const updateDimField = (field: keyof PickDropDimWeight, value: string) => {
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

  const isLoading = Boolean(payloadState.isFetching) || packWithPickdropState.isLoading;

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
