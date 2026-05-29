from django.db import models

from account.models import DeliveryAddress, User
from product.models import Product, ProductVariant


class Redeem_Code(models.Model):
    name = models.CharField(max_length=100, null=True, blank=True)
    code = models.CharField(max_length=100, unique=True, null=True, blank=True)
    type = models.CharField(
        max_length=10,
        choices=[("amount", "Amount"), ("percentage", "Percentage")],
        null=True,
        blank=True,
    )
    discount = models.IntegerField(null=True, blank=True)
    minimum = models.IntegerField(null=True, blank=True)
    limit = models.IntegerField(null=True, blank=True)
    used = models.IntegerField(null=True, blank=True, default=0)
    valid_until = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(null=True, blank=True)


class Sales(models.Model):
    costumer_name = models.ForeignKey(User, on_delete=models.SET_DEFAULT, default=None)
    transactionuid = models.CharField(max_length=225, null=True, blank=True)
    status = models.CharField(
        max_length=10,
        choices=[
            ("unpaid", "Unpaid"),
            ("pending", "Pending"),
            ("verified", "Verified"),
            ("proceed", "Proceed"),
            ("packed", "Packed"),
            ("delivered", "Delivered"),
            ("successful", "Successful"),
            ("cancelled", "Cancelled"),
        ],
        default="pending",
    )
    total_amt = models.FloatField()
    sub_total = models.FloatField()
    shipping = models.ForeignKey(
        DeliveryAddress,
        on_delete=models.SET_DEFAULT,
        null=True,
        blank=True,
        default=None,
    )
    discount = models.FloatField(null=True, blank=True)
    payment_method = models.CharField(max_length=100, null=True, blank=True)
    redeem_data = models.CharField(max_length=100, null=True, blank=True)
    payment_intent_id = models.CharField(max_length=100, null=True, blank=True)
    payment_json = models.TextField(null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)
    expected_delivery_date = models.DateField(null=True, blank=True)
    delivery_delay_reason = models.TextField(null=True, blank=True)


class Shipment(models.Model):
    PROVIDER_PICKDROP = "pickdrop"

    STATUS_PENDING = "pending"
    STATUS_CREATING = "creating"
    STATUS_BOOKED = "booked"
    STATUS_ASSIGNED = "assigned"
    STATUS_PICKED_UP = "picked_up"
    STATUS_IN_TRANSIT = "in_transit"
    STATUS_OUT_FOR_DELIVERY = "out_for_delivery"
    STATUS_DELIVERED = "delivered"
    STATUS_FAILED = "failed"
    STATUS_RETURNED = "returned"
    STATUS_CANCELLED = "cancelled"
    STATUS_SYNC_FAILED = "sync_failed"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_CREATING, "Creating"),
        (STATUS_BOOKED, "Booked"),
        (STATUS_ASSIGNED, "Assigned"),
        (STATUS_PICKED_UP, "Picked up"),
        (STATUS_IN_TRANSIT, "In transit"),
        (STATUS_OUT_FOR_DELIVERY, "Out for delivery"),
        (STATUS_DELIVERED, "Delivered"),
        (STATUS_FAILED, "Failed"),
        (STATUS_RETURNED, "Returned"),
        (STATUS_CANCELLED, "Cancelled"),
        (STATUS_SYNC_FAILED, "Sync failed"),
    ]

    sale = models.OneToOneField(
        Sales, on_delete=models.CASCADE, related_name="shipment"
    )
    provider = models.CharField(max_length=50, default=PROVIDER_PICKDROP)
    provider_order_id = models.CharField(max_length=100, null=True, blank=True)
    tracking_number = models.CharField(max_length=100, null=True, blank=True)
    tracking_url = models.URLField(max_length=500, null=True, blank=True)
    waybill_number = models.CharField(max_length=100, null=True, blank=True)
    label_url = models.URLField(max_length=500, null=True, blank=True)
    status = models.CharField(
        max_length=30, choices=STATUS_CHOICES, default=STATUS_PENDING
    )
    provider_status = models.CharField(max_length=100, null=True, blank=True)
    package_type = models.CharField(max_length=100, null=True, blank=True)
    cod_amount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    pickup_payload = models.JSONField(default=dict, blank=True)
    drop_payload = models.JSONField(default=dict, blank=True)
    request_payload = models.JSONField(default=dict, blank=True)
    response_payload = models.JSONField(default=dict, blank=True)
    webhook_payload = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(null=True, blank=True)
    retry_count = models.PositiveIntegerField(default=0)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["provider", "provider_order_id"]),
            models.Index(fields=["tracking_number"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return self.tracking_number or self.provider_order_id or str(self.sale_id)


class ShipmentEvent(models.Model):
    EVENT_CREATED = "created"
    EVENT_SYNC = "sync"
    EVENT_WEBHOOK = "webhook"
    EVENT_CANCEL = "cancel"
    EVENT_ERROR = "error"

    shipment = models.ForeignKey(
        Shipment, on_delete=models.CASCADE, related_name="events"
    )
    event_type = models.CharField(max_length=50)
    provider_status = models.CharField(max_length=100, null=True, blank=True)
    message = models.TextField(null=True, blank=True)
    payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["event_type"]),
            models.Index(fields=["provider_status"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"{self.event_type} - {self.shipment_id}"


class Saled_Products(models.Model):
    transition = models.ForeignKey(
        Sales, on_delete=models.CASCADE, null=True, blank=True, related_name="products"
    )
    product = models.ForeignKey(
        Product, on_delete=models.SET_DEFAULT, null=True, default=None
    )
    variant = models.ForeignKey(
        ProductVariant, on_delete=models.SET_DEFAULT, null=True, default=None
    )
    price = models.FloatField()
    qty = models.FloatField()
    total = models.FloatField()
