import logging

from django.conf import settings
from django.db import OperationalError, ProgrammingError, transaction

from layout.utils import DEFAULT_STORE_SETTINGS

from .rbac import DEFAULT_RBAC_PERMISSIONS

logger = logging.getLogger(__name__)


ROLE_DEFINITIONS = [
    {
        "slug": "admin",
        "name": "Admin",
        "color": "#ef4444",
        "position": 100,
        "permissions": "all",
    },
    {
        "slug": "manager",
        "name": "Manager",
        "color": "#8b5cf6",
        "position": 80,
        "permissions": [
            "dashboard.view",
            "users.view",
            "products.view",
            "products.manage",
            "orders.view",
            "orders.manage",
            "reviews.manage",
            "newsletter.manage",
            "settings.manage",
        ],
    },
    {
        "slug": "staff",
        "name": "Staff",
        "color": "#3b82f6",
        "position": 50,
        "permissions": [
            "dashboard.view",
            "products.view",
            "products.manage",
            "orders.view",
            "orders.manage",
            "reviews.manage",
        ],
    },
    {
        "slug": "support",
        "name": "Support",
        "color": "#14b8a6",
        "position": 30,
        "permissions": [
            "dashboard.view",
            "users.view",
            "orders.view",
            "reviews.manage",
            "newsletter.manage",
        ],
    },
    {
        "slug": "customer",
        "name": "Customer",
        "color": "#737373",
        "position": 0,
        "is_default": True,
        "permissions": [],
    },
]


def _frontend_asset_url(path):
    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
    return f"{frontend_url}/{path.lstrip('/')}"


def get_default_home_layout():
    return {
        "components": {
            "products": {
                "visible": True,
                "title": "Featured Products",
                "subtitle": "Explore the latest selections from the store",
            },
            "trendingProducts": {
                "visible": True,
                "title": "Trending Now",
                "subtitle": "Popular picks customers are viewing right now",
            },
            "recentProducts": {
                "visible": False,
                "title": "New Arrivals",
                "subtitle": "Fresh products recently added to the catalog",
            },
            "recommendedProducts": {
                "visible": True,
                "title": "Recommended For You",
                "subtitle": "Curated products selected for your next order",
            },
            "store": {
                "visible": True,
                "title": "Visit Our Store",
                "subtitle": "Explore the collection in person",
            },
        },
        "slider": [
            {
                "image": _frontend_asset_url("/store.webp"),
                "href": "/collections",
            }
        ],
        "events": [
            {
                "title": "Fresh Picks",
                "description": "Browse the current collection and featured products.",
                "color": "#a855f7",
            }
        ],
        "messages": {
            "message": "",
            "date": "",
        },
        "storeSettings": DEFAULT_STORE_SETTINGS.copy(),
        "filters": {
            "category": [],
            "materials": {
                "color": [],
            },
        },
    }


def seed_rbac():
    from .models import RbacPermission, Role

    permission_map = {}
    for code, name, description in DEFAULT_RBAC_PERMISSIONS:
        permission, _ = RbacPermission.objects.update_or_create(
            code=code,
            defaults={
                "name": name,
                "description": description,
            },
        )
        permission_map[code] = permission

    roles = {}
    for role_definition in ROLE_DEFINITIONS:
        role, _ = Role.objects.update_or_create(
            slug=role_definition["slug"],
            defaults={
                "name": role_definition["name"],
                "color": role_definition["color"],
                "position": role_definition["position"],
                "is_default": role_definition.get("is_default", False),
                "is_system": True,
            },
        )
        permission_codes = role_definition["permissions"]
        if permission_codes == "all":
            role.permissions.set(permission_map.values())
        else:
            role.permissions.set(
                [
                    permission_map[code]
                    for code in permission_codes
                    if code in permission_map
                ]
            )
        roles[role.slug] = role

    return roles


def seed_admin_user(roles):
    email = getattr(settings, "SEED_ADMIN_EMAIL", "")
    password = getattr(settings, "SEED_ADMIN_PASSWORD", "")
    if not email or not password:
        return None

    from .models import User, UserRole

    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            "first_name": getattr(settings, "SEED_ADMIN_FIRST_NAME", "Admin"),
            "last_name": getattr(settings, "SEED_ADMIN_LAST_NAME", "User"),
            "username": getattr(settings, "SEED_ADMIN_USERNAME", "@admin"),
            "role": "Admin",
            "state": "active",
            "is_admin": True,
            "is_superuser": True,
        },
    )

    changed_fields = []
    for field, value in {
        "role": "Admin",
        "state": "active",
        "is_admin": True,
        "is_superuser": True,
    }.items():
        if getattr(user, field) != value:
            setattr(user, field, value)
            changed_fields.append(field)

    if created or not user.has_usable_password():
        user.set_password(password)
        changed_fields.append("password")

    if changed_fields:
        user.save(update_fields=list(dict.fromkeys(changed_fields)))

    admin_role = roles.get("admin")
    if admin_role:
        UserRole.objects.get_or_create(user=user, role=admin_role)

    return user


def seed_default_layout():
    from layout.models import Layout

    default_config = get_default_home_layout()
    layout, created = Layout.objects.get_or_create(
        slug="home",
        defaults={"config": default_config},
    )

    if not created and not layout.config:
        layout.config = default_config
        layout.save(update_fields=["config"])
    elif not created and isinstance(layout.config, dict):
        config = layout.config
        changed = False
        if not isinstance(config.get("storeSettings"), dict):
            config["storeSettings"] = DEFAULT_STORE_SETTINGS.copy()
            changed = True
        else:
            for key, value in DEFAULT_STORE_SETTINGS.items():
                if key not in config["storeSettings"]:
                    config["storeSettings"][key] = value
                    changed = True

        if changed:
            layout.config = config
            layout.save(update_fields=["config"])

    return layout


def seed_initial_data(sender=None, **kwargs):
    try:
        with transaction.atomic():
            roles = seed_rbac()
            seed_admin_user(roles)
            seed_default_layout()
    except (OperationalError, ProgrammingError) as exc:
        logger.debug("Skipping initial seed until database is ready: %s", exc)
