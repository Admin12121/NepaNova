import datetime
import logging
import random
import string

from django.db.models import Q
from django.template.loader import render_to_string
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

logger = logging.getLogger(__name__)
from rest_framework.views import APIView

from account.utils import send_email

from .models import Booking
from .serializers import (
    BillUpdateSerializer,
    BookingCreateSerializer,
    BookingDetailSerializer,
    BookingListSerializer,
    BookingMeasurementUpdateSerializer,
)


class IsAdminOrCreateOnly(permissions.BasePermission):
    """
    Custom permission to allow anyone to create bookings,
    but only admins can view, update, or delete.
    """

    def has_permission(self, request, view):
        if request.method == "POST" and view.action == "create":
            return True
        return request.user and request.user.is_staff


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response(
            {
                "count": self.page.paginator.count,
                "page_size": self.get_page_size(self.request),
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
                "results": data,
            }
        )


def send_booking_confirmation_email(booking):
    """Send confirmation email to customer after booking"""
    try:
        subject = "Booking Confirmed - Your Measurement Appointment"

        # Format measurement type for display
        type_map = {
            "in_store": "🏪 In-Store Visit",
            "home_visit": "🏠 Home Visit",
            "self": "📏 Self Measurement",
        }
        measurement_type_display = type_map.get(
            booking.measurement_type, booking.measurement_type
        )

        # Format date
        formatted_date = (
            booking.preferred_date.strftime("%B %d, %Y")
            if hasattr(booking.preferred_date, "strftime")
            else str(booking.preferred_date)
        )

        context = {
            "name": booking.name,
            "preferred_date": formatted_date,
            "preferred_time": booking.preferred_time,
            "measurement_type": measurement_type_display,
            "location": booking.location,
        }

        body = render_to_string("booking_confirmation.html", context)
        send_email(subject, booking.email, body)
    except Exception as e:
        logger.error("Failed to send booking confirmation email: %s", e)


def send_measurement_complete_email(booking):
    """Send email to customer when measurements are completed"""
    try:
        subject = "Your Measurements are Complete!"

        # Helper function to build measurement table rows
        def build_measurement_rows(measurements):
            if not measurements:
                return ""
            rows = []
            for key, val in measurements.items():
                a_val = val.get("A", "-")
                b_val = val.get("B", "-")
                row = f"""
                  <tr style="border-bottom: 1px solid #e0e0e0">
                    <td style="padding: 10px 12px; font-size: 14px; color: #1a1a1a; font-weight: 600">{key}</td>
                    <td style="padding: 10px 12px; text-align: center; font-size: 14px; color: #333">{a_val}</td>
                    <td style="padding: 10px 12px; text-align: center; font-size: 14px; color: #333">{b_val}</td>
                  </tr>"""
                rows.append(row)
            return "".join(rows)

        # Format delivery date
        formatted_delivery = None
        if booking.delivery_date:
            formatted_delivery = (
                booking.delivery_date.strftime("%B %d, %Y")
                if hasattr(booking.delivery_date, "strftime")
                else str(booking.delivery_date)
            )

        # Get status display
        status_display = (
            booking.get_status_display()
            if hasattr(booking, "get_status_display")
            else booking.status.replace("_", " ").title()
        )

        context = {
            "name": booking.name,
            "bill_number": booking.bill_number,
            "status": status_display,
            "delivery_date": formatted_delivery,
            "has_measurements": booking.has_measurements(),
            "coat_measurements": booking.coat_measurements,
            "pant_measurements": booking.pant_measurements,
            "shirt_measurements": booking.shirt_measurements,
            "coat_measurements_rows": build_measurement_rows(booking.coat_measurements),
            "pant_measurements_rows": build_measurement_rows(booking.pant_measurements),
            "shirt_measurements_rows": build_measurement_rows(
                booking.shirt_measurements
            ),
            "admin_message": booking.admin_message,
        }

        body = render_to_string("measurement_complete.html", context)
        send_email(subject, booking.email, body)
    except Exception as e:
        logger.error("Failed to send measurement complete email: %s", e)


def generate_bill_number():
    """Generate a unique bill number"""
    date_part = datetime.date.today().strftime("%Y%m%d")
    random_part = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    bill_number = f"{date_part}-{random_part}"

    while Booking.objects.filter(bill_number=bill_number).exists():
        random_part = "".join(
            random.choices(string.ascii_uppercase + string.digits, k=4)
        )
        bill_number = f"{date_part}-{random_part}"

    return bill_number


