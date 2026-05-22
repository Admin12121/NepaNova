export interface ManualSection {
  title: string;
  slug: string;
  description: string;
  icon: string;
  order: number;
}

export interface ManualGroup {
  title: string;
  sections: ManualSection[];
}

export const manualNavigation: ManualGroup[] = [
  {
    title: "Getting Started",
    sections: [
      {
        title: "Introduction",
        slug: "introduction",
        description: "Overview of the admin panel and how to get started",
        icon: "BookOpen",
        order: 1,
      },
      {
        title: "Dashboard Overview",
        slug: "dashboard",
        description: "Understanding the dashboard, analytics, and key metrics",
        icon: "LayoutDashboard",
        order: 2,
      },
      {
        title: "Managing Users",
        slug: "managing-users",
        description: "View, search, and manage users and their roles",
        icon: "Users",
        order: 3,
      },
    ],
  },
  {
    title: "Products",
    sections: [
      {
        title: "Adding a Product",
        slug: "adding-products",
        description:
          "Step-by-step guide to adding a new product with images, descriptions, and pricing",
        icon: "PackagePlus",
        order: 4,
      },
      {
        title: "Writing Descriptions",
        slug: "writing-descriptions",
        description:
          "How to write effective product descriptions using markdown formatting",
        icon: "FileText",
        order: 5,
      },
      {
        title: "Uploading Images",
        slug: "uploading-images",
        description:
          "How to upload, tag, and manage product images with color variants",
        icon: "ImagePlus",
        order: 6,
      },
      {
        title: "Product Variants",
        slug: "product-variants",
        description:
          "Setting up multi-variant products with sizes, colors, pricing, and stock",
        icon: "Layers",
        order: 7,
      },
      {
        title: "Managing Categories",
        slug: "managing-categories",
        description: "Create and organize product categories for your store",
        icon: "FolderTree",
        order: 8,
      },
      {
        title: "Managing Stock",
        slug: "managing-stock",
        description: "Monitor inventory levels and update stock quantities",
        icon: "Warehouse",
        order: 9,
      },
      {
        title: "Discounts & Coupons",
        slug: "discounts-coupons",
        description: "Create and manage discount codes and promotional coupons",
        icon: "BadgePercent",
        order: 10,
      },
    ],
  },
  {
    title: "Orders & Bookings",
    sections: [
      {
        title: "Sales & Orders",
        slug: "sales-orders",
        description: "View, manage, and process customer orders and sales",
        icon: "ShoppingCart",
        order: 11,
      },
      {
        title: "Bookings & Measurements",
        slug: "bookings-measurements",
        description:
          "Manage customer bookings, appointments, and record body measurements",
        icon: "CalendarCheck",
        order: 12,
      },
    ],
  },
  {
    title: "Site Settings",
    sections: [
      {
        title: "Components Settings",
        slug: "settings-components",
        description:
          "Toggle visibility and configure homepage sections like Store, Products, and more",
        icon: "Settings",
        order: 13,
      },
      {
        title: "Slider Settings",
        slug: "settings-slider",
        description: "Configure homepage slider images with links and previews",
        icon: "GalleryHorizontalEnd",
        order: 14,
      },
      {
        title: "Events Settings",
        slug: "settings-events",
        description:
          "Create and manage promotional events displayed on your site",
        icon: "CalendarDays",
        order: 15,
      },
      {
        title: "Filters Settings",
        slug: "settings-filters",
        description:
          "Set up product filter categories and color options for your storefront",
        icon: "Filter",
        order: 16,
      },
      {
        title: "Messages Settings",
        slug: "settings-messages",
        description:
          "Set a global announcement message displayed across your website",
        icon: "MessageSquare",
        order: 17,
      },
    ],
  },
  {
    title: "Customer View",
    sections: [
      {
        title: "How Customers See Products",
        slug: "customer-view",
        description: "Preview how your products and store appear to customers",
        icon: "Eye",
        order: 18,
      },
    ],
  },
];

export function getAllSlugs(): string[] {
  return manualNavigation.flatMap((group) =>
    group.sections.map((section) => section.slug),
  );
}

export function getSectionBySlug(slug: string): ManualSection | undefined {
  for (const group of manualNavigation) {
    const section = group.sections.find((s) => s.slug === slug);
    if (section) return section;
  }
  return undefined;
}

export function getAdjacentSections(slug: string): {
  prev: ManualSection | null;
  next: ManualSection | null;
} {
  const allSections = manualNavigation.flatMap((g) => g.sections);
  const index = allSections.findIndex((s) => s.slug === slug);

  return {
    prev: index > 0 ? allSections[index - 1] : null,
    next: index < allSections.length - 1 ? allSections[index + 1] : null,
  };
}
