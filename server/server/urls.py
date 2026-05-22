from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from server.views import custom_404_view, security_monitor_beacon

urlpatterns = [
    # path('admin/', admin.site.urls),
    path("api/accounts/", include("account.urls")),
    path("api/sales/", include("sales.urls")),
    path("api/products/", include("product.urls")),
    path("api/layout/", include("layout.urls")),
    path("api/booking/", include("booking.urls")),
    # Security monitoring beacon endpoint (receives client-side fingerprint data)
    path(
        "api/security/monitor/", security_monitor_beacon, name="security-monitor-beacon"
    ),
]
# static() only works when DEBUG=True, so always serve media in development
from django.urls import re_path
from django.views.static import serve

urlpatterns += [
    re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT}),
]

# Custom 404 handler — scary security monitoring page
handler404 = custom_404_view
