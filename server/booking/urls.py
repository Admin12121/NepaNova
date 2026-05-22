from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BookingViewSet, 
    CustomerLookupView,
    GenerateBillNumberView
)

router = DefaultRouter()
router.register(r'bookings', BookingViewSet, basename='booking')

urlpatterns = [
    path('', include(router.urls)),
    path('customer-lookup/', CustomerLookupView.as_view(), name='customer-lookup'),
    path('generate-bill/', GenerateBillNumberView.as_view(), name='generate-bill'),
]
