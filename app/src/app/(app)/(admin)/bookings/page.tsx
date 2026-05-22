"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  Search,
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Truck,
  X,
  Plus,
  CalendarIcon,
  Receipt,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  bookingFormSchema,
  coatFieldMeta,
  coatFields,
  pantFieldMeta,
  pantFields,
  shirtFieldMeta,
  shirtFields,
  type BookingFormData,
  type MeasurementFieldMeta,
} from "@/lib/booking-form";

import { useAuthUser } from "@/hooks/use-auth-user";
import {
  useGetBookingsQuery,
  useGetBookingQuery,
  useUpdateBookingStatusMutation,
  useUpdateMeasurementsMutation,
  useDeleteBookingMutation,
  useGetBookingStatsQuery,
  useCustomerLookupQuery,
  useCreateBookingMutation,
} from "@/lib/store/Service/api";
import BillDialog from "./_components/bill-dialog";

const statusColors: Record<string, string> = {
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  completed:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  delivered:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="w-4 h-4" />,
  confirmed: <CheckCircle className="w-4 h-4" />,
  in_progress: <Package className="w-4 h-4" />,
  completed: <CheckCircle className="w-4 h-4" />,
  delivered: <Truck className="w-4 h-4" />,
  cancelled: <XCircle className="w-4 h-4" />,
};

const measurementSchema = z.object({
  status: z.enum([
    "pending",
    "confirmed",
    "in_progress",
    "completed",
    "delivered",
    "cancelled",
  ]),
  delivery_date: z.string().optional(),
  admin_message: z.string().optional(),
  coat_measurements: z.record(z.record(z.string())).optional(),
  pant_measurements: z.record(z.record(z.string())).optional(),
  shirt_measurements: z.record(z.record(z.string())).optional(),
  send_email: z.boolean().optional(),
});

type MeasurementFormData = z.infer<typeof measurementSchema>;

interface Booking {
  id: number;
  name: string;
  email: string;
  phone_number: string;
  location: string;
  measurement_type: string;
  preferred_date: string;
  preferred_time: string;
  customer_notes?: string;
  status: string;
  bill_number?: string;
  bill_data?: Record<string, any>;
  delivery_date?: string;
  admin_message?: string;
  coat_measurements?: Record<string, Record<string, string>>;
  pant_measurements?: Record<string, Record<string, string>>;
  shirt_measurements?: Record<string, Record<string, string>>;
  has_measurements: boolean;
  created_at: string;
}

interface PaginatedBookingsResponse {
  count: number;
  next?: string | null;
  page_size?: number;
  previous?: string | null;
  results: Booking[];
}

