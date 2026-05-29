import logging
import re
from datetime import timedelta
from decimal import Decimal

import requests
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from sales.models import Sales, Shipment, ShipmentEvent

logger = logging.getLogger(__name__)


class PickDropError(Exception):
    """Base Pick & Drop integration error."""


class PickDropConfigurationError(PickDropError):
    """Raised when required Pick & Drop settings are missing."""


class PickDropAPIError(PickDropError):
    """Raised when Pick & Drop returns an error or unreachable response."""

    def __init__(self, message, response_payload=None, status_code=None):
        super().__init__(message)
        self.response_payload = response_payload or {}
        self.status_code = status_code


PICKDROP_STATUS_MAP = {
    "open": Shipment.STATUS_BOOKED,
    "package_pickup_assigned": Shipment.STATUS_ASSIGNED,
    "package_pickup_1st_attempt_failed": Shipment.STATUS_FAILED,
    "package_pickup_reattempt_failed": Shipment.STATUS_FAILED,
    "package_pickup_success": Shipment.STATUS_PICKED_UP,
    "waiting_for_drop_off": Shipment.STATUS_IN_TRANSIT,
    "package_arrived_at_hub": Shipment.STATUS_IN_TRANSIT,
    "package_received_at_hub": Shipment.STATUS_IN_TRANSIT,
    "received_at_lastmile_station": Shipment.STATUS_IN_TRANSIT,
    "package_ready_to_dispatch_last_mile_station": Shipment.STATUS_IN_TRANSIT,
    "package_dispatched_to_last_mile_station_transporter": Shipment.STATUS_IN_TRANSIT,
    "package_stationed_in_from_transporter": Shipment.STATUS_IN_TRANSIT,
    "ready_for_dispatched_last_mile_hero": Shipment.STATUS_IN_TRANSIT,
    "out_for_delivery": Shipment.STATUS_OUT_FOR_DELIVERY,
    "about_to_deliver": Shipment.STATUS_OUT_FOR_DELIVERY,
    "1st_attempt_failed": Shipment.STATUS_FAILED,
    "package_redelivery": Shipment.STATUS_OUT_FOR_DELIVERY,
    "package_reattempts_failed": Shipment.STATUS_FAILED,
    "delivered": Shipment.STATUS_DELIVERED,
    "delivery_failed_and_cancelled": Shipment.STATUS_FAILED,
    "return_at_transit_hub": Shipment.STATUS_RETURNED,
    "package_returned_from_transit_hub_to_transporter": Shipment.STATUS_RETURNED,
    "received_from_transporter_to_dispatched_hub": Shipment.STATUS_RETURNED,
    "fd_package_ready_to_return_to_shipper": Shipment.STATUS_RETURNED,
    "package_returned": Shipment.STATUS_RETURNED,
    "package_returned_from_lastmile_sation_to_transporter": Shipment.STATUS_RETURNED,
    "cr_package_ready_to_delivered_to_qcc": Shipment.STATUS_RETURNED,
    "cancelled": Shipment.STATUS_CANCELLED,
    "canceled": Shipment.STATUS_CANCELLED,
}


def pickdrop_enabled():
    return bool(getattr(settings, "PICKDROP_ENABLED", False))


def normalize_pickdrop_status(status_value):
    raw_status = (status_value or "").strip()
    normalized = raw_status.lower().replace(" ", "_")
    if normalized in PICKDROP_STATUS_MAP:
        return PICKDROP_STATUS_MAP[normalized]
    if "delivered" == normalized:
        return Shipment.STATUS_DELIVERED
    if "return" in normalized:
        return Shipment.STATUS_RETURNED
    if "cancel" in normalized:
        return Shipment.STATUS_CANCELLED
    if "failed" in normalized:
        return Shipment.STATUS_FAILED
    if "dispatch" in normalized or "hub" in normalized or "transit" in normalized:
        return Shipment.STATUS_IN_TRANSIT
    return Shipment.STATUS_BOOKED


