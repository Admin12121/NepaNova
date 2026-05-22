import { toast } from "sonner";
import { ProductFormValues } from "@/schemas/product";
import { useProductsRegistrationMutation } from "@/lib/store/Service/api";
import { getErrorMessage } from "@/lib/error-handler";

interface Variant {
  size?: string | null;
  color_code?: string | null;
  color_name?: string | null;
  price: number;
  stock: number;
  discount?: number | null;
}

interface CleanedProductData extends Omit<ProductFormValues, "variants"> {
  variants?: Variant[];
}

export const useProductSubmit = (accessToken: string) => {
  const [addProduct] = useProductsRegistrationMutation();

  // React 19 compiler handles memoization automatically
  const onSubmit = async (
    data: ProductFormValues,
    productImages: File[],
    images: string[],
    resetForm: () => void,
    clearImages: () => void,
    imageColors: Record<number, string> = {},
  ) => {
    const cleanedData: CleanedProductData = { ...data };

    if (data.isMultiVariant) {
      delete cleanedData.basePrice;
      delete cleanedData.stock;
      delete cleanedData.discount;
    } else {
      delete cleanedData.variants;
    }

    if (images.length < 2) {
      toast.error("At least 2 images are required");
      return;
    }

    const toastId = toast.loading("Preparing data...", {
      position: "top-center",
    });

    const formData = new FormData();
    formData.append("product_name", cleanedData.productName);
    formData.append("description", cleanedData.description);
    formData.append("is_multi_variant", cleanedData.isMultiVariant.toString());
    formData.append("category", cleanedData.category.toString());

    if (!cleanedData.isMultiVariant) {
      formData.append("price", cleanedData.basePrice!.toString());
      formData.append("size", "0");
      formData.append("stock", cleanedData.stock!.toString());
      formData.append("discount", cleanedData.discount!.toString());
    } else {
      cleanedData.variants?.forEach((variant: Variant, index: number) => {
        if (variant.size) {
          formData.append(`variants[${index}][size]`, variant.size);
        }
        if (variant.color_code) {
          formData.append(`variants[${index}][color_code]`, variant.color_code);
        }
        if (variant.color_name) {
          formData.append(`variants[${index}][color_name]`, variant.color_name);
        }
        formData.append(`variants[${index}][price]`, variant.price.toString());
        formData.append(`variants[${index}][stock]`, variant.stock.toString());
        if (variant.discount !== undefined && variant.discount !== null) {
          formData.append(
            `variants[${index}][discount]`,
            variant.discount.toString(),
          );
        }
      });
    }

    try {
      // Add images to form data (with optional color tags)
      productImages.forEach((image, index) => {
        formData.append(`images[${index}]`, image);
        if (imageColors[index]) {
          formData.append(`imageColor[${index}]`, imageColors[index]);
        }
      });

      toast.loading("Uploading Product Details...", {
        id: toastId,
        position: "top-center",
      });

      const res = await addProduct({ formData, token: accessToken });

      if (res.data) {
        resetForm();
        clearImages();
        toast.success("Product saved successfully!", {
          id: toastId,
          position: "top-center",
        });
      } else if (res.error) {
        const errorMsg = getErrorMessage(res.error);
        toast.error(errorMsg || "Failed to save product", {
          id: toastId,
          position: "top-center",
        });
      }
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      toast.error(errorMsg || "Error saving product", {
        id: toastId,
        position: "top-center",
      });
    }
  };

  return { onSubmit };
};
