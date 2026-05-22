import * as z from "zod";

export const productFormSchema = z
  .object({
    productName: z
      .string({
        required_error: "Product name is required",
      })
      .nonempty("Product name cannot be empty"),
    description: z
      .string({
        required_error: "Description is required",
      })
      .nonempty("Description cannot be empty"),
    isMultiVariant: z.boolean({
      required_error: "Product Type is required",
    }),
    category: z.number({
      required_error: "Category is required",
    }),
    basePrice: z.number().optional().nullable(),
    stock: z.number().optional().nullable(),
    discount: z.number().optional().nullable(),
    variants: z.array(
      z.object({
        size: z
          .string()
          .optional()
          .nullable(),
        color_code: z
          .string()
          .optional()
          .nullable(),
        color_name: z
          .string()
          .optional()
          .nullable(),
        price: z
          .number({
            required_error: "Price is required",
          })
          .positive("Price must be a positive number"),
        stock: z
          .number({
            required_error: "Stock is required",
          })
          .int()
          .positive("Stock must be a positive integer"),
        discount: z
          .number()
          .min(1, "Discount must be greater than 0")
          .max(100, "Discount must be at most 100")
          .optional()
          .nullable(),
      }).refine((data) => data.size || data.color_code, {
        message: "Either size or color must be provided for each variant",
        path: ["size"],
      })
    ),
  })
  .superRefine((data, ctx) => {
    if (data.isMultiVariant) {
      if (!data.variants || data.variants.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["variants"],
          message: "Variants are required when the product is multi-variant",
        });
      }
    } else {
      if (data.basePrice === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["basePrice"],
          message:
            "Base price is required when the product is not multi-variant",
        });
      }
      if (data.stock === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["stock"],
          message: "Stock is required when the product is not multi-variant",
        });
      }
    }
  });

export type ProductFormValues = z.infer<typeof productFormSchema>;
