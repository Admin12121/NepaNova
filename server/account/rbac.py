from rest_framework.permissions import BasePermission


DEFAULT_RBAC_PERMISSIONS = [
    ("dashboard.view", "View dashboard", "View admin dashboard analytics."),
    ("users.view", "View users", "View users and customer profiles."),
    ("users.manage", "Manage users", "Create, update, block, and delete users."),
    ("roles.manage", "Manage roles", "Create roles and assign permissions."),
    ("products.view", "View products", "View catalog and stock data."),
    ("products.manage", "Manage products", "Create and update product catalog data."),
    ("orders.view", "View orders", "View customer orders."),
    ("orders.manage", "Manage orders", "View and update customer orders."),
    ("reviews.manage", "Manage reviews", "Moderate customer reviews."),
    ("newsletter.manage", "Manage newsletter", "View newsletter subscribers."),
    ("settings.manage", "Manage settings", "Update site layout and store settings."),
]


def user_has_permission(user, code):
    if not user or not user.is_authenticated:
        return False
    return user.has_rbac_permission(code)


class HasRbacPermission(BasePermission):
    required_permission = None

    def has_permission(self, request, view):
        code = getattr(view, "required_permission", None) or self.required_permission
        if code is None:
            return bool(request.user and request.user.is_authenticated)
        return user_has_permission(request.user, code)
