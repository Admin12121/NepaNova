from django.contrib import admin
from .models import Redeem_Code, Sales, Saled_Products, Shipment, ShipmentEvent

class SaledProductsInline(admin.TabularInline):
    model = Saled_Products
    extra = 0
    readonly_fields = ('product', 'variant', 'price', 'qty', 'total')

@admin.register(Sales)
class SalesAdmin(admin.ModelAdmin):
    list_display = ('id', 'transactionuid', 'costumer_name', 'status', 'total_amt', 'payment_method', 'created')
    list_filter = ('status', 'payment_method', 'created')
    search_fields = ('transactionuid', 'costumer_name__email', 'costumer_name__first_name')
    inlines = [SaledProductsInline]
    readonly_fields = ('costumer_name', 'transactionuid', 'total_amt', 'sub_total', 'shipping', 'discount', 'payment_method', 'redeem_data', 'payment_intent_id', 'payment_json', 'created', 'updated_at')

    def has_add_permission(self, request):
        return False

@admin.register(Redeem_Code)
class RedeemCodeAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'type', 'discount', 'minimum', 'limit', 'used', 'valid_until', 'is_active')
    list_filter = ('type', 'is_active')
    search_fields = ('code', 'name')


class ShipmentEventInline(admin.TabularInline):
    model = ShipmentEvent
    extra = 0
    readonly_fields = (
        "event_type",
        "provider_status",
        "message",
        "payload",
        "created_at",
    )
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Shipment)
class ShipmentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "sale",
        "provider",
        "provider_order_id",
        "tracking_number",
        "status",
        "provider_status",
        "retry_count",
        "last_synced_at",
    )
    list_filter = ("provider", "status", "provider_status", "created_at")
    search_fields = (
        "sale__transactionuid",
        "provider_order_id",
        "tracking_number",
    )
    readonly_fields = (
        "sale",
        "provider",
        "provider_order_id",
        "tracking_number",
        "tracking_url",
        "waybill_number",
        "label_url",
        "status",
        "provider_status",
        "package_type",
        "cod_amount",
        "pickup_payload",
        "drop_payload",
        "request_payload",
        "response_payload",
        "webhook_payload",
        "error_message",
        "retry_count",
        "last_synced_at",
        "created_at",
        "updated_at",
    )
    inlines = [ShipmentEventInline]

    def has_add_permission(self, request):
        return False
