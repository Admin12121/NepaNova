from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SalesViewSet, RedeemCodeViewSet
from .dashboard_views import (
    DashboardStatsView,
    SalesChartView,
    TopProductsView,
    RecentOrdersView,
    RecentBookingsView,
    VisitorStatsView,
    CategoryPerformanceView,
)

router = DefaultRouter()
router.register(r'sales', SalesViewSet, basename='sales')
router.register(r'redeemcode', RedeemCodeViewSet, basename='redeem-code')

urlpatterns = [
    path('', include(router.urls)),
    path('sales/transaction/<str:transactionuid>/', SalesViewSet.as_view({'get': 'retrieve'}), name='sales-detail'),
    
    # Dashboard API endpoints
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('dashboard/sales-chart/', SalesChartView.as_view(), name='dashboard-sales-chart'),
    path('dashboard/top-products/', TopProductsView.as_view(), name='dashboard-top-products'),
    path('dashboard/recent-orders/', RecentOrdersView.as_view(), name='dashboard-recent-orders'),
    path('dashboard/recent-bookings/', RecentBookingsView.as_view(), name='dashboard-recent-bookings'),
    path('dashboard/visitors/', VisitorStatsView.as_view(), name='dashboard-visitors'),
    path('dashboard/category-performance/', CategoryPerformanceView.as_view(), name='dashboard-category-performance'),
]