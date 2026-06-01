import logging
import secrets
from datetime import timedelta
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.template.loader import render_to_string
from django.utils import timezone
from rest_framework import filters, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from account.models import DeliveryAddress
from account.rbac import HasRbacPermission
from account.renderers import UserRenderer
from account.utils import send_email
from layout.utils import get_delivery_estimate_days
from product.models import Product, ProductVariant
from server.utils.encryption import encrypt_response

from .models import *
from .serializers import *
from .services import pickdrop

logger = logging.getLogger(__name__)


def send_review_invitation_email_for_sale(sale):
    """Send an email inviting the customer to review their purchased products."""
    user = sale.costumer_name
    frontend_url = getattr(settings, "FRONTEND_URL", "https://nepanova.com").rstrip("/")

    sale_products = sale.products.select_related("product").all()
    products_info = []
    for sp in sale_products:
        if sp.product:
            product_url = f"{frontend_url}/collections/{sp.product.productslug}?review=true"
            products_info.append(
                {
                    "product_name": sp.product.product_name,
                    "review_url": product_url,
                }
            )

    if not products_info:
        return

    subject = f"Your order #{sale.transactionuid} has been delivered - Share your experience!"
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

    ALLOWED_PAYMENT_METHODS = {"Cash On Delivery"}
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
        if self.action in [
            "update",
            "partial_update",
            "create_shipment",
            "retry_shipment",
            "cancel_shipment",
            "sync_shipment",
            "shipment_detail",
        ]:
            return [HasRbacPermission("orders.manage")]
        if self.action == "destroy":
            return [HasRbacPermission("orders.manage")]
        return super().get_permissions()

    @encrypt_response
    def retrieve(self, request, *args, **kwargs):
        transactionuid = kwargs.get("transactionuid")
        if transactionuid:
            instance = get_object_or_404(self.get_queryset(), transactionuid=transactionuid)
        else:
            instance = self.get_object()
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
        if not (
            user.is_superuser
            or user.has_rbac_permission("orders.view")
            or user.has_rbac_permission("orders.manage")
        ):
            return queryset.filter(costumer_name=user)
        return queryset

    def _parse_positive_int(self, value, field_name):
        try:
            parsed = int(value)
        except (TypeError, ValueError) as exc:
            raise serializers.ValidationError(
                {"error": f"{field_name} must be a positive integer."}
            ) from exc
        if parsed <= 0:
            raise serializers.ValidationError(
                {"error": f"{field_name} must be a positive integer."}
            )
        return parsed

    def _money(self, value):
        try:
            return Decimal(str(value or 0)).quantize(Decimal("0.01"))
        except (InvalidOperation, TypeError, ValueError) as exc:
            raise serializers.ValidationError({"error": "Invalid money amount."}) from exc

    def _get_redeem_id(self, redeem_data):
        if not redeem_data:
            return None
        if isinstance(redeem_data, dict):
            return redeem_data.get("id")
        return redeem_data

    def _prepare_order_items(self, invoice_data):
        if not isinstance(invoice_data, list) or not invoice_data:
            raise serializers.ValidationError(
                {"error": "At least one product is required."}
            )

        items = []
        for item in invoice_data:
            if not isinstance(item, dict):
                raise serializers.ValidationError(
                    {"error": "Invalid product payload."}
                )
            items.append(
                {
                    "product_id": self._parse_positive_int(
                        item.get("product"), "product"
                    ),
                    "variant_id": self._parse_positive_int(
                        item.get("variant"), "variant"
                    ),
                    "quantity": self._parse_positive_int(item.get("pcs"), "pcs"),
                }
            )
        return items

    def _variant_unit_price(self, variant):
        price = self._money(variant.price)
        discount = self._money(variant.discount or 0)
        if discount < 0 or discount > 100:
            raise serializers.ValidationError(
                {"error": "Variant discount must be between 0 and 100."}
            )
        if discount:
            price = price - ((price * discount) / Decimal("100"))
        return price.quantize(Decimal("0.01"))

    def _calculate_discount(self, redeem_code, subtotal):
        if not redeem_code:
            return Decimal("0.00")

        minimum = self._money(redeem_code.minimum or 0)
        if subtotal < minimum:
            raise serializers.ValidationError(
                {"error": "Minimum purchase amount not met for this redeem code."}
            )

        discount_value = self._money(redeem_code.discount or 0)
        if redeem_code.type == "percentage":
            if discount_value < 0 or discount_value > 100:
                raise serializers.ValidationError(
                    {"error": "Redeem code percentage must be between 0 and 100."}
                )
            discount = (subtotal * discount_value) / Decimal("100")
        elif redeem_code.type == "amount":
            discount = discount_value
        else:
            raise serializers.ValidationError({"error": "Invalid redeem code type."})

        return min(discount.quantize(Decimal("0.01")), subtotal)

    def _validate_redeem_code(self, redeem_code):
        if redeem_code.is_active is False:
            raise serializers.ValidationError({"error": "Redeem code is inactive."})
        if redeem_code.valid_until and redeem_code.valid_until < timezone.now().date():
            raise serializers.ValidationError({"error": "Redeem code is expired."})
        if redeem_code.limit is not None and (redeem_code.used or 0) >= redeem_code.limit:
            raise serializers.ValidationError(
                {"error": "Redeem code usage limit reached."}
            )

    def create(self, request, *args, **kwargs):
        """Override create instead of perform_create so we can return proper responses."""
        data = request.data
        invoice_data = data.get("products", [])
        user = request.user

        transactionuid = data.get("transactionuid")
        if not transactionuid:
            return Response(
                {"error": "Transaction UID is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment_method = data.get("payment_method") or "Cash On Delivery"
        if payment_method not in self.ALLOWED_PAYMENT_METHODS:
            return Response(
                {"error": "Unsupported payment method."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            shipping_id = self._parse_positive_int(data.get("shipping"), "shipping")
            order_items = self._prepare_order_items(invoice_data)
        except serializers.ValidationError as exc:
            return Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)

        redeem_id = self._get_redeem_id(data.get("redeemData"))
        if redeem_id:
            try:
                redeem_id = self._parse_positive_int(redeem_id, "redeemData.id")
            except serializers.ValidationError as exc:
                return Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                if Sales.objects.select_for_update().filter(
                    transactionuid=transactionuid
                ).exists():
                    return Response(
                        {"error": "This order has already been placed."},
                        status=status.HTTP_409_CONFLICT,
                    )

                try:
                    shipping_instance = DeliveryAddress.objects.select_for_update().get(
                        id=shipping_id, user=user, is_deleted=False
                    )
                except DeliveryAddress.DoesNotExist:
                    raise serializers.ValidationError(
                        {"error": "Invalid shipping address."}
                    )

                redeem_code_obj = None
                if redeem_id:
                    try:
                        redeem_code_obj = Redeem_Code.objects.select_for_update().get(
                            id=redeem_id
                        )
                    except Redeem_Code.DoesNotExist:
                        raise serializers.ValidationError(
                            {"error": "Invalid redeem code."}
                        )
                    self._validate_redeem_code(redeem_code_obj)

                variants = {
                    variant.id: variant
                    for variant in ProductVariant.objects.select_for_update()
                    .select_related("product")
                    .filter(id__in={item["variant_id"] for item in order_items})
                }

                line_items = []
                requested_stock = {}
                subtotal = Decimal("0.00")

                for item in order_items:
                    variant = variants.get(item["variant_id"])
                    if not variant:
                        raise serializers.ValidationError(
                            {"error": "Invalid product variant."}
                        )
                    if variant.product_id != item["product_id"]:
                        raise serializers.ValidationError(
                            {"error": "Product and variant do not match."}
                        )
                    if variant.product.deactive:
                        raise serializers.ValidationError(
                            {"error": "This product is not available."}
                        )

                    quantity = item["quantity"]
                    unit_price = self._variant_unit_price(variant)
                    line_total = (unit_price * Decimal(quantity)).quantize(
                        Decimal("0.01")
                    )
                    subtotal += line_total
                    requested_stock[variant.id] = (
                        requested_stock.get(variant.id, 0) + quantity
                    )
                    line_items.append(
                        {
                            "variant": variant,
                            "product": variant.product,
                            "quantity": quantity,
                            "unit_price": unit_price,
                            "line_total": line_total,
                        }
                    )

                for variant_id, quantity in requested_stock.items():
                    variant = variants[variant_id]
                    if variant.stock < quantity:
                        raise serializers.ValidationError(
                            {
                                "error": (
                                    f"Not enough stock for {variant.product.product_name} "
                                    f"({variant.size or variant.color_name or 'variant'})."
                                )
                            }
                        )

                discount = self._calculate_discount(redeem_code_obj, subtotal)
                total = max(subtotal - discount, Decimal("0.00")).quantize(
                    Decimal("0.01")
                )

                sale = Sales.objects.create(
                    costumer_name=user,
                    redeem_data=redeem_code_obj.name if redeem_code_obj else None,
                    shipping=shipping_instance,
                    discount=float(discount),
                    sub_total=float(subtotal),
                    total_amt=float(total),
                    transactionuid=transactionuid,
                    payment_method=payment_method,
                    expected_delivery_date=timezone.now().date()
                    + timedelta(days=get_delivery_estimate_days()),
                )

                for item in line_items:
                    Saled_Products.objects.create(
                        transition=sale,
                        product=item["product"],
                        variant=item["variant"],
                        price=float(item["unit_price"]),
                        qty=item["quantity"],
                        total=float(item["line_total"]),
                    )

                for variant_id, quantity in requested_stock.items():
                    variant = variants[variant_id]
                    variant.stock -= quantity
                    variant.save(update_fields=["stock"])

                if redeem_code_obj:
                    redeem_code_obj.used = (redeem_code_obj.used or 0) + 1
                    redeem_code_obj.save(update_fields=["used"])
        except serializers.ValidationError as exc:
            return Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        except IntegrityError:
            return Response(
                {"error": "This order has already been placed."},
                status=status.HTTP_409_CONFLICT,
            )

        email_sent = False
        try:
            context = get_invoice_details(sale, user.email)
            subject = f"Order Confirmation – #{sale.transactionuid}"
            body = render_to_string("invoice.html", context)
            email_sent = send_email(subject, user.email, body)
        except Exception as e:
            logger.error(f"Failed to send invoice email for {sale.transactionuid}: {e}")

        message = (
            "Order created and invoice sent."
            if email_sent
            else "Order created. Invoice email has been queued for retry."
        )
        return Response(
            {"success": message, "email_sent": email_sent},
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
                send_review_invitation_email_for_sale(updated_instance)
            except Exception as e:
                logger.error(
                    f"Failed to send review invitation email for "
                    f"{updated_instance.transactionuid}: {e}"
                )

        # Queue Pick & Drop only when a verified order is moved into shipping.
        if old_status == "verified" and new_status == "proceed":
            def queue_pickdrop_shipment():
                try:
                    pickdrop.queue_shipment_for_sale(updated_instance)
                except pickdrop.PickDropConfigurationError as e:
                    logger.warning(
                        "Pick & Drop shipment queue skipped for %s: %s",
                        updated_instance.transactionuid,
                        e,
                    )
                except pickdrop.PickDropError as e:
                    logger.error(
                        "Pick & Drop shipment queue failed for %s: %s",
                        updated_instance.transactionuid,
                        e,
                    )

            transaction.on_commit(queue_pickdrop_shipment)

    def _send_review_invitation_email(self, sale):
        return send_review_invitation_email_for_sale(sale)
        """Send an email inviting the customer to review their purchased products."""
        user = sale.costumer_name
        frontend_url = getattr(
            settings, "FRONTEND_URL", "https://nepanova.com"
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

    @action(detail=True, methods=["get"], url_path="shipment")
    def shipment_detail(self, request, pk=None):
        sale = self.get_object()
        shipment = getattr(sale, "shipment", None)
        if not shipment:
            return Response(
                {"error": "No shipment has been created for this order."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(ShipmentSerializer(shipment).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="create-shipment")
    def create_shipment(self, request, pk=None):
        sale = self.get_object()
        try:
            shipment = pickdrop.create_shipment_for_sale(sale)
        except pickdrop.PickDropError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ShipmentSerializer(shipment).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="retry-shipment")
    def retry_shipment(self, request, pk=None):
        sale = self.get_object()
        try:
            shipment = pickdrop.create_shipment_for_sale(sale, force=True)
        except pickdrop.PickDropError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ShipmentSerializer(shipment).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="sync-shipment")
    def sync_shipment(self, request, pk=None):
        sale = self.get_object()
        shipment = getattr(sale, "shipment", None)
        if not shipment:
            return Response(
                {"error": "No shipment has been created for this order."},
                status=status.HTTP_404_NOT_FOUND,
            )
        try:
            shipment = pickdrop.sync_shipment(shipment)
        except pickdrop.PickDropError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ShipmentSerializer(shipment).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="cancel-shipment")
    def cancel_shipment(self, request, pk=None):
        sale = self.get_object()
        shipment = getattr(sale, "shipment", None)
        if not shipment:
            return Response(
                {"error": "No shipment has been created for this order."},
                status=status.HTTP_404_NOT_FOUND,
            )
        try:
            shipment = pickdrop.cancel_shipment(shipment)
        except pickdrop.PickDropError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ShipmentSerializer(shipment).data, status=status.HTTP_200_OK)


def pickdrop_webhook_secret_matches(request):
    expected = getattr(settings, "PICKDROP_WEBHOOK_SECRET", "")
    if not expected:
        return False

    header_name = getattr(settings, "PICKDROP_WEBHOOK_SECRET_HEADER", "")
    if not header_name:
        return False
    candidate = request.headers.get(header_name, "")
    return bool(candidate) and secrets.compare_digest(str(candidate), str(expected))


class PickDropWebhookView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        if not pickdrop_webhook_secret_matches(request):
            return Response(
                {"error": "Invalid webhook secret."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            shipment = pickdrop.update_shipment_from_webhook(request.data)
        except pickdrop.PickDropAPIError as e:
            logger.warning("Pick & Drop webhook ignored: %s", e)
            response_status = (
                status.HTTP_202_ACCEPTED
                if "No local shipment found" in str(e)
                else status.HTTP_400_BAD_REQUEST
            )
            return Response({"error": str(e)}, status=response_status)

        return Response(
            {
                "status": "success",
                "shipment": ShipmentSerializer(shipment).data,
            },
            status=status.HTTP_200_OK,
        )


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
        return [HasRbacPermission("orders.manage")]

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

        if redeem_code.is_active is False:
            return Response(
                {"error": "Code is inactive"}, status=status.HTTP_400_BAD_REQUEST
            )

        if redeem_code.valid_until and redeem_code.valid_until < timezone.now().date():
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
