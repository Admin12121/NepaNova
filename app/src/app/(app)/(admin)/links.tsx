import {
  Home,
  Settings,
  UserRound,
  Package,
  BadgePercent,
  ShoppingCart,
  MessageCircle,
  Mail,
  BookOpenText,
  ShieldCheck,
} from "lucide-react";

export const Links = [
  {
    title: "Dashboard",
    icon: Home,
    href: "/dashboard",
    requiredPermission: "dashboard.view",
  },
  {
    title: "Users",
    icon: UserRound,
    href: "/users",
    requiredPermission: "users.view",
  },
  {
    title: "Roles",
    icon: ShieldCheck,
    href: "/roles",
    requiredPermission: "roles.manage",
  },
  {
    title: "Products",
    collapsible: true,
    isactive: true,
    href: "/products",
    icon: Package,
    requiredPermission: "products.view",
    subLinks: [
      { title: "Products", href: "/products", requiredPermission: "products.view" },
      { title: "Add Products", href: "/products/add-product", requiredPermission: "products.manage" },
      { title: "category", href: "/products/category", requiredPermission: "products.manage" },
      { title: "Stock", href: "/products/stock", requiredPermission: "products.view" },
      { title: "Discounts & Coupons", href: "/products/discounts", requiredPermission: "products.manage" },
    ],
  },
  {
    title: "Sales",
    icon: BadgePercent,
    collapsible: true,
    isactive: true,
    href: "/sales",
    requiredPermission: "orders.view",
    subLinks: [
      { title: "Orders", href: "/sales", requiredPermission: "orders.view" },
      { title: "POS", href: "/sales/pos", requiredPermission: "orders.manage", icon: ShoppingCart },
    ],
  },
  {
    title: "Reviews",
    icon: MessageCircle,
    href: "/user-reviews",
    requiredPermission: "reviews.manage",
  },
  {
    title: "Newsletter",
    icon: Mail,
    href: "/newsletter",
    requiredPermission: "newsletter.manage",
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/settings",
    requiredPermission: "settings.manage",
  },
];