def parse_tracking_number(tracking_url):
    if not tracking_url:
        return ""
    last_segment = str(tracking_url).rstrip("/").split("/")[-1]
    if last_segment.startswith("PND"):
        return last_segment
    match = re.search(r"(PND[-A-Z0-9]+(?:-[A-Z0-9]+)*)", str(tracking_url), re.I)
    return match.group(1).upper() if match else ""


def normalize_phone(phone):
    digits = re.sub(r"\D+", "", phone or "")
    if len(digits) > 10:
        digits = digits[-10:]
    if len(digits) != 10:
        raise PickDropAPIError("Pick & Drop requires a 10 digit customer phone number.")
    return digits


def money_to_decimal(value):
    if value in (None, ""):
        return Decimal("0")
    return Decimal(str(value)).quantize(Decimal("0.01"))


def sale_customer_name(sale):
    user = sale.costumer_name
    full_name = f"{user.first_name or ''} {user.last_name or ''}".strip()
    return full_name or user.username or user.email


def sale_description(sale):
    items = []
    for item in sale.products.select_related("product").all():
        if item.product:
            qty = int(item.qty) if float(item.qty).is_integer() else item.qty
            items.append(f"{qty} x {item.product.product_name}")
    return ", ".join(items)[:250] or f"Order {sale.transactionuid}"


def default_dimensions():
    length = getattr(settings, "PICKDROP_DEFAULT_PACKAGE_LENGTH", 0)
    width = getattr(settings, "PICKDROP_DEFAULT_PACKAGE_WIDTH", 0)
    height = getattr(settings, "PICKDROP_DEFAULT_PACKAGE_HEIGHT", 0)
    if not all([length, width, height]):
        return None
    return {
        "length": length,
        "width": width,
        "height": height,
        "unit": getattr(settings, "PICKDROP_DEFAULT_DIMENSION_UNIT", "cm") or "cm",
    }


def build_order_payload(sale):
    shipping = sale.shipping
    if not shipping:
        raise PickDropAPIError("Order has no shipping address.")

    customer_phone = normalize_phone(shipping.phone)
    destination_branch = (
        getattr(settings, "PICKDROP_DEFAULT_DESTINATION_BRANCH", "") or shipping.city
    )
    destination_area = (
        getattr(settings, "PICKDROP_DEFAULT_DESTINATION_CITY_AREA", "")
        or shipping.city
        or shipping.address
    )
    business_address = getattr(settings, "PICKDROP_BUSINESS_ADDRESS", "")

    payload = {
        "vendorTrackingNumber": sale.transactionuid,
        "codAmount": float(money_to_decimal(sale.total_amt)),
        "orderDescription": sale_description(sale),
        "customerName": sale_customer_name(sale),
        "landmark": shipping.address,
        "primaryMobileNo": customer_phone,
        "destinationBranch": destination_branch,
        "destinationCityArea": destination_area,
        "weight": getattr(settings, "PICKDROP_DEFAULT_PACKAGE_WEIGHT", 1.0),
        "orderType": getattr(settings, "PICKDROP_DEFAULT_ORDER_TYPE", "Regular")
        or "Regular",
        "instruction": getattr(settings, "PICKDROP_DEFAULT_INSTRUCTION", ""),
        "ref": getattr(settings, "PICKDROP_REF", "") or sale.transactionuid,
    }

    if business_address:
        payload["businessAddress"] = business_address

    dim_weight = default_dimensions()
    if dim_weight:
        payload["dimWeight"] = dim_weight

    return payload


def extract_message(response_payload):
    data = response_payload.get("data")
    if isinstance(data, dict) and "status" in data:
        return data
    message = response_payload.get("message", response_payload)
    if isinstance(message, dict):
        return message
    return {"status": "error", "message": str(message)}


