import { useForm, useFieldArray, FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { ProductFormValues, productFormSchema } from "@/schemas/product";

export const useProductForm = () => {
  const [isMultiVariant, setIsMultiVariant] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      discount: 0,
      variants: [{ discount: 0, size: "", color_code: "", color_name: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "variants",
  });

  useEffect(() => {
    form.setValue("isMultiVariant", isMultiVariant);
    if (isMultiVariant) {
      form.setValue("basePrice", null);
      form.setValue("stock", null);
      form.setValue("discount", null);
    } else {
      form.setValue("variants", []);
    }
  }, [isMultiVariant, form]);

  // React 19 compiler handles memoization automatically
  const toggleVariantType = (isMulti: boolean) => {
    setIsMultiVariant(isMulti);
    if (isMulti) {
      if (fields.length === 0) {
        append({ size: "", color_code: "", color_name: "", price: 0, stock: 0, discount: 1 });
      }
    } else {
      remove(Array.from({ length: fields.length }, (_, i) => i));
    }
  };

  const handleBlur = (name: FieldPath<ProductFormValues>) => {
    form.trigger(name);
  };

  return {
    form,
    fields,
    append,
    remove,
    isMultiVariant,
    setIsMultiVariant,
    toggleVariantType,
    handleBlur,
  };
};
