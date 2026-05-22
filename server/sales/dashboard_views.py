from collections import defaultdict
from datetime import timedelta

from django.db.models import Avg, Count, F, Sum
from django.db.models.functions import TruncDate, TruncMonth, TruncWeek
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from account.models import SiteViewLog, User
from booking.models import Booking
from product.models import Category, Product, ProductVariant, Review
from sales.models import Saled_Products, Sales


class DashboardStatsView(APIView):
    """
    Comprehensive dashboard statistics API
    Returns all key metrics for the admin dashboard
    Supports date range filtering via start_date and end_date params
    """

    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        today = timezone.now().date()

        # Get filtering parameters
        start_date_str = request.query_params.get("start_date")
        end_date_str = request.query_params.get("end_date")

        if start_date_str and end_date_str:
            start_date = parse_date(start_date_str)
            end_date = parse_date(end_date_str)
        else:
            # Default to last 30 days if no filter
            start_date = today - timedelta(days=30)
            end_date = today

        # Comparison period (previous period of same length)
        period_length = (end_date - start_date).days
        prev_start_date = start_date - timedelta(days=period_length)
        prev_end_date = start_date - timedelta(days=1)

        # ============ SALES STATS ============
        # Filter by range (all non-unpaid/cancelled for order counts)
        filtered_sales = Sales.objects.exclude(
            status__in=["unpaid", "cancelled"]
        ).filter(created__date__gte=start_date, created__date__lte=end_date)

        # Only completed (successful) sales count toward revenue
        completed_sales = filtered_sales.filter(status="successful")
        prev_completed_sales = Sales.objects.filter(
            status="successful",
            created__date__gte=prev_start_date,
            created__date__lte=prev_end_date,
        )

        # Revenue metrics - only from completed/successful orders
        total_revenue = completed_sales.aggregate(total=Sum("total_amt"))["total"] or 0
        prev_total_revenue = (
            prev_completed_sales.aggregate(total=Sum("total_amt"))["total"] or 0
        )

        # Monthly revenue - successful orders in current calendar month
        month_start = today.replace(day=1)
        monthly_revenue = (
            Sales.objects.filter(
                status="successful",
                created__date__gte=month_start,
                created__date__lte=today,
            ).aggregate(total=Sum("total_amt"))["total"]
            or 0
        )

        # Calculate percentage change
        if prev_total_revenue > 0:
            revenue_change = (
                (total_revenue - prev_total_revenue) / prev_total_revenue
            ) * 100
        else:
            revenue_change = 100 if total_revenue > 0 else 0

        # Order counts
        total_orders = filtered_sales.count()
        pending_orders = filtered_sales.filter(status="pending").count()
        processing_orders = filtered_sales.filter(
            status__in=["verified", "proceed", "packed"]
        ).count()
        delivered_orders = filtered_sales.filter(status="delivered").count()
        successful_orders = completed_sales.count()
        cancelled_orders = Sales.objects.filter(
            status="cancelled",
            created__date__gte=start_date,
            created__date__lte=end_date,
        ).count()

        # Average order value - only from completed/successful orders
        avg_order_value = completed_sales.aggregate(avg=Avg("total_amt"))["avg"] or 0

        # ============ PRODUCT STATS (Stock is snapshot, not historical) ============
        total_products = Product.objects.count()
        active_products = Product.objects.filter(deactive=False).count()
        low_stock_count = ProductVariant.objects.filter(
            stock__lt=10, stock__gt=0
        ).count()
        out_of_stock_count = ProductVariant.objects.filter(stock=0).count()
        total_categories = Category.objects.count()

        # ============ USER STATS ============
        # New users in period
        new_users = User.objects.filter(
            created_at__date__gte=start_date, created_at__date__lte=end_date
        ).count()
        active_users = User.objects.filter(state="active").count()

        # ============ BOOKING STATS ============
        bookings_in_period = Booking.objects.filter(
            created_at__date__gte=start_date, created_at__date__lte=end_date
        )
        total_bookings = bookings_in_period.count()
        pending_bookings = bookings_in_period.filter(status="pending").count()
        confirmed_bookings = bookings_in_period.filter(status="confirmed").count()

        bookings_with_measurements = Booking.objects.exclude(
            coat_measurements={}, pant_measurements={}, shirt_measurements={}
        ).count()

        # ============ STRIGIFY DATES FOR UI ============

        return Response(
            {
                # Revenue (only from successful/completed orders)
                "total_revenue": round(total_revenue, 2),
                "monthly_revenue": round(monthly_revenue, 2),
                "revenue_change": round(revenue_change, 1),
                "avg_order_value": round(avg_order_value, 2),
                # Orders
                "total_orders": total_orders,
                "pending_orders": pending_orders,
                "processing_orders": processing_orders,
                "delivered_orders": delivered_orders,
                "successful_orders": successful_orders,
                "cancelled_orders": cancelled_orders,
                # Products
                "total_products": total_products,
                "active_products": active_products,
                "low_stock_count": low_stock_count,
                "out_of_stock_count": out_of_stock_count,
                "total_categories": total_categories,
                # Users
                "new_users": new_users,
                "active_users": active_users,
                # Bookings
                "total_bookings": total_bookings,
                "pending_bookings": pending_bookings,
                "confirmed_bookings": confirmed_bookings,
                "bookings_with_measurements": bookings_with_measurements,
                # Meta
                "period": {"start": start_date, "end": end_date},
            }
        )


