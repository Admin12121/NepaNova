export const publicRoutes = ["/collections", "/collections/(.*)", "/wishlist"];

export const protectedRoutes = [
  "/dashboard",
  "/users",
  "/users/(.*)",
  "/roles",
  "/roles/(.*)",
  "/products",
  "/products/(.*)",
  "/orders",
  "/orders/(.*)",
  "/profile",
  "/shipping",
  "/checkout/(.*)",
  "/reviews",
  "/notification",
  "/sales",
  "/sales/pos",
  "/sales/(.*)",
  "/user-reviews",
  "/newsletter",
  "/settings",
];

export const adminRoutes = [
  "/dashboard",
  "/users",
  "/users/(.*)",
  "/roles",
  "/roles/(.*)",
  "/products",
  "/products/(.*)",
  "/sales",
  "/sales/pos",
  "/sales/(.*)",
  "/user-reviews",
  "/newsletter",
  "/settings",
];

export const adminRoutePermissions = [
  { route: "/roles/(.*)", permission: "roles.manage" },
  { route: "/roles", permission: "roles.manage" },
  { route: "/users/(.*)", permission: "users.view" },
  { route: "/users", permission: "users.view" },
  { route: "/products/add-product", permission: "products.manage" },
  { route: "/products/category", permission: "products.manage" },
  { route: "/products/discounts", permission: "products.manage" },
  { route: "/products/(.*)", permission: "products.view" },
  { route: "/products", permission: "products.view" },
  { route: "/sales/pos", permission: "orders.manage" },
  { route: "/sales/(.*)", permission: "orders.view" },
  { route: "/sales", permission: "orders.view" },
  { route: "/user-reviews", permission: "reviews.manage" },
  { route: "/newsletter", permission: "newsletter.manage" },
  { route: "/settings", permission: "settings.manage" },
  { route: "/dashboard", permission: "dashboard.view" },
];

export const authRoutes = ["/auth/login", "/auth/register", "/auth/(.*)/(.*)"];

export const apiAuthPrefix = "/api/auth";

export const Default_Login_Redirect = "/";
