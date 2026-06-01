// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Trash2,
  Plus,
  Save,
  ImageIcon,
  AlertCircle,
  Settings,
  Layers,
  ImageIcon as ImageIcon2,
  MessageSquare,
  Filter,
  Edit,
} from "lucide-react";
import Image from "next/image";
import { useAuthUser } from "@/hooks/use-auth-user";
import {
  useCreateorUpdatelayoutMutation,
  useGetlayoutQuery,
  useProductsViewQuery,
} from "@/lib/store/Service/api";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HexColorPicker } from "react-colorful"
import LogoAnimation from "@/components/global/logo_animation";
import { DEFAULT_STORE_SETTINGS, getStoreSettings } from "@/lib/store-settings";
import { ProductCard as AdminProductCard } from "@/components/global/admin-productcard";
import MultipleSelector, { type Option } from "@/components/ui/multiselect";


const componentSchema = z.object({
  visible: z.boolean(),
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().min(1, "Subtitle is required"),
  image: z.string().optional(),
  href: z.string().optional(),
  ctaLabel: z.string().optional(),
  items: z.array(z.object({ productId: z.coerce.number().int().positive() })).optional(),
});

const sliderSchema = z
  .array(
    z.object({
      image: z.string().url("Please enter a valid image URL"),
      href: z.string(),
    })
  )
  .min(1, "At least one slider image is required")
  .max(6, "Maximum 6 slider images allowed");

const eventSchema = z
  .array(
    z.object({
      title: z.string().min(1, "Title is required"),
      description: z.string().min(1, "Description is required"),
      color: z.string().min(1, "Color is required"),
    })
  )
  .min(1, "At least one event is required")
  .max(2, "Maximum 2 events allowed");

const messageSchema = z.object({
  message: z.string(),
  date: z.string(),
});

const storeSettingsSchema = z.object({
  deliveryEstimateDays: z.coerce
    .number()
    .int("Delivery estimate must be a whole number")
    .min(0, "Delivery estimate cannot be negative")
    .max(365, "Delivery estimate is too high"),
  originCity: z.string().min(1, "Origin city is required"),
  originCountry: z.string().min(1, "Origin country is required"),
  paymentWindowHours: z.coerce
    .number()
    .int("Payment window must be a whole number")
    .min(1, "Payment window is required")
    .max(168, "Payment window cannot exceed 168 hours"),
});

const filterItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
});

const colorFilterSchema = filterItemSchema.extend({
  color: z.string().min(1, "Color code is required"),
});

const filtersSchema = z.object({
  categories: z.array(filterItemSchema),
  colors: z.array(colorFilterSchema),
});

const settingsSchema = z.object({
  components: z.object({
    trendingProducts: componentSchema,
    recentProducts: componentSchema,
    collection: componentSchema,
    featured: componentSchema,
    store: componentSchema,
  }),
  slider: sliderSchema,
  events: eventSchema,
  storeSettings: storeSettingsSchema,
  messages: messageSchema,
  filters: filtersSchema,
});

type SettingsFormValues = z.infer<typeof settingsSchema>;
type FilterItem = z.infer<typeof filterItemSchema>;
type ColorFilterItem = z.infer<typeof colorFilterSchema>;

const componentOrder = [
  "trendingProducts",
  "recentProducts",
  "collection",
  "featured",
  "store",
] as const;

const componentLabels: Record<(typeof componentOrder)[number], string> = {
  trendingProducts: "Trending Product",
  recentProducts: "Recent Products",
  collection: "Collection",
  featured: "Featured",
  store: "Store",
};

const componentDescriptions: Record<(typeof componentOrder)[number], string> = {
  trendingProducts: "Homepage product rail backed by trending products.",
  recentProducts: "Homepage product rail backed by latest products.",
  collection: "Full collection browser reused from the collections page.",
  featured: "Existing products selected manually by admin.",
  store: "Custom store/brand promotion block.",
};

const defaultComponents = {
  trendingProducts: {
    visible: true,
    title: "Trending Product",
    subtitle: "Popular picks from NepaNova Impact.",
  },
  recentProducts: {
    visible: true,
    title: "Recent Products",
    subtitle: "Freshly added Himalayan goods.",
  },
  collection: {
    visible: true,
    title: "Collection",
    subtitle: "Explore the complete NepaNova product range.",
  },
  featured: {
    visible: true,
    title: "Featured",
    subtitle: "Products selected manually for customers.",
    items: [],
  },
  store: {
    visible: true,
    title: "Store",
    subtitle: "Visit NepaNova Impact and discover our products.",
    image: "/store.webp",
    href: "/collections",
    ctaLabel: "Visit us",
  },
};