class SalesChartView(APIView):
    """
    Returns sales data for charts
    - Daily revenue for selected period
    - Sales by status for selected period
    """

    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        today = timezone.now().date()

        start_date_str = request.query_params.get("start_date")
        end_date_str = request.query_params.get("end_date")

        if start_date_str and end_date_str:
            start_date = parse_date(start_date_str)
            end_date = parse_date(end_date_str)
        else:
            start_date = today - timedelta(days=30)
            end_date = today

        # Daily revenue for selected period - only from successful/completed orders
        daily_sales = (
            Sales.objects.filter(
                created__date__gte=start_date,
                created__date__lte=end_date,
                status="successful",
            )
            .annotate(date=TruncDate("created"))
            .values("date")
            .annotate(revenue=Sum("total_amt"), orders=Count("id"))
            .order_by("date")
        )

        # Fill in missing dates
        daily_data = []
        current_date = start_date
        sales_by_date = {d["date"]: d for d in daily_sales}

        # Guard against too long loops if someone requests 10 years (limit to 365 days fill maybe?)
        # For now, trust the user or cap execution time
        days_diff = (end_date - current_date).days
        if (
            days_diff > 366
        ):  # Data points aggregation strategy needed for large ranges, but for now just raw
            pass

        while current_date <= end_date:
            if current_date in sales_by_date:
                daily_data.append(
                    {
                        "date": current_date.isoformat(),
                        "revenue": round(
                            sales_by_date[current_date]["revenue"] or 0, 2
                        ),
                        "orders": sales_by_date[current_date]["orders"],
                    }
                )
            else:
                daily_data.append(
                    {"date": current_date.isoformat(), "revenue": 0, "orders": 0}
                )
            current_date += timedelta(days=1)

        # Sales by status for selected period
        status_data = (
            Sales.objects.filter(
                created__date__gte=start_date, created__date__lte=end_date
            )
            .values("status")
            .annotate(count=Count("id"), total=Sum("total_amt"))
        )

        status_chart = [
            {
                "status": d["status"],
                "count": d["count"],
                "total": round(d["total"] or 0, 2),
            }
            for d in status_data
        ]

        return Response(
            {
                "daily": daily_data,
                "by_status": status_chart,
            }
        )