class PickDropClient:
    def __init__(self):
        self.base_url = getattr(settings, "PICKDROP_BASE_URL", "").rstrip("/")
        self.api_key = getattr(settings, "PICKDROP_API_KEY", "")
        self.api_secret = getattr(settings, "PICKDROP_API_SECRET", "")
        self.timeout = getattr(settings, "PICKDROP_TIMEOUT_SECONDS", 15)

        if not self.base_url or not self.api_key or not self.api_secret:
            raise PickDropConfigurationError("Pick & Drop API settings are incomplete.")

    @property
    def headers(self):
        return {
            "Authorization": f"token {self.api_key}:{self.api_secret}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def request(self, method, path, *, json=None, params=None):
        url = f"{self.base_url}{path}"
        try:
            response = requests.request(
                method,
                url,
                headers=self.headers,
                json=json,
                params=params,
                timeout=self.timeout,
            )
        except requests.RequestException as exc:
            raise PickDropAPIError(f"Pick & Drop request failed: {exc}") from exc

        try:
            payload = response.json()
        except ValueError as exc:
            raise PickDropAPIError(
                "Pick & Drop returned a non-JSON response.",
                {"raw": response.text[:500]},
                response.status_code,
            ) from exc

        if response.status_code >= 400:
            message = extract_message(payload).get("message") or response.reason
            raise PickDropAPIError(message, payload, response.status_code)

        message = extract_message(payload)
        if str(message.get("status", "")).lower() not in {"", "success"}:
            raise PickDropAPIError(
                message.get("message", "Pick & Drop returned an error."),
                payload,
                response.status_code,
            )

        return payload

    def create_order(self, payload):
        return self.request(
            "POST", "/api/method/logi360.api.create_order", json=payload
        )

    def cancel_order(self, order_id):
        return self.request(
            "PUT",
            "/api/method/logi360.api.cancel_order",
            json={"orderID": order_id},
        )

    def get_order_details(self, order_id):
        return self.request(
            "GET",
            "/api/method/logi360.api.get_order_details",
            params={"order_id": order_id},
        )

    def create_pickup_notification(self, vendor_address):
        return self.request(
            "POST",
            "/api/v2/method/logi360.api.pickup_notification",
            json={"vendor_address": vendor_address},
        )


def shipment_event(shipment, event_type, *, provider_status="", message="", payload=None):
    return ShipmentEvent.objects.create(
        shipment=shipment,
        event_type=event_type,
        provider_status=provider_status or "",
        message=message or "",
        payload=payload or {},
    )


def apply_order_delivery_status(shipment):
    sale = shipment.sale
    if shipment.status != Shipment.STATUS_DELIVERED:
        return
    if sale.status in ("delivered", "successful", "cancelled", "unpaid"):
        return
    sale.status = "delivered"
    sale.save(update_fields=["status", "updated_at"])
    send_review_invitation_email(sale)


def send_review_invitation_email(sale):
    # Import lazily to avoid a module cycle with sales.views.
    try:
        from sales.views import send_review_invitation_email_for_sale

        send_review_invitation_email_for_sale(sale)
    except Exception as exc:
        logger.error(
            "Failed to send review invitation email for %s after courier delivery: %s",
            sale.transactionuid,
            exc,
        )


def update_shipment_from_pickdrop_data(shipment, data, response_payload):
    provider_order_id = data.get("orderID") or data.get("order_name") or data.get("name")
    tracking_url = data.get("tracking_url") or shipment.tracking_url
    tracking_number = (
        data.get("tracking_number")
        or data.get("tracking_no")
        or parse_tracking_number(tracking_url)
        or shipment.tracking_number
    )
    provider_status = data.get("status") or shipment.provider_status

    shipment.provider_order_id = provider_order_id or shipment.provider_order_id
    shipment.tracking_url = tracking_url or shipment.tracking_url
    shipment.tracking_number = tracking_number or shipment.tracking_number
    shipment.waybill_number = data.get("waybill_number") or shipment.waybill_number
    shipment.provider_status = provider_status
    shipment.status = normalize_pickdrop_status(provider_status)
    shipment.response_payload = response_payload
    shipment.error_message = ""
    shipment.last_synced_at = timezone.now()
    shipment.save(
        update_fields=[
            "provider_order_id",
            "tracking_url",
            "tracking_number",
            "waybill_number",
            "provider_status",
            "status",
            "response_payload",
            "error_message",
            "last_synced_at",
            "updated_at",
        ]
    )
    apply_order_delivery_status(shipment)
    return shipment


def queue_shipment_for_sale(sale, *, force=False):
    if not pickdrop_enabled():
        raise PickDropConfigurationError("Pick & Drop integration is disabled.")

    sale = Sales.objects.select_related("shipping", "costumer_name").get(pk=sale.pk)
    with transaction.atomic():
        shipment, created = Shipment.objects.select_for_update().get_or_create(
            sale=sale,
            defaults={
                "provider": Shipment.PROVIDER_PICKDROP,
                "status": Shipment.STATUS_PENDING,
                "cod_amount": money_to_decimal(sale.total_amt),
            },
        )

        if shipment.provider_order_id and not force:
            return shipment

        if shipment.status == Shipment.STATUS_CREATING and not force:
            return shipment

        if (
            not created
            and shipment.status
            not in {
                Shipment.STATUS_PENDING,
                Shipment.STATUS_FAILED,
                Shipment.STATUS_SYNC_FAILED,
            }
            and not force
        ):
            return shipment

        if not created:
            shipment.status = Shipment.STATUS_PENDING
            shipment.error_message = ""
            shipment.save(update_fields=["status", "error_message", "updated_at"])

    return shipment


def process_shipment(shipment, *, force=False):
    if not pickdrop_enabled():
        raise PickDropConfigurationError("Pick & Drop integration is disabled.")

    with transaction.atomic():
        shipment = (
            Shipment.objects.select_for_update()
            .select_related("sale", "sale__shipping", "sale__costumer_name")
            .get(pk=shipment.pk)
        )

        if (
            not force
            and shipment.provider_order_id
            and shipment.status not in {Shipment.STATUS_FAILED, Shipment.STATUS_SYNC_FAILED}
        ):
            return shipment

        if shipment.status == Shipment.STATUS_CREATING and not force:
            stale_after = timezone.now() - timedelta(minutes=15)
            if shipment.updated_at and shipment.updated_at > stale_after:
                return shipment

        shipment.status = Shipment.STATUS_CREATING
        shipment.retry_count += 1
        shipment.error_message = ""
        shipment.save(
            update_fields=[
                "status",
                "retry_count",
                "error_message",
                "updated_at",
            ]
        )

    sale = shipment.sale

    request_payload = build_order_payload(sale)
    client = PickDropClient()

    try:
        response_payload = client.create_order(request_payload)
        message = extract_message(response_payload)
        data = message.get("data") or {}
        shipment.request_payload = request_payload
        shipment.pickup_payload = {
            "businessAddress": request_payload.get("businessAddress", "")
        }
        shipment.drop_payload = {
            "customerName": request_payload.get("customerName"),
            "primaryMobileNo": request_payload.get("primaryMobileNo"),
            "destinationBranch": request_payload.get("destinationBranch"),
            "destinationCityArea": request_payload.get("destinationCityArea"),
            "landmark": request_payload.get("landmark"),
        }
        shipment.package_type = request_payload.get("orderType")
        shipment.cod_amount = money_to_decimal(request_payload.get("codAmount"))
        shipment.save(
            update_fields=[
                "request_payload",
                "pickup_payload",
                "drop_payload",
                "package_type",
                "cod_amount",
                "updated_at",
            ]
        )
        update_shipment_from_pickdrop_data(shipment, data, response_payload)
        shipment_event(
            shipment,
            ShipmentEvent.EVENT_CREATED,
            provider_status=shipment.provider_status,
            message=message.get("message", "Pick & Drop order created."),
            payload=response_payload,
        )
        return shipment
    except PickDropError as exc:
        shipment.status = Shipment.STATUS_FAILED
        shipment.error_message = str(exc)
        shipment.request_payload = request_payload
        if isinstance(exc, PickDropAPIError):
            shipment.response_payload = exc.response_payload
        shipment.last_synced_at = timezone.now()
        shipment.save(
            update_fields=[
                "status",
                "error_message",
                "request_payload",
                "response_payload",
                "last_synced_at",
                "updated_at",
            ]
        )
        shipment_event(
            shipment,
            ShipmentEvent.EVENT_ERROR,
            message=str(exc),
            payload=getattr(exc, "response_payload", {}) or {},
        )
        raise


def create_shipment_for_sale(sale, *, force=False):
    shipment = queue_shipment_for_sale(sale, force=force)
    return process_shipment(shipment, force=force)


def process_pending_shipments(*, limit=20):
    queryset = (
        Shipment.objects.select_related("sale", "sale__shipping", "sale__costumer_name")
        .filter(
            provider=Shipment.PROVIDER_PICKDROP,
            provider_order_id__isnull=True,
            status__in=[
                Shipment.STATUS_PENDING,
                Shipment.STATUS_FAILED,
                Shipment.STATUS_SYNC_FAILED,
            ],
        )
        .order_by("created_at")[:limit]
    )

    processed = 0
    failed = 0
    for shipment in queryset:
        try:
            process_shipment(shipment)
            processed += 1
        except PickDropError:
            failed += 1
    return {"processed": processed, "failed": failed}


def sync_shipment(shipment):
    if not shipment.provider_order_id:
        raise PickDropAPIError("Shipment has no Pick & Drop order id.")
    client = PickDropClient()
    response_payload = client.get_order_details(shipment.provider_order_id)
    message = extract_message(response_payload)
    data = message.get("data") or []
    order_data = data[0] if isinstance(data, list) and data else data
    if not isinstance(order_data, dict):
        raise PickDropAPIError("Pick & Drop order details response is empty.")
    update_shipment_from_pickdrop_data(shipment, order_data, response_payload)
    shipment_event(
        shipment,
        ShipmentEvent.EVENT_SYNC,
        provider_status=shipment.provider_status,
        message=message.get("message", "Pick & Drop order synced."),
        payload=response_payload,
    )
    return shipment


def cancel_shipment(shipment):
    if not shipment.provider_order_id:
        raise PickDropAPIError("Shipment has no Pick & Drop order id.")
    client = PickDropClient()
    response_payload = client.cancel_order(shipment.provider_order_id)
    message = extract_message(response_payload)
    shipment.status = Shipment.STATUS_CANCELLED
    shipment.provider_status = Shipment.STATUS_CANCELLED
    shipment.response_payload = response_payload
    shipment.error_message = ""
    shipment.last_synced_at = timezone.now()
    shipment.save(
        update_fields=[
            "status",
            "provider_status",
            "response_payload",
            "error_message",
            "last_synced_at",
            "updated_at",
        ]
    )
    shipment_event(
        shipment,
        ShipmentEvent.EVENT_CANCEL,
        provider_status=shipment.provider_status,
        message=message.get("message", "Pick & Drop order cancelled."),
        payload=response_payload,
    )
    return shipment


def update_shipment_from_webhook(payload):
    tracking_number = (payload.get("tracking_number") or "").strip()
    provider_status = (payload.get("status") or "").strip()
    if not tracking_number:
        raise PickDropAPIError("Webhook payload is missing tracking_number.")
    if not provider_status:
        raise PickDropAPIError("Webhook payload is missing status.")

    shipment = Shipment.objects.filter(tracking_number=tracking_number).first()
    if not shipment:
        raise PickDropAPIError(
            f"No local shipment found for tracking number {tracking_number}."
        )

    shipment.provider_status = provider_status
    shipment.status = normalize_pickdrop_status(provider_status)
    shipment.package_type = payload.get("package_type") or shipment.package_type
    shipment.webhook_payload = payload
    shipment.error_message = payload.get("comments") or ""
    shipment.last_synced_at = timezone.now()
    shipment.save(
        update_fields=[
            "provider_status",
            "status",
            "package_type",
            "webhook_payload",
            "error_message",
            "last_synced_at",
            "updated_at",
        ]
    )
    shipment_event(
        shipment,
        ShipmentEvent.EVENT_WEBHOOK,
        provider_status=provider_status,
        message=payload.get("comments", ""),
        payload=payload,
    )
    apply_order_delivery_status(shipment)
    return shipment