const normalizeFeaturedItems = (items: any[] = []) =>
  items
    .map((item) => {
      const productId = Number(item?.productId ?? item?.product_id ?? item?.id);
      return Number.isFinite(productId) && productId > 0 ? { productId } : null;
    })
    .filter(Boolean);

const normalizeComponent = (value: any, fallback: any) => ({
  ...fallback,
  ...(value || {}),
  visible:
    typeof value?.visible === "boolean"
      ? value.visible
      : typeof fallback.visible === "boolean"
        ? fallback.visible
        : true,
  title: value?.title || fallback.title,
  subtitle: value?.subtitle || fallback.subtitle,
  image: value?.image || fallback.image || "",
  href: value?.href || fallback.href || "",
  ctaLabel: value?.ctaLabel || fallback.ctaLabel || "",
  items:
    fallback.items !== undefined
      ? normalizeFeaturedItems(value?.items || fallback.items || [])
      : [],
});

const normalizeComponents = (components: any = {}) => ({
  trendingProducts: normalizeComponent(
    components.trendingProducts,
    defaultComponents.trendingProducts,
  ),
  recentProducts: normalizeComponent(
    components.recentProducts,
    defaultComponents.recentProducts,
  ),
  collection: normalizeComponent(
    components.collection || components.products,
    defaultComponents.collection,
  ),
  featured: normalizeComponent(
    components.featured || components.recommendedProducts,
    defaultComponents.featured,
  ),
  store: normalizeComponent(components.store, defaultComponents.store),
});

const getFeaturedProductLabel = (product: any) =>
  [product?.product_name, product?.categoryname ? `(${product.categoryname})` : ""]
    .filter(Boolean)
    .join(" ");