class BookingViewSet(viewsets.ModelViewSet):
    """
    ViewSet for unified booking and measurement management.
    - Public: Can create bookings (POST)
    - Admin: Can list, view, update, delete bookings and add measurements
    """

    queryset = Booking.objects.all()
    permission_classes = [IsAdminOrCreateOnly]
    pagination_class = StandardResultsSetPagination

    def get_serializer_class(self):
        if self.action == "create":
            return BookingCreateSerializer
        elif self.action == "list":
            return BookingListSerializer
        elif self.action in ["update_measurements", "partial_update"]:
            return BookingMeasurementUpdateSerializer
        return BookingDetailSerializer

    def get_queryset(self):
        queryset = Booking.objects.all()

        # Search
        search = self.request.query_params.get("search", None)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(email__icontains=search)
                | Q(phone_number__icontains=search)
                | Q(bill_number__icontains=search)
            )

        # Filter by status
        status_filter = self.request.query_params.get("status", None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by date range
        start_date = self.request.query_params.get("start_date", None)
        end_date = self.request.query_params.get("end_date", None)
        if start_date:
            queryset = queryset.filter(preferred_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(preferred_date__lte=end_date)

        # Filter by measurement type
        measurement_type = self.request.query_params.get("measurement_type", None)
        if measurement_type:
            queryset = queryset.filter(measurement_type=measurement_type)

        # Filter by has_measurements
        has_measurements = self.request.query_params.get("has_measurements", None)
        if has_measurements == "true":
            queryset = queryset.exclude(
                coat_measurements={}, pant_measurements={}, shirt_measurements={}
            )
        elif has_measurements == "false":
            queryset = queryset.filter(
                coat_measurements={}, pant_measurements={}, shirt_measurements={}
            )

        return queryset

    def create(self, request, *args, **kwargs):
        """Create a new booking (public access) and send confirmation email"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking = serializer.save(status="pending")

        # Send confirmation email
        send_booking_confirmation_email(booking)

        # Return full booking info
        response_serializer = BookingDetailSerializer(booking)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch"])
    def update_status(self, request, pk=None):
        """Quick status update for a booking"""
        booking = self.get_object()
        new_status = request.data.get("status")

        if new_status not in dict(Booking.STATUS_CHOICES):
            return Response(
                {"error": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST
            )

        booking.status = new_status
        booking.save()

        serializer = BookingDetailSerializer(booking)
        return Response(serializer.data)

    @action(detail=True, methods=["patch"])
    def update_measurements(self, request, pk=None):
        """Update measurements for a booking (admin only)"""
        booking = self.get_object()

        # Generate bill number if not exists
        if not booking.bill_number:
            booking.bill_number = generate_bill_number()

        serializer = BookingMeasurementUpdateSerializer(
            booking, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)

        # Check if this is completing measurements
        old_has_measurements = booking.has_measurements()
        serializer.save()
        booking.refresh_from_db()
        new_has_measurements = booking.has_measurements()

        # If measurements were just completed, set timestamp and send email
        if not old_has_measurements and new_has_measurements:
            booking.measurement_completed_at = timezone.now()
            booking.save()

        # Send email if status changed to completed or delivered, or if send_email flag is set
        if request.data.get("send_email") or booking.status in [
            "completed",
            "delivered",
        ]:
            send_measurement_complete_email(booking)

        response_serializer = BookingDetailSerializer(booking)
        return Response(response_serializer.data)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Get booking statistics"""
        total = Booking.objects.count()
        pending = Booking.objects.filter(status="pending").count()
        confirmed = Booking.objects.filter(status="confirmed").count()
        in_progress = Booking.objects.filter(status="in_progress").count()
        completed = Booking.objects.filter(status="completed").count()
        delivered = Booking.objects.filter(status="delivered").count()
        cancelled = Booking.objects.filter(status="cancelled").count()

        with_measurements = Booking.objects.exclude(
            coat_measurements={}, pant_measurements={}, shirt_measurements={}
        ).count()

        return Response(
            {
                "total": total,
                "pending": pending,
                "confirmed": confirmed,
                "in_progress": in_progress,
                "completed": completed,
                "delivered": delivered,
                "cancelled": cancelled,
                "with_measurements": with_measurements,
            }
        )

    @action(detail=True, methods=["patch"])
    def update_bill(self, request, pk=None):
        """Create or update bill/order slip data for a booking (admin only)"""
        booking = self.get_object()

        # Only admin/staff can update bills
        if not request.user.is_staff:
            return Response(
                {"error": "Only admins can create or update bills."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Generate bill number if not exists
        if not booking.bill_number:
            booking.bill_number = generate_bill_number()
            booking.save(update_fields=["bill_number"])

        serializer = BillUpdateSerializer(booking, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        booking.refresh_from_db()

        response_serializer = BookingDetailSerializer(booking)
        return Response(response_serializer.data)

    @action(detail=True, methods=["post"])
    def send_bill_email(self, request, pk=None):
        """Send bill/order slip to customer via email"""
        booking = self.get_object()

        if not request.user.is_staff:
            return Response(
                {"error": "Only admins can send bills."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not booking.bill_data:
            return Response(
                {"error": "No bill data found. Please create a bill first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            bill = booking.bill_data
            items = bill.get("items", [])

            subject = f"Order Slip - Bill #{booking.bill_number} | Alphasuits"
            body = render_to_string(
                "bill_email.html",
                {
                    "bill_number": booking.bill_number,
                    "name": booking.name,
                    "address": booking.location,
                    "phone": booking.phone_number,
                    "date_ordered": bill.get("date_ordered", ""),
                    "date_delivery": bill.get("date_delivery", ""),
                    "items": items,
                    "total_rs": bill.get("total_rs", ""),
                    "total_ps": bill.get("total_ps", ""),
                    "advance_rs": bill.get("advance_rs", ""),
                    "advance_ps": bill.get("advance_ps", ""),
                    "balance_rs": bill.get("balance_rs", ""),
                    "balance_ps": bill.get("balance_ps", ""),
                    "amount_in_words": bill.get("amount_in_words", ""),
                },
            )
            send_email(subject, booking.email, body)
            return Response({"msg": "Bill sent to customer email successfully."})
        except Exception as e:
            logger.error(f"Failed to send bill email for booking {pk}: {e}")
            return Response(
                {"error": "Failed to send bill email."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class CustomerLookupView(APIView):
    """
    API view for looking up customer by phone, email, or name.
    """

    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        query = request.query_params.get("q", "")

        if not query:
            return Response(
                {"error": 'Query parameter "q" is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        bookings = Booking.objects.filter(
            Q(phone_number__icontains=query)
            | Q(email__icontains=query)
            | Q(name__icontains=query)
            | Q(bill_number__icontains=query)
        ).order_by("-created_at")[:10]

        return Response({"results": BookingListSerializer(bookings, many=True).data})


class GenerateBillNumberView(APIView):
    """Generate a unique bill number"""

    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        return Response({"bill_number": generate_bill_number()})
