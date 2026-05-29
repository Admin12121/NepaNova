import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const renderBadge = (status: string) => {
  const statusMap: {
    [key: string]: {
      varaint?:
        | "default"
        | "secondary"
        | "warning"
        | "success"
        | "danger"
        | "destructive"
        | "outline"
        | null
        | undefined;
      color: string;
      label: string;
    };
  } = {
    pending: { varaint: "warning", color: "bg-brandNavy", label: "Pending" },
    verified: { varaint: "warning", color: "bg-brandNavy", label: "Verified" },
    proceed: { color: "bg-brandNavy", label: "Proceed" },
    packed: { color: "bg-brandNavy", label: "Packed" },
    delivered: {
      varaint: "success",
      color: "bg-brandGreen",
      label: "Delivered",
    },
    successful: {
      varaint: "success",
      color: "bg-brandGreen",
      label: "Successful",
    },
    unpaid: { varaint: "secondary", color: "bg-neutral-500", label: "Unpaid" },
    cancelled: { varaint: "danger", color: "bg-brandRed", label: "Cancelled" },
  };

  const { varaint, color, label } = statusMap[status] || {
    varaint: "default",
    color: "gray",
    label: "Unknown",
  };
  return (
    <Badge variant={varaint} className={`relative border-0 gap-1`}>
      <span
        className={cn(
          "animate-ping absolute inline-flex h-2 w-2  rounded-full ",
          color
        )}
      ></span>
      <span
        className={cn("inline-flex h-2 w-2 right-0 top-0 rounded-full ", color)}
      ></span>
      {label}
    </Badge>
  );
};