// Measurement Input Grid Component
function MeasurementGrid({
  fields,
  measurements,
  onChange,
  title,
  fieldMeta,
}: {
  fields: string[];
  measurements: Record<string, Record<string, string>>;
  onChange: (field: string, column: "A" | "B", value: string) => void;
  title: string;
  fieldMeta?: Partial<Record<string, MeasurementFieldMeta>>;
}) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted p-2 font-semibold text-center border-b text-sm">
        {title}
      </div>
      <div className="grid grid-cols-3 border-b bg-muted/50">
        <div className="p-2 text-center text-xs font-medium border-r"></div>
        <div className="p-2 text-center text-xs font-medium border-r">A</div>
        <div className="p-2 text-center text-xs font-medium">B</div>
      </div>
      {fields.map((field) => {
        const meta = fieldMeta?.[field];

        return (
          <div
            key={field}
            className="grid grid-cols-3 border-b last:border-b-0"
          >
            <div className="p-2 border-r bg-muted/30 flex items-center justify-center text-center leading-tight">
              <p className="text-xs font-semibold">
                {meta?.helper ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help underline decoration-dotted underline-offset-2">
                        {meta?.label || field}
                        {meta?.label && (
                          <span className="text-[10px] text-muted-foreground">
                            {" "}
                            ({field})
                          </span>
                        )}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="max-w-xs text-[11px] leading-relaxed"
                    >
                      {meta.helper}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <>{meta?.label || field}</>
                )}
                {!meta?.helper && meta?.label && (
                  <span className="text-[10px] text-muted-foreground">
                    {" "}
                    ({field})
                  </span>
                )}
              </p>
            </div>
            <div className="p-1 border-r">
              <Input
                type="text"
                className="h-7 text-center text-sm"
                value={measurements[field]?.A || ""}
                onChange={(e) => onChange(field, "A", e.target.value)}
                placeholder="-"
              />
            </div>
            <div className="p-1">
              <Input
                type="text"
                className="h-7 text-center text-sm"
                value={measurements[field]?.B || ""}
                onChange={(e) => onChange(field, "B", e.target.value)}
                placeholder="-"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Helper to format 24h time string to 12h AM/PM
function formatTimeAMPM(time: string): string {
  if (!time) return "";
  // Handle "HH:MM:SS" or "HH:MM"
  const parts = time.split(":");
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1] || "00";
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
}

// Schema for admin create booking form
const createBookingSchema = bookingFormSchema;
type CreateBookingFormData = BookingFormData;

const timeSlots = [
  { value: "09:00", label: "09:00 AM" },
  { value: "09:30", label: "09:30 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "10:30", label: "10:30 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "11:30", label: "11:30 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "12:30", label: "12:30 PM" },
  { value: "14:00", label: "02:00 PM" },
  { value: "14:30", label: "02:30 PM" },
  { value: "15:00", label: "03:00 PM" },
  { value: "15:30", label: "03:30 PM" },
  { value: "16:00", label: "04:00 PM" },
  { value: "16:30", label: "04:30 PM" },
  { value: "17:00", label: "05:00 PM" },
  { value: "17:30", label: "05:30 PM" },
];

export default function AdminBookingsPage() {
  const { accessToken: token } = useAuthUser();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [rowsperpage, setRowsPerPage] = useState<number | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(
    null,
  );
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteBookingId, setDeleteBookingId] = useState<number | null>(null);
  const [billDialogOpen, setBillDialogOpen] = useState(false);
  const [lookupQuery, setLookupQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const {
    data: bookings,
    isLoading,
    refetch,
  } = useGetBookingsQuery(
    {
      token,
      status: statusFilter !== "all" ? statusFilter : undefined,
      search: searchQuery || undefined,
      page,
      rowsperpage,
    },
    { skip: !token },
  );

  const { data: stats } = useGetBookingStatsQuery({ token }, { skip: !token });

  const {
    data: selectedBooking,
    isLoading: isLoadingBooking,
    refetch: refetchBooking,
  } = useGetBookingQuery(
    { id: selectedBookingId, token },
    {
      skip: !selectedBookingId || !token,
      refetchOnMountOrArgChange: true,
    },
  );

  const { data: lookupResults } = useCustomerLookupQuery(
    { query: lookupQuery, token },
    { skip: !lookupQuery || lookupQuery.length < 3 || !token },
  );

  const [updateStatus] = useUpdateBookingStatusMutation();
  const [updateMeasurements] = useUpdateMeasurementsMutation();
  const [deleteBooking] = useDeleteBookingMutation();
  const [createBooking, { isLoading: isCreating }] = useCreateBookingMutation();

  const paginatedBookings = Array.isArray(bookings)
    ? null
    : (bookings as PaginatedBookingsResponse | undefined);
  const allBookingItems = Array.isArray(bookings)
    ? bookings
    : paginatedBookings?.results || [];
  const totalBookings = Array.isArray(bookings)
    ? bookings.length
    : paginatedBookings?.count || 0;
  const effectivePageSize =
    rowsperpage ||
    paginatedBookings?.page_size ||
    10;
  const bookingItems = Array.isArray(bookings)
    ? allBookingItems.slice(
        (page - 1) * effectivePageSize,
        page * effectivePageSize,
      )
    : allBookingItems;
  const totalPages = Math.max(1, Math.ceil(totalBookings / effectivePageSize));
  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;
  const currentRangeStart =
    totalBookings > 0 ? (page - 1) * effectivePageSize + 1 : 0;
  const currentRangeEnd =
    totalBookings > 0
      ? Math.min(currentRangeStart + bookingItems.length - 1, totalBookings)
      : 0;

  const getPageNumbers = () => {
    const pageNumbers: (number | "ellipsis")[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else if (page <= 3) {
      for (let i = 1; i <= 4; i++) {
        pageNumbers.push(i);
      }
      pageNumbers.push("ellipsis");
      pageNumbers.push(totalPages);
    } else if (page >= totalPages - 2) {
      pageNumbers.push(1);
      pageNumbers.push("ellipsis");
      for (let i = totalPages - 3; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      pageNumbers.push(1);
      pageNumbers.push("ellipsis");
      for (let i = page - 1; i <= page + 1; i++) {
        pageNumbers.push(i);
      }
      pageNumbers.push("ellipsis");
      pageNumbers.push(totalPages);
    }

    return pageNumbers;
  };

  const form = useForm<MeasurementFormData>({
    resolver: zodResolver(measurementSchema),
    defaultValues: {
      status: "pending",
      coat_measurements: {},
      pant_measurements: {},
      shirt_measurements: {},
      send_email: false,
    },
  });

  // Populate form when the fetched selectedBooking data arrives/changes
  const populateForm = useCallback(
    (booking: Booking) => {
      form.reset({
        status: booking.status as any,
        delivery_date: booking.delivery_date || "",
        admin_message: booking.admin_message || "",
        coat_measurements: booking.coat_measurements || {},
        pant_measurements: booking.pant_measurements || {},
        shirt_measurements: booking.shirt_measurements || {},
        send_email: false,
      });
    },
    [form],
  );

  // Auto-populate form when selectedBooking is fetched from API
  useEffect(() => {
    if (selectedBooking) {
      populateForm(selectedBooking);
    }
  }, [selectedBooking, populateForm]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const handleMeasurementChange = (
    type: "coat" | "pant" | "shirt",
    field: string,
    column: "A" | "B",
    value: string,
  ) => {
    const fieldName = `${type}_measurements` as const;
    const current = form.getValues(fieldName) || {};
    form.setValue(fieldName, {
      ...current,
      [field]: {
        ...(current[field] || {}),
        [column]: value,
      },
    });
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await updateStatus({ id, status: newStatus, token }).unwrap();
      toast.success(`Status updated to ${newStatus.replace("_", " ")}`);
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleSaveMeasurements = async (data: MeasurementFormData) => {
    if (!selectedBookingId) return;

    setIsSaving(true);
    try {
      await updateMeasurements({
        id: selectedBookingId,
        data,
        token,
      }).unwrap();
      toast.success("Measurements saved successfully");
      if (data.send_email) {
        toast.success("Email sent to customer");
      }
    } catch (error) {
      toast.error("Failed to save measurements");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteBookingId) return;
    try {
      await deleteBooking({ id: deleteBookingId, token }).unwrap();
      toast.success("Booking deleted");
      setDeleteBookingId(null);
    } catch (error) {
      toast.error("Failed to delete booking");
    }
  };

  const openBookingDetail = (booking: Booking) => {
    setSelectedBookingId(booking.id);
    // Form will auto-populate via useEffect when selectedBooking is fetched
  };

  // ---- Create Booking Form ----
  const createForm = useForm<CreateBookingFormData>({
    resolver: zodResolver(createBookingSchema),
    defaultValues: {
      name: "",
      email: "",
      phone_number: "",
      location: "",
      measurement_type: "in_store",
      preferred_time: "",
      customer_notes: "",
      coat_measurements: {},
      pant_measurements: {},
      shirt_measurements: {},
    },
  });

  const watchCreateMeasurementType = createForm.watch("measurement_type");

  const handleCreateMeasurementChange = (
    type: "coat" | "pant" | "shirt",
    field: string,
    column: "A" | "B",
    value: string,
  ) => {
    const fieldName = `${type}_measurements` as const;
    const current = createForm.getValues(fieldName) || {};
    createForm.setValue(fieldName, {
      ...current,
      [field]: {
        ...(current[field] || {}),
        [column]: value,
      },
    });
  };

  const handleCreateBooking = async (data: CreateBookingFormData) => {
    if (!token) {
      toast.error("You must be logged in to create a booking");
      return;
    }
    try {
      const payload: any = {
        name: data.name,
        measurement_type: data.measurement_type,
        preferred_date: format(data.preferred_date, "yyyy-MM-dd"),
        preferred_time: data.preferred_time,
        customer_notes: data.customer_notes || "",
      };

      if (data.email) {
        payload.email = data.email;
      }
      if (data.phone_number) {
        payload.phone_number = data.phone_number;
      }
      if (data.location) {
        payload.location = data.location;
      }

      // Include measurements if provided
      const hasCoat =
        data.coat_measurements &&
        Object.keys(data.coat_measurements).length > 0;
      const hasPant =
        data.pant_measurements &&
        Object.keys(data.pant_measurements).length > 0;
      const hasShirt =
        data.shirt_measurements &&
        Object.keys(data.shirt_measurements).length > 0;

      if (hasCoat) payload.coat_measurements = data.coat_measurements;
      if (hasPant) payload.pant_measurements = data.pant_measurements;
      if (hasShirt) payload.shirt_measurements = data.shirt_measurements;

      await createBooking({ data: payload, token }).unwrap();
      toast.success("Booking created successfully!");
      setCreateDialogOpen(false);
      createForm.reset();
    } catch (error: any) {
      console.error("Create booking error:", error);
      toast.error(error?.data?.detail || "Failed to create booking");
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Bookings & Measurements</h1>
          <p className="text-muted-foreground">
            Manage customer bookings and record measurements
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Create Booking
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold">{stats?.total || 0}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 dark:border-yellow-900">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-yellow-600">
              {stats?.pending || 0}
            </p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 dark:border-blue-900">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-blue-600">
              {stats?.confirmed || 0}
            </p>
            <p className="text-xs text-muted-foreground">Confirmed</p>
          </CardContent>
        </Card>
        <Card className="border-indigo-200 dark:border-indigo-900">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-indigo-600">
              {stats?.in_progress || 0}
            </p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 dark:border-green-900">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-green-600">
              {stats?.completed || 0}
            </p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 dark:border-amber-900">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-amber-600">
              {stats?.delivered || 0}
            </p>
            <p className="text-xs text-muted-foreground">Delivered</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-900">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-red-600">
              {stats?.cancelled || 0}
            </p>
            <p className="text-xs text-muted-foreground">Cancelled</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, email, or bill number..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
          </div>
          <div className="w-48">
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardContent className="border-t px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-muted-foreground">
            Total {totalBookings} bookings
          </span>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Rows per page:
            <select
              className="rounded-md border bg-background px-2 py-1 text-sm text-foreground outline-none"
              value={String(rowsperpage || paginatedBookings?.page_size || 10)}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </label>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card>
        <CardContent className="p-0">
          <div className="border-b px-4 py-3 text-sm text-muted-foreground">
            {totalBookings > 0
              ? `Showing ${currentRangeStart}-${currentRangeEnd} of ${totalBookings} bookings`
              : "No bookings to show"}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Appointment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Measurements</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-32" />
                    </TableCell>
                  </TableRow>
                ))
              ) : bookingItems.length > 0 ? (
                bookingItems.map((b: Booking) => (
                  <TableRow
                    key={b.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openBookingDetail(b)}
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{b.name}</span>
                        {b.bill_number && (
                          <span className="text-xs font-mono text-muted-foreground">
                            #{b.bill_number}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {b.phone_number}
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="w-3 h-3" /> {b.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(
                            new Date(b.preferred_date),
                            "MMM dd, yyyy",
                          )}{" "}
                          {formatTimeAMPM(b.preferred_time)}
                        </span>
                        <Badge variant="outline" className="w-fit text-xs mt-1">
                          {b.measurement_type === "in_store"
                            ? "🏪 In-Store"
                            : b.measurement_type === "self"
                              ? "📏 Self"
                              : "🏠 Home Visit"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={b.status}
                        onValueChange={(value) =>
                          handleStatusChange(b.id, value)
                        }
                      >
                        <SelectTrigger
                          className={`${statusColors[b.status]} text-xs w-32 h-8 justify-start`}
                          customIcon={<></>}
                        >
                          {statusIcons[b.status]}
                          <span className="ml-1">
                            {b.status.replace("_", " ")}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="in_progress">
                            In Progress
                          </SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {b.has_measurements ? (
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        >
                          ✓ Recorded
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-muted-foreground"
                        >
                          Not yet
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openBookingDetail(b)}
                          title="View & Edit"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600"
                          onClick={() => setDeleteBookingId(b.id)}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No bookings found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="border-t px-4 py-3">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (hasPreviousPage) {
                          setPage(page - 1);
                        }
                      }}
                      className={cn(
                        !hasPreviousPage && "pointer-events-none opacity-50",
                      )}
                    />
                  </PaginationItem>

                  {getPageNumbers().map((pageNumber, index) =>
                    pageNumber === "ellipsis" ? (
                      <PaginationItem key={`ellipsis-${index}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={pageNumber}>
                        <PaginationLink
                          href="#"
                          isActive={page === pageNumber}
                          onClick={(e) => {
                            e.preventDefault();
                            setPage(pageNumber);
                          }}
                          className="cursor-pointer"
                        >
                          {pageNumber}
                        </PaginationLink>
                      </PaginationItem>
                    ),
                  )}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (hasNextPage) {
                          setPage(page + 1);
                        }
                      }}
                      className={cn(
                        !hasNextPage && "pointer-events-none opacity-50",
                      )}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedBookingId}
        onOpenChange={() => setSelectedBookingId(null)}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Booking Details
              {selectedBooking?.bill_number && (
                <Badge variant="secondary" className="font-mono">
                  #{selectedBooking.bill_number}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              View customer info and record measurements
            </DialogDescription>
          </DialogHeader>

          {isLoadingBooking ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            selectedBooking && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Side - Customer Info (Read-only) */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Customer Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Name
                          </Label>
                          <p className="font-medium">{selectedBooking.name}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Email
                          </Label>
                          <p className="font-medium">{selectedBooking.email}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Phone
                          </Label>
                          <p className="font-medium">
                            {selectedBooking.phone_number}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Location
                          </Label>
                          <p className="font-medium">
                            {selectedBooking.location}
                          </p>
                        </div>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Appointment Date
                          </Label>
                          <p className="font-medium">
                            {format(
                              new Date(selectedBooking.preferred_date),
                              "MMMM dd, yyyy",
                            )}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Time
                          </Label>
                          <p className="font-medium">
                            {formatTimeAMPM(selectedBooking.preferred_time)}
                          </p>
                        </div>
                        <div className="space-x-2">
                          <Label className="text-xs text-muted-foreground">
                            Type
                          </Label>
                          <Badge variant="outline">
                            {selectedBooking.measurement_type === "in_store"
                              ? "🏪 In-Store"
                              : selectedBooking.measurement_type === "self"
                                ? "📏 Self"
                                : "🏠 Home Visit"}
                          </Badge>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Booked On
                          </Label>
                          <p className="font-medium">
                            {format(
                              new Date(selectedBooking.created_at),
                              "MMM dd, yyyy",
                            )}
                          </p>
                        </div>
                      </div>
                      {selectedBooking.customer_notes && (
                        <>
                          <Separator />
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              Customer Notes
                            </Label>
                            <p className="text-sm bg-muted p-2 rounded mt-1">
                              {selectedBooking.customer_notes}
                            </p>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Right Side - Admin Form (Editable) */}
                <div>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Edit className="w-5 h-5" />
                        Record Measurements
                      </CardTitle>
                      <CardDescription>
                        Fill in measurements and update status
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form
                        onSubmit={form.handleSubmit(handleSaveMeasurements)}
                        className="space-y-4"
                      >
                        {/* Status and Delivery */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Status</Label>
                            <Select
                              value={form.watch("status")}
                              onValueChange={(v) =>
                                form.setValue("status", v as any)
                              }
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="confirmed">
                                  Confirmed
                                </SelectItem>
                                <SelectItem value="in_progress">
                                  In Progress
                                </SelectItem>
                                <SelectItem value="completed">
                                  Completed
                                </SelectItem>
                                <SelectItem value="delivered">
                                  Delivered
                                </SelectItem>
                                <SelectItem value="cancelled">
                                  Cancelled
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Expected Delivery</Label>
                            <Input
                              type="date"
                              className="h-9"
                              {...form.register("delivery_date")}
                            />
                          </div>
                        </div>

                        {/* Measurements */}
                        <Tabs defaultValue="coat" className="w-full">
                          <TabsList className="grid grid-cols-3 h-8">
                            <TabsTrigger value="coat" className="text-xs">
                              Coat & Safari
                            </TabsTrigger>
                            <TabsTrigger value="pant" className="text-xs">
                              Pant
                            </TabsTrigger>
                            <TabsTrigger value="shirt" className="text-xs">
                              Shirt
                            </TabsTrigger>
                          </TabsList>
                          <TabsContent value="coat" className="mt-2">
                            <MeasurementGrid
                              fields={coatFields}
                              measurements={
                                form.watch("coat_measurements") || {}
                              }
                              onChange={(f, c, v) =>
                                handleMeasurementChange("coat", f, c, v)
                              }
                              title="COAT & SAFARI, W. COAT"
                              fieldMeta={coatFieldMeta}
                            />
                          </TabsContent>
                          <TabsContent value="pant" className="mt-2">
                            <MeasurementGrid
                              fields={pantFields}
                              measurements={
                                form.watch("pant_measurements") || {}
                              }
                              onChange={(f, c, v) =>
                                handleMeasurementChange("pant", f, c, v)
                              }
                              title="PANT"
                              fieldMeta={pantFieldMeta}
                            />
                          </TabsContent>
                          <TabsContent value="shirt" className="mt-2">
                            <MeasurementGrid
                              fields={shirtFields}
                              measurements={
                                form.watch("shirt_measurements") || {}
                              }
                              onChange={(f, c, v) =>
                                handleMeasurementChange("shirt", f, c, v)
                              }
                              title="SHIRT"
                              fieldMeta={shirtFieldMeta}
                            />
                          </TabsContent>
                        </Tabs>

                        {/* Admin Message */}
                        <div className="space-y-1">
                          <Label className="text-xs">
                            Message to Customer (optional)
                          </Label>
                          <Textarea
                            {...form.register("admin_message")}
                            placeholder="Any notes or message to include in the email..."
                            rows={2}
                            className="text-sm"
                          />
                        </div>

                        {/* Email Option */}
                        <div className="flex items-center gap-2 p-2 bg-muted rounded">
                          <input
                            type="checkbox"
                            id="send_email"
                            {...form.register("send_email")}
                            className="rounded"
                          />
                          <Label
                            htmlFor="send_email"
                            className="text-sm cursor-pointer"
                          >
                            Send email notification to customer
                          </Label>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setSelectedBookingId(null)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setBillDialogOpen(true)}
                            className="flex-1 gap-1.5"
                          >
                            <Receipt className="w-4 h-4" />
                            Bill
                          </Button>
                          <Button type="submit" className="flex-1">
                            Save Changes
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )
          )}
        </DialogContent>
      </Dialog>

      {/* Bill Dialog */}
      {selectedBooking && (
        <BillDialog
          booking={selectedBooking}
          open={billDialogOpen}
          onOpenChange={setBillDialogOpen}
        />
      )}

      {/* Create Booking Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create New Booking
            </DialogTitle>
            <DialogDescription>
              Create a booking and optionally record measurements for a customer
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={createForm.handleSubmit(handleCreateBooking)}
            className="space-y-5"
          >
            {/* Customer Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="create-name"
                  className="flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  Full Name *
                </Label>
                <Input
                  id="create-name"
                  placeholder="Customer full name"
                  {...createForm.register("name")}
                  className={cn(
                    createForm.formState.errors.name && "border-red-500",
                  )}
                />
                {createForm.formState.errors.name && (
                  <p className="text-sm text-red-500">
                    {createForm.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="create-email"
                  className="flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Email Address
                </Label>
                <Input
                  id="create-email"
                  type="email"
                  placeholder="Customer email"
                  {...createForm.register("email")}
                  className={cn(
                    createForm.formState.errors.email && "border-red-500",
                  )}
                />
                {createForm.formState.errors.email && (
                  <p className="text-sm text-red-500">
                    {createForm.formState.errors.email.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="create-phone"
                  className="flex items-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  Phone Number
                </Label>
                <Input
                  id="create-phone"
                  placeholder="Customer phone number"
                  {...createForm.register("phone_number")}
                  className={cn(
                    createForm.formState.errors.phone_number &&
                      "border-red-500",
                  )}
                />
                {createForm.formState.errors.phone_number && (
                  <p className="text-sm text-red-500">
                    {createForm.formState.errors.phone_number.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="create-location"
                  className="flex items-center gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  Address / Location
                </Label>
                <Input
                  id="create-location"
                  placeholder="Customer address"
                  {...createForm.register("location")}
                  className={cn(
                    createForm.formState.errors.location && "border-red-500",
                  )}
                />
                {createForm.formState.errors.location && (
                  <p className="text-sm text-red-500">
                    {createForm.formState.errors.location.message}
                  </p>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Full name is required. Add either an email address or phone
              number. Location is optional.
            </p>

            {/* Measurement Type */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Measurement Type</Label>
              <RadioGroup
                defaultValue="in_store"
                onValueChange={(value) =>
                  createForm.setValue(
                    "measurement_type",
                    value as "in_store" | "home_visit" | "self",
                  )
                }
                className="grid grid-cols-3 gap-4"
              >
                <Label
                  htmlFor="create-in_store"
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
                >
                  <RadioGroupItem
                    value="in_store"
                    id="create-in_store"
                    className="sr-only"
                  />
                  <div className="text-2xl mb-1">🏪</div>
                  <div className="font-medium text-sm">In-Store</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Visit shop
                  </div>
                </Label>
                <Label
                  htmlFor="create-home_visit"
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
                >
                  <RadioGroupItem
                    value="home_visit"
                    id="create-home_visit"
                    className="sr-only"
                  />
                  <div className="text-2xl mb-1">🏠</div>
                  <div className="font-medium text-sm">Home Visit</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    At doorstep
                  </div>
                </Label>
                <Label
                  htmlFor="create-self"
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
                >
                  <RadioGroupItem
                    value="self"
                    id="create-self"
                    className="sr-only"
                  />
                  <div className="text-2xl mb-1">📏</div>
                  <div className="font-medium text-sm">Self</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Customer provided
                  </div>
                </Label>
              </RadioGroup>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  Preferred Date *
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !createForm.watch("preferred_date") &&
                          "text-muted-foreground",
                        createForm.formState.errors.preferred_date &&
                          "border-red-500",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {createForm.watch("preferred_date")
                        ? format(createForm.watch("preferred_date"), "PPP")
                        : "Select a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={createForm.watch("preferred_date")}
                      onSelect={(date) =>
                        date && createForm.setValue("preferred_date", date)
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {createForm.formState.errors.preferred_date && (
                  <p className="text-sm text-red-500">
                    {createForm.formState.errors.preferred_date.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Preferred Time *
                </Label>
                <select
                  {...createForm.register("preferred_time")}
                  className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    createForm.formState.errors.preferred_time &&
                      "border-red-500",
                  )}
                >
                  <option value="">Select a time</option>
                  {timeSlots.map((time) => (
                    <option key={time.value} value={time.value}>
                      {time.label}
                    </option>
                  ))}
                </select>
                {createForm.formState.errors.preferred_time && (
                  <p className="text-sm text-red-500">
                    {createForm.formState.errors.preferred_time.message}
                  </p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="create-notes">Additional Notes (Optional)</Label>
              <Textarea
                id="create-notes"
                placeholder="Any special requests or notes about this booking..."
                {...createForm.register("customer_notes")}
                rows={2}
              />
            </div>

            <Separator />

            {/* Optional: Record Measurements Now */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Record Measurements (Optional)
              </h3>
              <p className="text-xs text-muted-foreground">
                You can also record measurements later from the booking detail
                view.
              </p>
              <Tabs defaultValue="coat" className="w-full">
                <TabsList className="grid grid-cols-3 h-8">
                  <TabsTrigger value="coat" className="text-xs">
                    Coat & Safari
                  </TabsTrigger>
                  <TabsTrigger value="pant" className="text-xs">
                    Pant
                  </TabsTrigger>
                  <TabsTrigger value="shirt" className="text-xs">
                    Shirt
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="coat" className="mt-2">
                  <MeasurementGrid
                    fields={coatFields}
                    measurements={createForm.watch("coat_measurements") || {}}
                    onChange={(f, c, v) =>
                      handleCreateMeasurementChange("coat", f, c, v)
                    }
                    title="COAT & SAFARI, W. COAT"
                    fieldMeta={coatFieldMeta}
                  />
                </TabsContent>
                <TabsContent value="pant" className="mt-2">
                  <MeasurementGrid
                    fields={pantFields}
                    measurements={createForm.watch("pant_measurements") || {}}
                    onChange={(f, c, v) =>
                      handleCreateMeasurementChange("pant", f, c, v)
                    }
                    title="PANT"
                    fieldMeta={pantFieldMeta}
                  />
                </TabsContent>
                <TabsContent value="shirt" className="mt-2">
                  <MeasurementGrid
                    fields={shirtFields}
                    measurements={createForm.watch("shirt_measurements") || {}}
                    onChange={(f, c, v) =>
                      handleCreateMeasurementChange("shirt", f, c, v)
                    }
                    title="SHIRT"
                    fieldMeta={shirtFieldMeta}
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* Actions */}
            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreateDialogOpen(false);
                  createForm.reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    Creating...
                  </span>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Booking
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteBookingId}
        onOpenChange={() => setDeleteBookingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              booking and all associated measurement data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
