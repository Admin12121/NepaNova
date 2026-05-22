import {
  Home,
  Settings,
  UserRound,
  Package,
  BadgePercent,
  MessageCircle,
  CalendarCheck,
  Mail,
  BookOpenText,
} from "lucide-react";

export const Links = [
  {
    title: "Dashboard",
    icon: Home,
    href: "/dashboard",
  },
  {
    title: "Users",
    icon: UserRound,
    href: "/users",
  },
  {
    title: "Products",
    collapsible: true,
    isactive: true,
    href: "/products",
    icon: Package,
    subLinks: [
      { title: "Products", href: "/products" },
      { title: "Add Products", href: "/products/add-product" },
      { title: "category", href: "/products/category" },
      { title: "Stock", href: "/products/stock" },
      { title: "Discounts & Coupons", href: "/products/discounts" },
    ],
  },
  {
    title: "Sales",
    icon: BadgePercent,
    href: "/sales",
  },
  {
    title: "Bookings",
    icon: CalendarCheck,
    href: "/bookings",
  },
  {
    title: "Reviews",
    icon: MessageCircle,
    href: "/user-reviews",
  },
  {
    title: "Newsletter",
    icon: Mail,
    href: "/newsletter",
  },
  {
    title: "Manual",
    icon: BookOpenText,
    href: "/manual",
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/settings",
  },
];