class TopProductsView(APIView):
    """
    Returns top selling products
    """

    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        limit = int(request.query_params.get("limit", 10))

        # Top products by quantity sold
        top_products = (
            Saled_Products.objects.filter(product__isnull=False)
            .values("product__id", "product__product_name", "product__productslug")
            .annotate(total_qty=Sum("qty"), total_revenue=Sum("total"))
            .order_by("-total_qty")[:limit]
        )

        products = []
        for p in top_products:
            # Get first image
            from product.models import ProductImage

            image = ProductImage.objects.filter(product_id=p["product__id"]).first()
            products.append(
                {
                    "id": p["product__id"],
                    "name": p["product__product_name"],
                    "slug": p["product__productslug"],
                    "quantity_sold": round(p["total_qty"], 0),
                    "revenue": round(p["total_revenue"], 2),
                    "image": image.image.url if image else None,
                }
            )

        return Response({"products": products})


class RecentOrdersView(APIView):
    """
    Returns recent orders
    """

    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        limit = int(request.query_params.get("limit", 10))

        orders = Sales.objects.select_related("costumer_name").order_by("-created")[
            :limit
        ]

        recent = []
        for order in orders:
            recent.append(
                {
                    "id": order.id,
                    "transaction_id": order.transactionuid,
                    "customer": f"{order.costumer_name.first_name} {order.costumer_name.last_name}"
                    if order.costumer_name
                    else "Guest",
                    "email": order.costumer_name.email if order.costumer_name else None,
                    "total": round(order.total_amt, 2),
                    "status": order.status,
                    "payment_method": order.payment_method,
                    "created": order.created.isoformat() if order.created else None,
                }
            )

        return Response({"orders": recent})


class RecentBookingsView(APIView):
    """
    Returns recent bookings
    """

    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        limit = int(request.query_params.get("limit", 5))

        bookings = Booking.objects.all().order_by("-created_at")[:limit]

        booking_list = []
        for booking in bookings:
            booking_list.append(
                {
                    "id": booking.id,
                    "name": booking.name,
                    "status": booking.status,
                    "type": booking.measurement_type,
                    "date": booking.preferred_date,
                    "time": booking.preferred_time,
                    "created": booking.created_at.isoformat()
                    if booking.created_at
                    else None,
                }
            )

        return Response({"bookings": booking_list})


class VisitorStatsView(APIView):
    """
    Returns visitor/site view statistics
    """

    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        today = timezone.now().date()
        last_7_days = today - timedelta(days=7)
        last_30_days = today - timedelta(days=30)

        # Daily views for last 7 days
        daily_views = (
            SiteViewLog.objects.filter(timestamp__date__gte=last_7_days)
            .annotate(date=TruncDate("timestamp"))
            .values("date")
            .annotate(views=Count("id"))
            .order_by("date")
        )

        daily_data = []
        current_date = last_7_days
        views_by_date = {d["date"]: d["views"] for d in daily_views}
        while current_date <= today:
            daily_data.append(
                {
                    "date": current_date.isoformat(),
                    "views": views_by_date.get(current_date, 0),
                }
            )
            current_date += timedelta(days=1)

        # Views by country (top 10)
        by_country = (
            SiteViewLog.objects.filter(timestamp__date__gte=last_30_days)
            .values("country")
            .annotate(count=Count("id"))
            .order_by("-count")[:10]
        )

        # Views by device/browser
        by_device = (
            SiteViewLog.objects.filter(timestamp__date__gte=last_30_days)
            .values("user_agent")
            .annotate(count=Count("id"))
            .order_by("-count")[:5]
        )

        return Response(
            {
                "daily": daily_data,
                "by_country": list(by_country),
                "by_device": list(by_device),
            }
        )


class CategoryPerformanceView(APIView):
    """
    Returns sales performance by category
    """

    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        # Sales by category
        category_sales = (
            Saled_Products.objects.filter(product__category__isnull=False)
            .values("product__category__name", "product__category__id")
            .annotate(
                quantity=Sum("qty"),
                revenue=Sum("total"),
                orders=Count("transition", distinct=True),
            )
            .order_by("-revenue")
        )

        categories = [
            {
                "id": c["product__category__id"],
                "name": c["product__category__name"],
                "quantity": round(c["quantity"], 0),
                "revenue": round(c["revenue"], 2),
                "orders": c["orders"],
            }
            for c in category_sales
        ]

        return Response({"categories": categories})
