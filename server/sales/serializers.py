from rest_framework import serializers
from .models import *
from account.serializers import DeliveryAddressSerializer

class RedeemSerializer(serializers.ModelSerializer):
    class Meta:
        model = Redeem_Code
        fields = "__all__"

class Saled_ProductsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Saled_Products
        fields = "__all__"


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
    class Meta:
        model = Sales
        fields = "__all__"

class SalesDataSerializer(serializers.ModelSerializer):
    products = Saled_ProductsSerializer(many=True, read_only=True)
    costumer_name = serializers.SlugRelatedField(read_only=True, slug_field='username')
    shipping = DeliveryAddressSerializer(read_only=True)
    shipment = ShipmentSerializer(read_only=True)
    class Meta:
        model = Sales
        fields = "__all__"

class SalesPostDataSerializer(serializers.ModelSerializer):
    products = Saled_ProductsSerializer(many=True, read_only=True)
    costumer_name = serializers.SlugRelatedField(read_only=True, slug_field='username')

    class Meta:
        model = Sales
        fields = "__all__"