export default function SettingsDashboard() {
  const { accessToken: token } = useAuthUser();
  const { data: layoutData, isLoading: isLoadingLayout, refetch } = useGetlayoutQuery(
    { layoutslug: "home" },
    { skip: !token }
  );
  const { data: productsData, isLoading: isLoadingProducts } =
    useProductsViewQuery({ page_size: 100 });
  const [createOrUpdateLayout] = useCreateorUpdatelayoutMutation();

  const [activeTab, setActiveTab] = useState("components");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
	  const [editingFilter, setEditingFilter] = useState<{
	    type: "category" | "color";
	    item: FilterItem | ColorFilterItem | null;
	    isNew: boolean;
	  } | null>(null);
	  const activeSectionMeta =
	    {
	      components: { label: "Components", icon: Settings },
	      slider: { label: "Slider", icon: ImageIcon2 },
	      events: { label: "Events", icon: Layers },
	      filters: { label: "Filters", icon: Filter },
	      storeSettings: { label: "Store", icon: Settings },
	      messages: { label: "Messages", icon: MessageSquare },
	    }[activeTab] || { label: "Settings", icon: Settings };
	  const ActiveSectionIcon = activeSectionMeta.icon;

	  const form = useForm<SettingsFormValues>({
	    resolver: zodResolver(settingsSchema),
	    defaultValues: {
	      components: defaultComponents,
      slider: [{ image: "", href: "" }],
      events: [{ title: "", description: "", color: "#f87171" }],
      storeSettings: DEFAULT_STORE_SETTINGS,
      messages: { message: "", date: "" },
      filters: {
        categories: [],
        colors: [],
      },
    },
	    mode: "onChange",
	  });
	  const componentValues = form.watch("components");
  const productOptions = Array.isArray(productsData)
    ? productsData
    : productsData?.results || [];
  const currentFeaturedItems = componentValues?.featured?.items || [];
  const featuredSelectedIds = currentFeaturedItems
    .map((item: any) => Number(item.productId))
    .filter(Boolean);
  const featuredProductOptions: Option[] = productOptions.map((product: any) => ({
    label: getFeaturedProductLabel(product),
    value: String(product.id),
  }));

  useEffect(() => {
    if (layoutData?.config) {
      const apiData = layoutData.config;

      const transformedFilters = {
        categories: [] as FilterItem[],
        colors: [] as ColorFilterItem[],
      };

      if (apiData?.filters) {
        if (Array.isArray(apiData.filters.category)) {
          apiData.filters.category.forEach((cat: any, catIndex: number) => {
            const categoryId = (catIndex + 1).toString();
            transformedFilters.categories.push({
              id: categoryId,
              name: cat.name || `Category ${categoryId}`,
            });
          });
        }

        if (
          apiData.filters.materials?.color &&
          Array.isArray(apiData.filters.materials.color)
        ) {
          apiData.filters.materials.color.forEach((color: any, index: number) => {
            transformedFilters.colors.push({
              id: (index + 1).toString(),
              name: color.name || `Color ${index + 1}`,
              color: color.color || color.name || "#000000",
            });
          });
        }
      }

      const messages = apiData.messages || { message: "", date: "" };
      const storeSettings = getStoreSettings(apiData);

	      const transformedData = {
	        ...apiData,
	        components: normalizeComponents(apiData.components),
	        storeSettings,
	        messages,
	        filters: transformedFilters,
	      };

      form.reset(transformedData);
    }
  }, [layoutData, form]);

  const onSubmit = async (data: SettingsFormValues) => {
    setLoading(true);

	    const transformedData = {
	      ...data,
	      components: normalizeComponents(data.components),
	      filters: {
        category: [] as Array<{ name: string }>,
        materials: {
          color: [] as Array<{ name: string; color: string }>,
        },
      },
    };

    if (Array.isArray(data.filters.categories)) {
      data.filters.categories.forEach((category) => {
        transformedData.filters.category.push({
          name: category.name,
        });
      });
    }

    if (Array.isArray(data.filters.colors)) {
      transformedData.filters.materials.color = data.filters.colors.map(
        (color) => ({
          name: color.name,
          color: color.color,
        })
      );
    }

    try {
      const payload = new FormData();
      payload.append("config", JSON.stringify(transformedData));

      const res = await createOrUpdateLayout({
        layoutslug: "home",
        NewFormData: payload,
        token: token,
      });

      if (res.data) {
        toast.success("Settings updated successfully");
        refetch();
      } else {
        toast.error("Failed to update settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Error saving settings");
    } finally {
      setLoading(false);
    }
  };

  const addSliderItem = () => {
    if (form.getValues().slider.length >= 6) {
      toast.warning("Maximum limit reached");
      return;
    }

    const currentSlider = form.getValues().slider;
    form.setValue("slider", [...currentSlider, { image: "", href: "" }], {
      shouldValidate: true,
    });
  };

  const removeSliderItem = (index: number) => {
    const currentSlider = form.getValues().slider;
    if (currentSlider.length <= 1) {
      toast.error("Cannot remove");
      return;
    }

    const newSlider = [...currentSlider];
    newSlider.splice(index, 1);
    form.setValue("slider", newSlider, { shouldValidate: true });
  };

  const addEventItem = () => {
    if (form.getValues().events.length >= 2) {
      toast.warning("Maximum limit reached");
      return;
    }

    const currentEvents = form.getValues().events;
    form.setValue(
      "events",
      [...currentEvents, { title: "", description: "", color: "#4f46e5" }],
      {
        shouldValidate: true,
      }
    );
  };

	  const removeEventItem = (index: number) => {
	    const currentEvents = form.getValues().events;
	    if (currentEvents.length <= 1) {
	      toast.error("Cannot remove");
	      return;
    }

    const newEvents = [...currentEvents];
    newEvents.splice(index, 1);
	    form.setValue("events", newEvents, { shouldValidate: true });
	  };

	  const setFeaturedProducts = (options: Option[]) => {
	    form.setValue(
	      "components.featured.items",
	      options.map((option) => ({ productId: Number(option.value) })),
	      { shouldValidate: true, shouldDirty: true },
	    );
	  };

  const addFilterItem = (type: "category" | "color") => {
    const newItem: any = {
      id: Date.now().toString(),
      name: "",
    };

    if (type === "color") {
      newItem.color = "#000000";
    }

    setEditingFilter({
      type,
      item: newItem,
      isNew: true,
    });
  };

  const editFilterItem = (type: "category" | "color", item: any) => {
    setEditingFilter({
      type,
      item: { ...item },
      isNew: false,
    });
  };

  const saveFilterItem = () => {
    if (!editingFilter) return;

    const { type, item, isNew } = editingFilter;
    const currentFilters = { ...form.getValues().filters };
    const key = type === "color" ? "colors" : "categories";

    if (isNew) {
      currentFilters[key] = [...currentFilters[key], item];
    } else {
      const items = currentFilters[key];
      const index = items.findIndex((i: any) => i.id === item.id);
      if (index !== -1) {
        items[index] = item;
      }
    }

    form.setValue("filters", currentFilters, { shouldValidate: true });
    setEditingFilter(null);

    toast.success(isNew ? "Item added" : "Item updated");
  };

  const removeFilterItem = (type: "category" | "color", id: string) => {
    const currentFilters = { ...form.getValues().filters };
    const key = type === "color" ? "colors" : "categories";
    const items = currentFilters[key];

    const newItems = items.filter((item: any) => item.id !== id);
    currentFilters[key] = newItems;

    form.setValue("filters", currentFilters, { shouldValidate: true });

    toast.success("Item removed");
  };

	  return (
	    <div className="mx-auto flex h-full min-h-0 w-full max-w-[95rem] overflow-hidden text-foreground">
	      <aside className="hidden w-72 shrink-0 flex-col border-r bg-muted/30 dark:bg-neutral-900/30 md:flex">
	        <div className="flex h-14 shrink-0 items-center gap-2 border-b px-3 font-semibold">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
          >
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
	          Settings Dashboard
	        </div>
	        <nav data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto p-3">
	          <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">
	            Sections
	          </div>
	          <div className="grid gap-1">
	          <Button
	            variant={activeTab === "components" ? "default" : "ghost"}
	            className="justify-start"
	            onClick={() => setActiveTab("components")}
	          >
            <Settings className="mr-2 h-4 w-4" />
            Components
          </Button>
          <Button
            variant={activeTab === "slider" ? "default" : "ghost"}
            className="justify-start"
            onClick={() => setActiveTab("slider")}
          >
            <ImageIcon2 className="mr-2 h-4 w-4" />
            Slider
          </Button>
          <Button
            variant={activeTab === "events" ? "default" : "ghost"}
            className="justify-start"
            onClick={() => setActiveTab("events")}
          >
            <Layers className="mr-2 h-4 w-4" />
            Events
          </Button>
          <Button
            variant={activeTab === "filters" ? "default" : "ghost"}
            className="justify-start"
            onClick={() => setActiveTab("filters")}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button
            variant={activeTab === "storeSettings" ? "default" : "ghost"}
            className="justify-start"
            onClick={() => setActiveTab("storeSettings")}
          >
            <Settings className="mr-2 h-4 w-4" />
            Store
          </Button>
          <Button
            variant={activeTab === "messages" ? "default" : "ghost"}
            className="justify-start"
            onClick={() => setActiveTab("messages")}
          >
	            <MessageSquare className="mr-2 h-4 w-4" />
	            Messages
	          </Button>
	          </div>
	        </nav>
	      </aside>

	      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
	        <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
	          <div className="flex min-w-0 items-center gap-3">
	            <ActiveSectionIcon className="h-4 w-4 text-muted-foreground" />
	            <h1 className="truncate text-base font-semibold">
	              {activeSectionMeta.label}
	            </h1>
	          </div>
	          <Button
	            aria-label="Save settings"
	            variant="custom"
	            size="icon"
	            loading={loading}
	            disabled={loading}
	            onClick={form.handleSubmit(onSubmit)}
	          >
	            <Save className="h-4 w-4" />
	          </Button>
	        </div>
	        <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto p-4">
        {isLoadingLayout && !layoutData ? (
          <div className="flex h-[80vh] items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <LogoAnimation className="h-[85px]">
                NepaNova
              </LogoAnimation>
            </div>
          </div>
        ) : error ? (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to load settings. Please refresh the page or try again
              later.
            </AlertDescription>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </Alert>
        ) : layoutData ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {activeTab === "components" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight">
                      Components
                    </h2>
                    <p className="text-muted-foreground mt-1">
                      Manage the visibility and content of your homepage
                      components.
                    </p>
                  </div>
                  <Separator />

	                  <div className="grid gap-4">
	                    {componentOrder.map((key) => {
	                      const component = componentValues?.[key] || defaultComponents[key];
	                      return (
	                        <Card
	                          key={key}
	                          className="overflow-hidden border transition-all hover:border-primary/50"
	                        >
	                          <CardHeader className="bg-muted/50 p-3">
	                            <div className="flex items-center justify-between gap-4">
	                              <CardTitle className="flex min-w-0 items-center">
	                                <div className="mr-3 rounded-md bg-primary/10 p-2">
	                                  <Settings className="h-5 w-5 text-primary" />
	                                </div>
	                                <div className="min-w-0">
	                                  {componentLabels[key]}
	                                  <CardDescription className="text-xs">
	                                    {componentDescriptions[key]}
	                                  </CardDescription>
	                                </div>
	                              </CardTitle>
	                              <FormField
	                                control={form.control}
	                                name={`components.${key}.visible` as any}
	                                render={({ field }) => (
	                                  <FormItem className="flex items-center space-x-2 space-y-0">
	                                    <FormControl>
	                                      <Switch
	                                        checked={field.value}
	                                        onCheckedChange={field.onChange}
	                                      />
	                                    </FormControl>
	                                    <FormLabel className="text-sm font-normal">
	                                      {field.value ? "Visible" : "Hidden"}
	                                    </FormLabel>
	                                  </FormItem>
	                                )}
	                              />
	                            </div>
	                          </CardHeader>
	                          <CardContent className="grid gap-4 py-4">
	                            <div className="grid gap-4 md:grid-cols-2">
	                              <FormField
	                                control={form.control}
	                                name={`components.${key}.title` as any}
	                                render={({ field }) => (
	                                  <FormItem>
	                                    <FormLabel>Title</FormLabel>
	                                    <FormControl>
	                                      <Input {...field} className="!bg-muted" />
	                                    </FormControl>
	                                    <FormMessage />
	                                  </FormItem>
	                                )}
	                              />
	                              <FormField
	                                control={form.control}
	                                name={`components.${key}.subtitle` as any}
	                                render={({ field }) => (
	                                  <FormItem>
	                                    <FormLabel>Subtitle</FormLabel>
	                                    <FormControl>
	                                      <Input {...field} className="!bg-muted" />
	                                    </FormControl>
	                                    <FormMessage />
	                                  </FormItem>
	                                )}
	                              />
	                            </div>

	                            {key === "store" && (
	                              <div className="grid gap-4 md:grid-cols-3">
	                                <FormField
	                                  control={form.control}
	                                  name="components.store.image"
	                                  render={({ field }) => (
	                                    <FormItem>
	                                      <FormLabel>Image URL</FormLabel>
	                                      <FormControl>
	                                        <Input {...field} className="!bg-muted" />
	                                      </FormControl>
	                                      <FormMessage />
	                                    </FormItem>
	                                  )}
	                                />
	                                <FormField
	                                  control={form.control}
	                                  name="components.store.href"
	                                  render={({ field }) => (
	                                    <FormItem>
	                                      <FormLabel>Button Link</FormLabel>
	                                      <FormControl>
	                                        <Input {...field} className="!bg-muted" />
	                                      </FormControl>
	                                      <FormMessage />
	                                    </FormItem>
	                                  )}
	                                />
	                                <FormField
	                                  control={form.control}
	                                  name="components.store.ctaLabel"
	                                  render={({ field }) => (
	                                    <FormItem>
	                                      <FormLabel>Button Text</FormLabel>
	                                      <FormControl>
	                                        <Input {...field} className="!bg-muted" />
	                                      </FormControl>
	                                      <FormMessage />
	                                    </FormItem>
	                                  )}
	                                />
	                              </div>
	                            )}

		                            {key === "featured" &&
		                              (() => {
		                                const selectedFeaturedOptions = (
		                                  component.items || []
		                                )
		                                  .map((item: any) => {
		                                    const product = productOptions.find(
		                                      (productItem: any) =>
		                                        Number(productItem.id) ===
		                                        Number(item.productId),
		                                    );

		                                    return product
		                                      ? {
		                                          label: getFeaturedProductLabel(product),
		                                          value: String(product.id),
		                                        }
		                                      : null;
		                                  })
		                                  .filter(Boolean) as Option[];

		                                return (
		                                  <div className="grid gap-4">
		                                    <MultipleSelector
		                                      commandProps={{
		                                        label: "Select featured products",
		                                      }}
		                                      defaultOptions={featuredProductOptions}
		                                      emptyIndicator={
		                                        <p className="text-center text-sm">
		                                          No products found
		                                        </p>
		                                      }
		                                      onChange={setFeaturedProducts}
		                                      placeholder="Select products"
		                                      value={selectedFeaturedOptions}
		                                    />
		                                    {selectedFeaturedOptions.length === 0 ? (
		                                      <p className="text-sm text-muted-foreground">
		                                        No featured products selected.
		                                      </p>
		                                    ) : (
		                                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
		                                        {selectedFeaturedOptions.map(
		                                          (option) => {
		                                            const product = productOptions.find(
		                                              (productItem: any) =>
		                                                String(productItem.id) ===
		                                                option.value,
		                                            );

		                                            if (!product) return null;

		                                            return (
		                                              <div
		                                                key={option.value}
		                                                className="relative"
		                                              >
		                                                <Button
		                                                  type="button"
		                                                  variant="destructive"
		                                                  size="icon"
		                                                  className="absolute right-2 top-2 z-20 h-8 w-8"
		                                                  onClick={() =>
		                                                    setFeaturedProducts(
		                                                      selectedFeaturedOptions.filter(
		                                                        (selectedOption) =>
		                                                          selectedOption.value !==
		                                                          option.value,
		                                                      ),
		                                                    )
		                                                  }
		                                                >
		                                                  <Trash2 className="h-4 w-4" />
		                                                </Button>
		                                                <AdminProductCard data={product} />
		                                              </div>
		                                            );
		                                          },
		                                        )}
		                                      </div>
		                                    )}
		                                  </div>
		                                );
		                              })()}
	                          </CardContent>
	                          <CardFooter className="flex justify-between border-t bg-muted/30 px-2 py-3">
	                            <div className="text-xs text-muted-foreground">
	                              Saves to homepage layout config.
	                            </div>
	                            <Badge variant={component.visible ? "default" : "outline"}>
	                              {component.visible ? "Active" : "Inactive"}
	                            </Badge>
	                          </CardFooter>
	                        </Card>
	                      );
	                    })}
	                  </div>
                </div>
              )}
              {activeTab === "slider" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-3xl font-bold tracking-tight">
                        Slider Images
                      </h2>
                      <p className="text-muted-foreground mt-1">
                        Manage your homepage slider images. You can have between
                        1 and 6 images.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addSliderItem}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Image
                    </Button>
                  </div>
                  <Separator />

                  <Alert className="bg-primary/5 border-primary/20">
                    <AlertCircle className="h-4 w-4 text-primary" />
                    <AlertTitle>Important</AlertTitle>
                    <AlertDescription>
                      You must have at least one slider image and can have up to
                      six. Each image should be high quality and represent your
                      brand.
                    </AlertDescription>
                  </Alert>

                  <div className="grid gap-6">
                    {form.getValues().slider?.map((_, index) => (
                      <Card
                        key={index}
                        className="overflow-hidden border-2 hover:border-primary/50 transition-all"
                      >
                        <CardHeader className="bg-muted/50 p-2 rounded-xl">
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center">
                              <div className="bg-primary/10 p-2 rounded-md mr-3">
                                <ImageIcon2 className="h-5 w-5 text-primary" />
                              </div>
                              Slider Image {index + 1}
                            </CardTitle>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeSliderItem(index)}
                              className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Remove</span>
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="grid gap-6 py-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <FormField
                              control={form.control}
                              name={`slider.${index}.image`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Image URL</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="https://example.com/image.jpg"
                                      className="!bg-muted"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`slider.${index}.href`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Link URL (Optional)</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="https://example.com/page"
                                      className="!bg-muted"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={form.control}
                            name={`slider.${index}.image`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Preview</FormLabel>
                                <FormControl>
                                  <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border bg-muted">
                                    {field.value ? (
                                      <Image
                                        src={field.value || "/placeholder.svg"}
                                        alt={`Slider image ${index + 1}`}
                                        fill
                                        className="object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-full items-center justify-center">
                                        <ImageIcon className="h-10 w-10 text-muted-foreground" />
                                      </div>
                                    )}
                                  </div>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </CardContent>
                        <CardFooter className="bg-muted/30 border-t flex justify-between p-3">
                          <div className="text-xs text-muted-foreground">
                            Last updated: Today
                          </div>
                          <Badge variant="outline">
                            {form.getValues().slider?.[index]?.href
                              ? "With Link"
                              : "No Link"}
                          </Badge>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              {activeTab === "events" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-3xl font-bold tracking-tight">
                        Events
                      </h2>
                      <p className="text-muted-foreground mt-1">
                        Manage your promotional events. You can have between 1
                        and 2 events.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addEventItem}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Event
                    </Button>
                  </div>
                  <Separator />

                  <div className="grid gap-6">
                    {form.getValues().events?.map((_, index) => (
                      <Card
                        key={index}
                        className="overflow-hidden border-2 hover:border-primary/50 transition-all"
                      >
                        <CardHeader className="bg-muted/50 p-2 rounded-xl">
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center">
                              <div className="bg-primary/10 p-2 rounded-md mr-3">
                                <Layers className="h-5 w-5 text-primary" />
                              </div>
                              Event {index + 1}
                            </CardTitle>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeEventItem(index)}
                              className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Remove</span>
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="grid gap-6 py-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <FormField
                              control={form.control}
                              name={`events.${index}.title`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Title</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="Event title"
                                      className="!bg-muted"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`events.${index}.color`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Color</FormLabel>
                                  <FormControl>
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="h-10 w-10 rounded-md border"
                                        style={{ backgroundColor: field.value }}
                                      />
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <Button variant="outline" size="sm">
                                            Choose Color
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                          className="w-auto p-0"
                                          align="start"
                                        >
                                          <HexColorPicker
                                            color={field.value}
                                            onChange={field.onChange}
                                            className="p-2"
                                          />
                                        </PopoverContent>
                                      </Popover>
                                      <Input
                                        value={field.value}
                                        onChange={field.onChange}
                                        className="w-24 bg-background"
                                      />
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={form.control}
                            name={`events.${index}.description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    placeholder="Event description"
                                    className="min-h-[100px] !bg-muted"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                        <CardFooter className="bg-muted/30 border-t flex justify-between p-3">
                          <div className="text-xs text-muted-foreground">
                            Last updated: Today
                          </div>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              {activeTab === "filters" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight">
                      Filters
                    </h2>
                    <p className="text-muted-foreground mt-1">
                      Manage product filtering options for your store.
                    </p>
                  </div>
                  <Separator />

                  <Tabs defaultValue="categories" className="w-full">
                    <TabsList className="grid grid-cols-2 mb-6">
                      <TabsTrigger value="categories">
                        Categories
                      </TabsTrigger>
                      <TabsTrigger value="attributes">
                        Colors
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="categories" className="space-y-6">
                      <Card className="overflow-hidden border-2">
                        <CardHeader className="bg-muted/50 p-2 rounded-xl">
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center">
                              <div className="bg-primary/10 p-2 rounded-md mr-3">
                                <Filter className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                Categories
                                <CardDescription className="text-xs">
                                  Manage the main product categories for your
                                  store
                                </CardDescription>
                              </div>
                            </CardTitle>
                            <Button
                              onClick={() => addFilterItem("category")}
                              variant="outline"
                              size="sm"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Category
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="p-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead className="text-right">
                                  Actions
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {form.getValues().filters?.categories &&
                                form
                                  .getValues()
                                  .filters.categories.map((category) => (
                                    <TableRow key={category.id}>
                                      <TableCell className="font-medium">
                                        {category.name}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                              editFilterItem(
                                                "category",
                                                category
                                              )
                                            }
                                          >
                                            <Edit className="h-4 w-4" />
                                            <span className="sr-only">
                                              Edit
                                            </span>
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive"
                                            onClick={() =>
                                              removeFilterItem(
                                                "category",
                                                category.id
                                              )
                                            }
                                          >
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">
                                              Delete
                                            </span>
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    <TabsContent value="attributes" className="space-y-6">
                      <Card className="overflow-hidden border-2">
                        <CardHeader className="bg-muted/50 p-2 rounded-xl">
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center">
                              <div className="bg-primary/10 p-2 rounded-md mr-3">
                                <Filter className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                Colors
                                <CardDescription className="text-xs">
                                  Manage color options for filtering products
                                </CardDescription>
                              </div>
                            </CardTitle>
                            <Button
                              onClick={() => addFilterItem("color")}
                              variant="outline"
                              size="sm"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Color
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="p-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Color</TableHead>
                                <TableHead className="text-right">
                                  Actions
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {form.getValues().filters?.colors &&
                                form.getValues().filters.colors.map((color) => (
                                  <TableRow key={color.id}>
                                    <TableCell className="font-medium">
                                      {color.name}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <div
                                          className="h-6 w-6 rounded-md border"
                                          style={{
                                            backgroundColor: color.color,
                                          }}
                                        />
                                        <span>{color.color}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-2">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() =>
                                            editFilterItem("color", color)
                                          }
                                        >
                                          <Edit className="h-4 w-4" />
                                          <span className="sr-only">Edit</span>
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="text-destructive"
                                          onClick={() =>
                                            removeFilterItem("color", color.id)
                                          }
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          <span className="sr-only">
                                            Delete
                                          </span>
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
              {activeTab === "storeSettings" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight">
                      Store Settings
                    </h2>
                    <p className="text-muted-foreground mt-1">
                      Manage delivery timing and order messaging.
                    </p>
                  </div>
                  <Separator />

                  <Card className="overflow-hidden border-2 hover:border-primary/50 transition-all">
                    <CardHeader className="bg-muted/50 p-2 rounded-xl">
                      <CardTitle className="flex items-center">
                        <div className="bg-primary/10 p-2 rounded-md mr-3">
                          <Settings className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          Delivery
                          <CardDescription className="text-xs">
                            These values control delivery estimates shown to
                            customers and saved on new orders.
                          </CardDescription>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6 py-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="storeSettings.deliveryEstimateDays"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Delivery Estimate Days</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min={0}
                                max={365}
                                className="!bg-muted"
                              />
                            </FormControl>
                            <FormDescription>
                              Number of days added to the order date.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="storeSettings.paymentWindowHours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Payment Window Hours</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min={1}
                                max={168}
                                className="!bg-muted"
                              />
                            </FormControl>
                            <FormDescription>
                              Used for unpaid order instructions.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="storeSettings.originCity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Origin City</FormLabel>
                            <FormControl>
                              <Input {...field} className="!bg-muted" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="storeSettings.originCountry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Origin Country</FormLabel>
                            <FormControl>
                              <Input {...field} className="!bg-muted" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                    <CardFooter className="bg-muted/30 border-t flex justify-between p-2">
                      <div className="text-xs text-muted-foreground">
                        Applies to new orders immediately after saving.
                      </div>
                    </CardFooter>
                  </Card>
                </div>
              )}
              {activeTab === "messages" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight">
                      Messages
                    </h2>
                    <p className="text-muted-foreground mt-1">
                      Set a global message to display on your website.
                    </p>
                  </div>
                  <Separator />

                  <Card className="overflow-hidden border-2 hover:border-primary/50 transition-all">
                    <CardHeader className="bg-muted/50  p-2 rounded-xl">
                      <CardTitle className="flex items-center">
                        <div className="bg-primary/10 p-2 rounded-md mr-3">
                          <MessageSquare className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          Global Message
                          <CardDescription className="text-xs">
                            This message will be displayed prominently on your
                            website. Leave empty to hide.
                          </CardDescription>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6 py-4">
                      <FormField
                        control={form.control}
                        name="messages.message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Message</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Enter your message here"
                                className="min-h-[100px] !bg-muted"
                              />
                            </FormControl>
                            <FormDescription>
                              This message will be displayed at the top of your
                              website.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="messages.date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Expiry Date (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="date"
                                className="!bg-muted"
                              />
                            </FormControl>
                            <FormDescription>
                              The message will be hidden after this date. Leave
                              empty for no expiry.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                    <CardFooter className="bg-muted/30 border-t flex justify-between p-2">
                      <div className="text-xs text-muted-foreground">
                        Last updated: Today
                      </div>
                      <Badge
                        variant={
                          form.getValues().messages?.message
                            ? "default"
                            : "outline"
                        }
                      >
                        {form.getValues().messages?.message
                          ? "Active"
                          : "Inactive"}
                      </Badge>
                    </CardFooter>
                  </Card>
                </div>
              )}
            </form>
          </Form>
	        ) : null}
	        </div>
	      </main>

      {editingFilter && (
        <Dialog
          open={!!editingFilter}
          onOpenChange={() => setEditingFilter(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingFilter.isNew ? "Add New" : "Edit"}{" "}
                {editingFilter.type === "category" ? "Category" : "Color"}
              </DialogTitle>
              <DialogDescription>
                Fill in the details below to{" "}
                {editingFilter.isNew ? "create a new" : "update the"} filter
                option.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={editingFilter.item?.name || ""}
                  onChange={(e) => {
                    const name = e.target.value
                    const updatedItem = { ...editingFilter.item, name }
                    if (editingFilter.type === "color") {
                      updatedItem.color = name.toLowerCase()
                    }

                    setEditingFilter({
                      ...editingFilter,
                      item: updatedItem,
                    })
                  }}
                  className="bg-background"
                />
              </div>

              {editingFilter.type === "color" && (
                <div className="grid gap-2">
                  <Label htmlFor="color">Color Preview</Label>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-10 w-10 rounded-md border"
                      style={{
                        backgroundColor: (editingFilter.item as ColorFilterItem)?.color || "#000000",
                      }}
                    />
                    <span className="text-sm text-muted-foreground">
                      Color value is automatically set to match the name
                    </span>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingFilter(null)}>
                Cancel
              </Button>
              <Button onClick={saveFilterItem}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
