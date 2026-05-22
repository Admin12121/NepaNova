"use client";

import React, { useCallback } from "react";
import { useAuthUser } from "@/hooks/use-auth-user";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown } from "lucide-react";
import {
  useCategoryViewQuery,
  useAddCategoryMutation,
  useUpgradeCategoryMutation,
  useDeleteCategoryMutation,
} from "@/lib/store/Service/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import DeleteModel from "@/components/global/delete-model";

const CategorySchema = z.object({
  name: z.string().min(2, { message: "Category name is required" }),
});

const UpdateSchema = z.object({
  id: z.string(),
  name: z.string().min(2, { message: "Category name is required" }),
});

type CategorySchemaFormValues = z.infer<typeof CategorySchema>;
type UpdateSchemaFormValues = z.infer<typeof UpdateSchema>;

const defaultFormValues: CategorySchemaFormValues = {
  name: "",
};

interface Category {
  id: number;
  name: string;
  categoryslug: string;
}

const CategoryComponent = () => {
  const { accessToken } = useAuthUser();
  const { data, refetch } = useCategoryViewQuery({});
  const [addcategory] = useAddCategoryMutation();
  const [updateCategory] = useUpgradeCategoryMutation();
  const [deleteCategory] = useDeleteCategoryMutation();

  const form = useForm<CategorySchemaFormValues>({
    resolver: zodResolver(CategorySchema),
    mode: "onChange",
    defaultValues: defaultFormValues,
  });

  const updateform = useForm<UpdateSchemaFormValues>({
    resolver: zodResolver(UpdateSchema),
    mode: "onChange",
    defaultValues: {
      id: "",
      name: "",
    },
  });

  const { reset } = form;

  const onSubmit = useCallback(async (data: CategorySchemaFormValues) => {
    const { error, data: res } = await addcategory({
      formData: data,
      token: accessToken,
    });
    if (error && "data" in error) {
      const errorData = error?.data || {};
      const errorMessages = Object.values(errorData).flat().join(", ");
      const formattedMessage = errorMessages || "An unknown error occurred";
      toast.error(`${formattedMessage}`);
      return;
    }
    if (res) {
      toast.success("Category Added");
      refetch();
      reset();
    }
  }, [addcategory, accessToken, refetch, reset]);

  const handleCategoryUpdate = useCallback(
    async (data: UpdateSchemaFormValues) => {
      const { error, data: res } = await updateCategory({
        formData: data,
        id: data.id,
        token: accessToken,
      });
      if (error && "data" in error) {
        const errorData = error?.data || {};
        const errorMessages = Object.values(errorData).flat().join(", ");
        const formattedMessage = errorMessages || "An unknown error occurred";
        toast.error(`${formattedMessage}`);
        return;
      }
      if (res) {
        toast.success("Category Updated");
        refetch();
      }
    },
    [updateCategory, accessToken, refetch]
  );

  const handleCategoryDelete = useCallback(async (id: string) => {
    const { error, data: res } = await deleteCategory({
      id: id,
      token: accessToken,
    });
    if (error && "data" in error) {
      const errorData = error?.data || {};
      const errorMessages = Object.values(errorData).flat().join(", ");
      const formattedMessage = errorMessages || "An unknown error occurred";
      toast.error(`${formattedMessage}`);
      return;
    }
    toast.success("Category Deleted");
    refetch();
  }, [deleteCategory, accessToken, refetch]);

  return (
    <main className="w-full h-full pb-10 min-h-[calc(100dvh_-_145px)] flex px-2 flex-col gap-2">
      <Accordion type="single" collapsible className="space-y-1 w-full">
        <AccordionItem
          value="add-category"
          className="rounded-lg shadow-none bg-neutral-100 dark:bg-neutral-950 px-2 transition-all"
        >
          <AccordionTrigger
            icon={<ChevronDown className="w-4 h-4" />}
            className="relative text-left hover:no-underline pl-2 py-3 w-full md:min-w-[450px]"
          >
            <span>Add Category</span>
          </AccordionTrigger>
          <AccordionContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4 w-full px-3"
              >
                <Separator className="my-4" />
                <span className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category Name</FormLabel>
                        <FormControl>
                          <Input
                            className="dark:bg-neutral-900 bg-white"
                            placeholder="Enter Category Name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </span>
                <Button>Add Category</Button>
              </form>
            </Form>
          </AccordionContent>
        </AccordionItem>

        {data &&
          data.map((category: Category) => (
            <AccordionItem
              key={category.id}
              value={category.categoryslug}
              className="rounded-lg shadow-none bg-neutral-100 dark:bg-neutral-950 px-2 transition-all"
            >
              <AccordionTrigger
                icon={<ChevronDown className="w-4 h-4" />}
                className="relative text-left hover:no-underline pl-2 py-3 w-full md:min-w-[450px]"
              >
                {category.name}
              </AccordionTrigger>
              <AccordionContent className="px-3">
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          updateform.setValue("name", category.name);
                          updateform.setValue("id", category.id.toString());
                        }}
                      >
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Edit Category</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4">
                        <Form {...updateform}>
                          <form
                            onSubmit={updateform.handleSubmit(
                              handleCategoryUpdate
                            )}
                            className="flex flex-col gap-4"
                          >
                            <FormField
                              control={updateform.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <Label>Category Name</Label>
                                  <FormControl>
                                    <Input
                                      className="w-full bg-white dark:bg-neutral-900"
                                      placeholder="Enter Category Name"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <DialogFooter className="gap-2 md:gap-0">
                              <Button type="submit">Save Changes</Button>
                              <DialogClose asChild>
                                <Button type="button" variant="secondary">
                                  Cancel
                                </Button>
                              </DialogClose>
                            </DialogFooter>
                          </form>
                        </Form>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <DeleteModel
                    PROJECT_NAME={category.name}
                    handleDelete={() => {
                      handleCategoryDelete(category.id.toString());
                    }}
                    title="Category"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
      </Accordion>
    </main>
  );
};

export default CategoryComponent;
