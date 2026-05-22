import logging
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.template.loader import render_to_string
from django.utils import timezone
from rest_framework import filters, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from account.models import DeliveryAddress
from account.renderers import UserRenderer
from account.utils import send_email
from product.models import Product, ProductVariant
from server.utils.encryption import encrypt_response

from .models import *
from .serializers import *

logger = logging.getLogger(__name__)


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100


def get_invoice_details(sale, user_email):
    """Build invoice context from the saved Sale and its Saled_Products."""
    invoice_items = []

    for sp in sale.products.select_related("product", "variant").all():
        image = None
        if sp.product and sp.product.images.exists():
            image = sp.product.images.first().image.url

        invoice_items.append(
            {
                "product_name": sp.product.product_name if sp.product else "N/A",
                "variant_size": sp.variant.size if sp.variant else "",
                "pcs": int(sp.qty),
                "price": float(sp.price),
                "image_url": image,
                "total": float(sp.total),
            }
        )

    return {
        "transactionuid": sale.transactionuid,
        "email": user_email,
        "payment_method": sale.payment_method,
        "sub_total": float(sale.sub_total),
        "shipping": 0,
        "discount": float(sale.discount or 0),
        "total_amt": float(sale.total_amt),
        "products": invoice_items,
    }


class SalesViewSet(viewsets.ModelViewSet):
    """Sales ViewSet with admin-only update/delete."""

    queryset = Sales.objects.all().order_by("-id")
    renderer_classes = [UserRenderer]
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["costumer_name"]
    search_fields = [
        "costumer_name__first_name",
        "transactionuid",
        "costumer_name__email",
    ]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return SalesPostDataSerializer
        return SaleQuertSetSerializer

    def get_permissions(self):
        if self.action in ["update", "partial_update"]:
            # Only admin can update orders (change status, delivery date, etc.)
            return [IsAuthenticated(), IsAdminUser()]
        if self.action == "destroy":
            # Only admin can delete orders
            return [IsAuthenticated(), IsAdminUser()]
        return super().get_permissions()

    @encrypt_response
    def retrieve(self, request, *args, **kwargs):
        transactionuid = kwargs.get("transactionuid")
        instance = get_object_or_404(Sales, transactionuid=transactionuid)
        serializer = SalesDataSerializer(instance)
        return Response(serializer.data)

    def get_queryset(self):
        queryset = self.queryset
        search = self.request.query_params.get("search")
        if search:
            filters = (
                Q(costumer_name__first_name__icontains=search)
                | Q(transactionuid__icontains=search)
                | Q(costumer_name__email__icontains=search)
            )
            queryset = queryset.filter(filters)
        user = self.request.user
        if not user.is_superuser:
            return queryset.filter(costumer_name=user)
        return queryset

    def create(self, request, *args, **kwargs):
        """Override create instead of perform_create so we can return proper responses."""
        data = request.data
        invoice_data = data.get("products", [])
        user = request.user

        # --- Idempotency check: reject duplicate transactionuid ---
        transactionuid = data.get("transactionuid")
        if not transactionuid:
            return Response(
                {"error": "Transaction UID is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if Sales.objects.filter(transactionuid=transactionuid).exists():
            return Response(
                {"error": "This order has already been placed."},
                status=status.HTTP_409_CONFLICT,
            )

        # --- Validate shipping address before entering atomic block ---
        try:
            shipping_instance = DeliveryAddress.objects.get(id=data.get("shipping"))
        except DeliveryAddress.DoesNotExist:
            return Response(
                {"error": "Invalid shipping address."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # --- Validate redeem code before entering atomic block ---
        redeem_code_obj = None
        redeem_data = data.get("redeemData")
        if redeem_data:
            try:
                redeem_code_obj = Redeem_Code.objects.get(id=redeem_data["id"])
                if redeem_code_obj.valid_until < timezone.now().date():
                    return Response(
                        {"error": "Redeem code is expired."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if (
                    redeem_code_obj.limit is not None
                    and redeem_code_obj.used >= redeem_code_obj.limit
                ):
                    return Response(
                        {"error": "Redeem code usage limit reached."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            except Redeem_Code.DoesNotExist:
                return Response(
                    {"error": "Invalid redeem code."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # --- Atomic transaction: create sale, deduct stock, send invoice ---
        with transaction.atomic():
            if redeem_code_obj:
                redeem_code_obj.used = (redeem_code_obj.used or 0) + 1
                redeem_code_obj.save()

            post_serializer = self.get_serializer(data=data)
            post_serializer.is_valid(raise_exception=True)

            sale = post_serializer.save(
                costumer_name=user,
                redeem_data=redeem_code_obj.name if redeem_code_obj else None,
                shipping=shipping_instance,
                discount=data.get("discount", 0),
                sub_total=data.get("sub_total"),
                total_amt=data.get("total_amt"),
                transactionuid=data.get("transactionuid"),
                payment_method=data.get("payment_method"),
                expected_delivery_date=timezone.now().date() + timedelta(days=2),
            )

            for item in invoice_data:
                product = get_object_or_404(Product, id=item["product"])
                variant = get_object_or_404(ProductVariant, id=item["variant"])
                quantity_sold = item["pcs"]

                if variant.stock < quantity_sold:
                    raise serializers.ValidationError(
                        {
                            "error": f"Not enough stock for {product.product_name} ({variant.size or variant.color_name})."
                        }
                    )

                variant.stock -= quantity_sold
                variant.save()

                Saled_Products.objects.create(
                    transition=sale,
                    product=product,
                    variant=variant,
                    price=variant.price,
                    qty=quantity_sold,
                    total=variant.price * quantity_sold,
                )

        # --- Send invoice email (outside atomic so DB is committed) ---
        try:
            context = get_invoice_details(sale, user.email)
            subject = f"Order Confirmation – #{sale.transactionuid}"
            body = render_to_string("invoice.html", context)
            send_email(subject, user.email, body)
        except Exception as e:
            logger.error(f"Failed to send invoice email for {sale.transactionuid}: {e}")

        return Response(
            {"success": "Order created and invoice sent."},
            status=status.HTTP_201_CREATED,
        )

    def perform_update(self, serializer):
        instance = self.get_object()
        old_status = instance.status
        old_date = instance.expected_delivery_date
        updated_instance = serializer.save()

        new_date = updated_instance.expected_delivery_date
        new_status = updated_instance.status

        # Send delivery delay email using proper template
        if old_date and new_date and new_date > old_date:
            try:
                delay_reason = updated_instance.delivery_delay_reason or ""
                subject = f"Update on your order #{updated_instance.transactionuid}"
                context = {
                    "first_name": updated_instance.costumer_name.first_name
                    or "Valued Customer",
                    "transactionuid": updated_instance.transactionuid,
                    "new_delivery_date": new_date.strftime("%B %d, %Y"),
                    "delay_reason": delay_reason,
                }
                body = render_to_string("delivery_delay.html", context)
                send_email(subject, updated_instance.costumer_name.email, body)
            except Exception as e:
                logger.error(f"Failed to send delivery delay email: {e}")

        # Send review invitation email when order is delivered/successful
        if old_status not in ("delivered", "successful") and new_status in (
            "delivered",
            "successful",
        ):
            try:
                self._send_review_invitation_email(updated_instance)
            except Exception as e:
                logger.error(
                    f"Failed to send review invitation email for "
                    f"{updated_instance.transactionuid}: {e}"
                )

    def _send_review_invitation_email(self, sale):
        """Send an email inviting the customer to review their purchased products."""
        user = sale.costumer_name
        frontend_url = getattr(
            settings, "FRONTEND_URL", "https://alphasuits.com.np"
        ).rstrip("/")

        # Get all products from this order
        sale_products = sale.products.select_related("product").all()
        products_info = []
        for sp in sale_products:
            if sp.product:
                product_url = (
                    f"{frontend_url}/collections/{sp.product.productslug}?review=true"
                )
                products_info.append(
                    {
                        "product_name": sp.product.product_name,
                        "review_url": product_url,
                    }
                )

        if not products_info:
            return

        subject = f"Your order #{sale.transactionuid} has been delivered — Share your experience!"
        body = render_to_string(
            "delivery_review.html",
            {
                "first_name": user.first_name or "Valued Customer",
                "transactionuid": sale.transactionuid,
                "products": products_info,
                "reviews_url": f"{frontend_url}/reviews",
            },
        )
        send_email(subject, user.email, body)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        if instance.status not in ("cancelled", "unpaid"):
            return Response(
                {"error": "Only cancelled or unpaid orders can be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        transactionuid = instance.transactionuid

        # Restore stock for cancelled orders that had stock deducted
        if instance.status == "cancelled":
            for sp in instance.products.select_related("variant").all():
                if sp.variant:
                    sp.variant.stock += int(sp.qty)
                    sp.variant.save(update_fields=["stock"])

        instance.delete()

        return Response(
            {"msg": f"Order #{transactionuid} deleted successfully."},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path="status/(?P<status_param>[^/.]+)")
    def filter_by_status(self, request, status_param=None):
        status_map = {
            "onshipping": ["pending", "verified"],
            "arrived": ["proceed", "packed"],
            "delivered": ["delivered", "successful"],
            "canceled": ["unpaid", "cancelled"],
        }
        queryset = self.get_queryset()
        if status_param != "all":
            queryset = queryset.filter(status__in=status_map.get(status_param, []))

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class RedeemCodeViewSet(viewsets.ModelViewSet):
    """
    Redeem codes:
    - GET/LIST: Any authenticated user can view (for code verification on checkout)
    - POST/PATCH/PUT/DELETE: Admin only (create, update, delete codes)
    """

    queryset = Redeem_Code.objects.all().order_by("-id")
    serializer_class = RedeemSerializer
    renderer_classes = [UserRenderer]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["code", "name"]
    search_fields = ["code", "name"]
    ordering_fields = ["valid", "used"]

    def get_permissions(self):
        if self.action in ["list", "retrieve", "verify_code"]:
            # Any authenticated user can view/verify redeem codes
            return [IsAuthenticated()]
        # Create, update, delete require admin
        return [IsAuthenticated(), IsAdminUser()]

    def get_queryset(self):
        code = self.request.query_params.get("code")
        if code:
            return Redeem_Code.objects.filter(code=code)
        return super().get_queryset()

    def perform_create(self, serializer):
        name = self.request.data.get("name")
        code = self.request.data.get("code")
        if Redeem_Code.objects.filter(code=code, name=name).exists():
            raise serializers.ValidationError(
                {"error": f"{name} already exists in this store"}
            )
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        name = instance.name
        self.perform_destroy(instance)
        return Response(
            {"msg": f"Redeem code {name} deleted successfully"},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="verify-code")
    def verify_code(self, request):
        code = request.data.get("code")
        if not code:
            return Response(
                {"error": "Code is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            redeem_code = Redeem_Code.objects.get(code=code)
        except Redeem_Code.DoesNotExist:
            return Response({"error": "Invalid code"}, status=status.HTTP_404_NOT_FOUND)

        if redeem_code.valid_until < timezone.now().date():
            return Response(
                {"error": "Code is expired"}, status=status.HTTP_400_BAD_REQUEST
            )

        if redeem_code.limit is not None and redeem_code.used >= redeem_code.limit:
            return Response(
                {"error": "Code usage limit reached"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = {
            "id": redeem_code.id,
            "type": redeem_code.type,
            "discount": redeem_code.discount,
            "minimum": redeem_code.minimum,
            "limit": redeem_code.limit,
        }
        return Response(data, status=status.HTTP_200_OK)
