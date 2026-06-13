from rest_framework import serializers
from .models import *
from account.serializers import DeliveryAddressSerializer

class RedeemSerializer(serializers.ModelSerializer):
    class Meta:
        model = Redeem_Code
        fields = [
            "id",
            "name",
            "code",
            "type",
            "discount",
            "minimum",
            "limit",
            "used",
            "valid_until",
            "is_active",
        ]

class Saled_ProductsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Saled_Products
        fields = [
            "id",
            "transition",
            "product",
            "variant",
            "price",
            "qty",
            "total",
        ]


class ShipmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shipment
        fields = [
            "id",
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
            "error_message",
            "retry_count",
            "last_synced_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class ShipmentEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShipmentEvent
        fields = [
            "id",
            "event_type",
            "provider_status",
            "message",
            "payload",
            "created_at",
        ]
        read_only_fields = fields


class SaleQuertSetSerializer(serializers.ModelSerializer):
    shipping = DeliveryAddressSerializer(read_only=True)
    shipment = ShipmentSerializer(read_only=True)
    created_by_email = serializers.EmailField(source="created_by.email", read_only=True)
    created_by_name = serializers.SerializerMethodField()
    costumer_email = serializers.EmailField(source="costumer_name.email", read_only=True)
    costumer_full_name = serializers.SerializerMethodField()

    class Meta:
        model = Sales
        fields = [
            "id",
            "costumer_name",
            "created_by",
            "created_by_email",
            "created_by_name",
            "costumer_email",
            "costumer_full_name",
            "transactionuid",
            "status",
            "total_amt",
            "sub_total",
            "shipping",
            "discount",
            "payment_method",
            "redeem_data",
            "payment_intent_id",
            "payment_json",
            "order_source",
            "direct_purchase",
            "created",
            "updated_at",
            "expected_delivery_date",
            "delivery_delay_reason",
            "shipment",
        ]
        read_only_fields = [
            "created_by_email",
            "created_by_name",
            "costumer_email",
            "costumer_full_name",
            "shipment",
        ]

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return None
        full_name = " ".join(
            value
            for value in [obj.created_by.first_name, obj.created_by.last_name]
            if value
        )
        return full_name or obj.created_by.username or obj.created_by.email

    def get_costumer_full_name(self, obj):
        user = obj.costumer_name
        if not user:
            return None
        full_name = " ".join(
            value for value in [user.first_name, user.last_name] if value
        )
        return full_name or user.username or user.email


class SalesDataSerializer(serializers.ModelSerializer):
    products = Saled_ProductsSerializer(many=True, read_only=True)
    costumer_name = serializers.SlugRelatedField(read_only=True, slug_field='username')
    shipping = DeliveryAddressSerializer(read_only=True)
    shipment = ShipmentSerializer(read_only=True)
    created_by_email = serializers.EmailField(source="created_by.email", read_only=True)
    created_by_name = serializers.SerializerMethodField()
    costumer_email = serializers.EmailField(source="costumer_name.email", read_only=True)
    costumer_full_name = serializers.SerializerMethodField()

    class Meta:
        model = Sales
        fields = [
            "id",
            "costumer_name",
            "created_by",
            "created_by_email",
            "created_by_name",
            "costumer_email",
            "costumer_full_name",
            "transactionuid",
            "status",
            "total_amt",
            "sub_total",
            "shipping",
            "discount",
            "payment_method",
            "redeem_data",
            "payment_intent_id",
            "payment_json",
            "order_source",
            "direct_purchase",
            "created",
            "updated_at",
            "expected_delivery_date",
            "delivery_delay_reason",
            "products",
            "shipment",
        ]
        read_only_fields = [
            "created_by",
            "created_by_email",
            "created_by_name",
            "costumer_email",
            "costumer_full_name",
            "products",
            "shipment",
        ]

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return None
        full_name = " ".join(
            value
            for value in [obj.created_by.first_name, obj.created_by.last_name]
            if value
        )
        return full_name or obj.created_by.username or obj.created_by.email

    def get_costumer_full_name(self, obj):
        user = obj.costumer_name
        if not user:
            return None
        full_name = " ".join(
            value for value in [user.first_name, user.last_name] if value
        )
        return full_name or user.username or user.email

class SalesPostDataSerializer(serializers.ModelSerializer):
    products = Saled_ProductsSerializer(many=True, read_only=True)
    costumer_name = serializers.SlugRelatedField(read_only=True, slug_field='username')

    class Meta:
        model = Sales
        fields = [
            "id",
            "costumer_name",
            "transactionuid",
            "status",
            "total_amt",
            "sub_total",
            "shipping",
            "discount",
            "payment_method",
            "redeem_data",
            "payment_intent_id",
            "payment_json",
            "order_source",
            "direct_purchase",
            "created",
            "updated_at",
            "expected_delivery_date",
            "delivery_delay_reason",
            "products",
        ]



