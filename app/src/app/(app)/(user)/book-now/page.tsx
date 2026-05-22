"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { handleClick as fireConfetti } from "@/app/(app)/(user)/checkout/[transitionuid]/_components/animation";
import {
  CalendarIcon,
  Clock,
  MapPin,
  Phone,
  User,
  CheckCircle2,
  Mail,
} from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useCreateBookingMutation } from "@/lib/store/Service/api";
import {
  bookingFormSchema,
  coatFields,
  coatFieldMeta,
  pantFieldMeta,
  pantFields,
  shirtFieldMeta,
  shirtFields,
  type BookingFormData,
  type MeasurementFieldMeta,
} from "@/lib/booking-form";

function SelfMeasurementGrid({
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
          <div key={field} className="grid grid-cols-3 border-b last:border-b-0">
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
                  <>
                    {meta?.label || field}
                  </>
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

export default function BookNowPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [createBooking, { isLoading }] = useCreateBookingMutation();

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
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

  const watchMeasurementType = form.watch("measurement_type");

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

  const onSubmit = async (data: BookingFormData) => {
    try {
      const formattedData: any = {
        name: data.name,
        measurement_type: data.measurement_type,
        preferred_date: format(data.preferred_date, "yyyy-MM-dd"),
        preferred_time: data.preferred_time,
        customer_notes: data.customer_notes || "",
      };

      if (data.email) {
        formattedData.email = data.email;
      }
      if (data.phone_number) {
        formattedData.phone_number = data.phone_number;
      }
      if (data.location) {
        formattedData.location = data.location;
      }

      // Include measurements if self-measurement type
      if (data.measurement_type === "self") {
        const hasCoat =
          data.coat_measurements &&
          Object.keys(data.coat_measurements).length > 0;
        const hasPant =
          data.pant_measurements &&
          Object.keys(data.pant_measurements).length > 0;
        const hasShirt =
          data.shirt_measurements &&
          Object.keys(data.shirt_measurements).length > 0;

        if (hasCoat) formattedData.coat_measurements = data.coat_measurements;
        if (hasPant) formattedData.pant_measurements = data.pant_measurements;
        if (hasShirt)
          formattedData.shirt_measurements = data.shirt_measurements;
      }

      await createBooking({ data: formattedData }).unwrap();
      setIsSubmitted(true);
      fireConfetti();
      toast.success("Booking submitted successfully!");
    } catch (error) {
      console.error("Booking error:", error);
      toast.error("Failed to submit booking. Please try again.");
    }
  };

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

  if (isSubmitted) {
    return (
      <main className="pt-3 w-full px-5 lg:px-14 flex gap-3 flex-col pb-10 max-w-[95rem] items-center h-full min-h-[calc(100dvh_-_11dvh)]">
        <div className="h-full flex flex-col gap-8 items-center justify-center w-full mt-20">
          <Card className="max-w-md w-full text-center border shadow-sm">
            <CardContent className="pt-10 pb-10">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
              <p className="text-neutral-600 dark:text-neutral-300 mb-6">
                Thank you for booking with us. A confirmation email has been
                sent to your inbox. We will contact you shortly to confirm your
                appointment.
              </p>
              <Button onClick={() => setIsSubmitted(false)} variant="outline">
                Book Another Appointment
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-3 w-full px-5 lg:px-14 flex gap-3 flex-col pb-10 max-w-[95rem] items-center h-full min-h-[calc(100dvh_-_11dvh)]">
      {/* Header Section */}
      <div className="h-full flex flex-col gap-8 items-center w-full mt-10">
        <div className="text-center">
          <h1 className="text-[50px] font-semibold mb-4">
            Book Your Measurement
          </h1>
          <p className="text-neutral-600 dark:text-neutral-300 text-lg max-w-2xl">
            Experience premium tailoring with our expert measurement service.
            Choose between in-store visits, home appointments, or provide your
            own measurements.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full mt-8 items-start">
          <Card className="bg-white flex flex-col justify-between dark:bg-neutral-900/50 rounded-xl border shadow-sm overflow-hidden">
            <div className="relative w-full aspect-video bg-gradient-to-br from-amber-900 via-amber-800 to-indigo-900">
              <div className="absolute inset-0 w-full h-full">
                <iframe
                  className="absolute inset-0 w-full h-full rounded-tl-sm rounded-tr-sm"
                  src="https://www.youtube.com/embed/l3Viglg673M?autoplay=1&mute=0&loop=1&controls=1&rel=0&modestbranding=1"
                  title="Promotional video"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                  frameBorder="0"
                />
              </div>
            </div>
            <CardContent className="p-6">
              <h3 className="font-medium text-lg mb-2">Why Choose Us?</h3>
              <ul className="space-y-2 text-neutral-600 dark:text-neutral-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Expert tailors with years of experience
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Precise measurements for perfect fit
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Home visit option available
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Self-measurement option for convenience
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Flexible scheduling
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-neutral-900/50 p-3 rounded-xl border shadow-sm w-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">
                Schedule Your Appointment
              </CardTitle>
              <CardDescription>
                Fill in your details below and we&apos;ll confirm your booking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5"
              >
                {/* Personal Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Full Name *
                    </Label>
                    <Input
                      id="name"
                      placeholder="Enter your full name"
                      {...form.register("name")}
                      className={cn(
                        form.formState.errors.name && "border-red-500",
                      )}
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      {...form.register("email")}
                      className={cn(
                        form.formState.errors.email && "border-red-500",
                      )}
                    />
                    {form.formState.errors.email && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="phone_number"
                      className="flex items-center gap-2"
                    >
                      <Phone className="w-4 h-4" />
                      Phone Number
                    </Label>
                    <Input
                      id="phone_number"
                      placeholder="Enter your phone number"
                      {...form.register("phone_number")}
                      className={cn(
                        form.formState.errors.phone_number && "border-red-500",
                      )}
                    />
                    {form.formState.errors.phone_number && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.phone_number.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="location"
                      className="flex items-center gap-2"
                    >
                      <MapPin className="w-4 h-4" />
                      Address / Location
                    </Label>
                    <Input
                      id="location"
                      placeholder="Enter your address"
                      {...form.register("location")}
                      className={cn(
                        form.formState.errors.location && "border-red-500",
                      )}
                    />
                    {form.formState.errors.location && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.location.message}
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
                  <Label className="text-base font-medium">
                    Measurement Type
                  </Label>
                  <RadioGroup
                    defaultValue="in_store"
                    onValueChange={(value) =>
                      form.setValue(
                        "measurement_type",
                        value as "in_store" | "home_visit" | "self",
                      )
                    }
                    className="grid grid-cols-3 gap-4"
                  >
                    <Label
                      htmlFor="in_store"
                      className="flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-amber-500 [&:has([data-state=checked])]:bg-amber-50 dark:[&:has([data-state=checked])]:bg-amber-900/20"
                    >
                      <RadioGroupItem
                        value="in_store"
                        id="in_store"
                        className="sr-only"
                      />
                      <div className="text-2xl mb-1">🏪</div>
                      <div className="font-medium text-sm">In-Store</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Visit our shop
                      </div>
                    </Label>
                    <Label
                      htmlFor="home_visit"
                      className="flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-amber-500 [&:has([data-state=checked])]:bg-amber-50 dark:[&:has([data-state=checked])]:bg-amber-900/20"
                    >
                      <RadioGroupItem
                        value="home_visit"
                        id="home_visit"
                        className="sr-only"
                      />
                      <div className="text-2xl mb-1">🏠</div>
                      <div className="font-medium text-sm">Home Visit</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        At your doorstep
                      </div>
                    </Label>
                    <Label
                      htmlFor="self"
                      className="flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-amber-500 [&:has([data-state=checked])]:bg-amber-50 dark:[&:has([data-state=checked])]:bg-amber-900/20"
                    >
                      <RadioGroupItem
                        value="self"
                        id="self"
                        className="sr-only"
                      />
                      <div className="text-2xl mb-1">📏</div>
                      <div className="font-medium text-sm">Self</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Measure yourself
                      </div>
                    </Label>
                  </RadioGroup>
                </div>

                {/* Self Measurement Section */}
                {watchMeasurementType === "self" && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        📐 Enter Your Measurements
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Fill in the measurements you have. Use inches. Columns A
                        and B are for two different sets of measurements if
                        needed.
                      </p>
                    </div>

                    <Tabs defaultValue="coat" className="w-full">
                      <TabsList className="grid grid-cols-3 h-9">
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
                        <SelfMeasurementGrid
                          fields={coatFields}
                          measurements={form.watch("coat_measurements") || {}}
                          onChange={(f, c, v) =>
                            handleMeasurementChange("coat", f, c, v)
                          }
                          title="COAT & SAFARI, W. COAT"
                          fieldMeta={coatFieldMeta}
                        />
                      </TabsContent>
                      <TabsContent value="pant" className="mt-2">
                        <SelfMeasurementGrid
                          fields={pantFields}
                          measurements={form.watch("pant_measurements") || {}}
                          onChange={(f, c, v) =>
                            handleMeasurementChange("pant", f, c, v)
                          }
                          title="PANT"
                          fieldMeta={pantFieldMeta}
                        />
                      </TabsContent>
                      <TabsContent value="shirt" className="mt-2">
                        <SelfMeasurementGrid
                          fields={shirtFields}
                          measurements={form.watch("shirt_measurements") || {}}
                          onChange={(f, c, v) =>
                            handleMeasurementChange("shirt", f, c, v)
                          }
                          title="SHIRT"
                          fieldMeta={shirtFieldMeta}
                        />
                      </TabsContent>
                    </Tabs>
                  </div>
                )}

                {/* Date and Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      Preferred Date
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !form.watch("preferred_date") &&
                              "text-muted-foreground",
                            form.formState.errors.preferred_date &&
                              "border-red-500",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.watch("preferred_date")
                            ? format(form.watch("preferred_date"), "PPP")
                            : "Select a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={form.watch("preferred_date")}
                          onSelect={(date) =>
                            date && form.setValue("preferred_date", date)
                          }
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {form.formState.errors.preferred_date && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.preferred_date.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Preferred Time
                    </Label>
                    <select
                      {...form.register("preferred_time")}
                      className={cn(
                        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        form.formState.errors.preferred_time &&
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
                    {form.formState.errors.preferred_time && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.preferred_time.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="customer_notes">
                    Additional Notes (Optional)
                  </Label>
                  <Textarea
                    id="customer_notes"
                    placeholder="Any special requests or requirements..."
                    {...form.register("customer_notes")}
                    rows={2}
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full h-11"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⏳</span>
                      Submitting...
                    </span>
                  ) : (
                    "Book Appointment"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
