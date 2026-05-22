import { z } from "zod";

export const coatFields = ["L", "C", "W", "H", "S", "B", "SL", "N"];
export const pantFields = ["L", "W", "H", "T", "HIL", "K", "B"];
export const shirtFields = ["L", "C", "W", "H", "S", "SL", "N"];

export type MeasurementFieldMeta = {
  label: string;
  helper: string;
};

export const coatFieldMeta: Record<string, MeasurementFieldMeta> = {
  L: {
    label: "Length",
    helper: "Coat length - from shoulder (near neck) down to desired coat length.",
  },
  C: {
    label: "Chest",
    helper:
      "Full chest circumference (measured around the widest part of the chest).",
  },
  W: {
    label: "Waist",
    helper: "Waist circumference (around natural waist line).",
  },
  H: {
    label: "Hip",
    helper: "Hip circumference (around the widest hip area).",
  },
  S: {
    label: "Shoulder",
    helper: "Shoulder width - measured from one shoulder edge to the other.",
  },
  B: {
    label: "Bicep",
    helper: "Around the upper arm (bicep circumference).",
  },
  SL: {
    label: "Sleeve Length",
    helper: "From shoulder point down to wrist.",
  },
  N: {
    label: "Neck",
    helper: "Neck circumference (around collar area).",
  },
};

export const pantFieldMeta: Record<string, MeasurementFieldMeta> = {
  L: {
    label: "Length",
    helper: "Pant length from waist to desired hem.",
  },
  W: {
    label: "Waist",
    helper: "Waist circumference at pant waist line.",
  },
  H: {
    label: "Hip",
    helper: "Hip circumference around the fullest part.",
  },
  T: {
    label: "Thigh",
    helper: "Thigh circumference at the upper thigh.",
  },
  HIL: {
    label: "Hip Length",
    helper: "Vertical length from waist line to hip line.",
  },
  K: {
    label: "Knee",
    helper: "Knee circumference around knee level.",
  },
  B: {
    label: "Bottom",
    helper: "Bottom opening circumference at hem.",
  },
};

export const shirtFieldMeta: Record<string, MeasurementFieldMeta> = {
  L: {
    label: "Length",
    helper:
      "Shirt length from shoulder (near neck) down to desired shirt length.",
  },
  C: {
    label: "Chest",
    helper:
      "Full chest circumference (measured around the widest part of the chest).",
  },
  W: {
    label: "Waist",
    helper: "Waist circumference (around natural waist line).",
  },
  H: {
    label: "Hip",
    helper: "Hip circumference (around the widest hip area).",
  },
  S: {
    label: "Shoulder",
    helper: "Shoulder width - measured from one shoulder edge to the other.",
  },
  SL: {
    label: "Sleeve Length",
    helper: "From shoulder point down to wrist.",
  },
  N: {
    label: "Neck",
    helper: "Neck circumference (around collar area).",
  },
};

const optionalEmailSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || z.string().email().safeParse(value).success,
    {
      message: "Please enter a valid email address",
    },
  );

const optionalPhoneSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || value.replace(/\D/g, "").length >= 10,
    {
      message: "Please enter a valid phone number",
    },
  );

export const bookingFormSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters"),
    email: optionalEmailSchema,
    phone_number: optionalPhoneSchema,
    location: z.string().trim(),
    measurement_type: z.enum(["in_store", "home_visit", "self"]),
    preferred_date: z.date({ required_error: "Please select a date" }),
    preferred_time: z.string().min(1, "Please select a time"),
    customer_notes: z.string().optional(),
    coat_measurements: z.record(z.record(z.string())).optional(),
    pant_measurements: z.record(z.record(z.string())).optional(),
    shirt_measurements: z.record(z.record(z.string())).optional(),
  })
  .superRefine(({ email, phone_number }, ctx) => {
    if (email || phone_number) {
      return;
    }

    const message = "Provide at least an email address or phone number";

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message,
      path: ["email"],
    });
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message,
      path: ["phone_number"],
    });
  });

export type BookingFormData = z.infer<typeof bookingFormSchema>;
