from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated

from .models import Layout
from .serializers import LayoutSerializer


class LayoutViewSet(viewsets.ModelViewSet):
    """
    Layout configuration:
    - GET/LIST: Anyone can read (no auth required, used by frontend to render pages)
    - POST/PATCH/PUT/DELETE: Admin only (manage site layouts)
    """

    queryset = Layout.objects.all()
    serializer_class = LayoutSerializer
    lookup_field = "slug"

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        return [IsAuthenticated(), IsAdminUser()]
