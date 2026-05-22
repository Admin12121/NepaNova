from rest_framework import serializers

from .models import Booking


class BookingCreateSerializer(serializers.ModelSerializer):
    """Serializer for public booking creation (customer-facing)"""

    class Meta:
        model = Booking
        fields = [
            "name",
            "email",
            "phone_number",
            "location",
            "measurement_type",
            "preferred_date",
            "preferred_time",
            "customer_notes",
            "coat_measurements",
            "pant_measurements",
            "shirt_measurements",
        ]


class BookingListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list view"""

    has_measurements = serializers.SerializerMethodField()
    has_bill = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            "id",
            "name",
            "email",
            "phone_number",
            "location",
            "measurement_type",
            "preferred_date",
            "preferred_time",
            "status",
            "bill_number",
            "delivery_date",
            "has_measurements",
            "has_bill",
            "created_at",
        ]

    def get_has_measurements(self, obj):
        return obj.has_measurements()

    def get_has_bill(self, obj):
        return bool(obj.bill_data)


class BookingDetailSerializer(serializers.ModelSerializer):
    """Full serializer for booking details with measurements"""

    has_measurements = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            "id",
            # Customer info
            "name",
            "email",
            "phone_number",
            "location",
            "measurement_type",
            "preferred_date",
            "preferred_time",
            "customer_notes",
            # Admin info
            "status",
            "bill_number",
            "delivery_date",
            "admin_message",
            # Bill data
            "bill_data",
            # Coat measurements
            "coat_measurements",
            "coat_bill_number",
            "coat_date",
            # Pant measurements
            "pant_measurements",
            "pant_bill_number",
            "pant_date",
            # Shirt measurements
            "shirt_measurements",
            "shirt_bill_number",
            "shirt_date",
            # Meta
            "has_measurements",
            "created_at",
            "updated_at",
            "measurement_completed_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_has_measurements(self, obj):
        return obj.has_measurements()


class BookingMeasurementUpdateSerializer(serializers.ModelSerializer):
    """Serializer for admin to update measurements"""

    class Meta:
        model = Booking
        fields = [
            "status",
            "bill_number",
            "delivery_date",
            "admin_message",
            "coat_measurements",
            "coat_bill_number",
            "coat_date",
            "pant_measurements",
            "pant_bill_number",
            "pant_date",
            "shirt_measurements",
            "shirt_bill_number",
            "shirt_date",
            "measurement_completed_at",
        ]


class BillUpdateSerializer(serializers.ModelSerializer):
    """Serializer for admin to create/update bill data"""

    class Meta:
        model = Booking
        fields = ["bill_data"]

    def validate_bill_data(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("bill_data must be a JSON object.")
        # Validate required keys
        required_keys = ["items"]
        for key in required_keys:
            if key not in value:
                raise serializers.ValidationError(f"bill_data must contain '{key}'.")
        # Validate items is a list
        if not isinstance(value.get("items"), list):
            raise serializers.ValidationError("'items' must be a list.")
        return value


class CustomerLookupSerializer(serializers.Serializer):
    """Serializer for customer lookup"""

    query = serializers.CharField(
        max_length=100, help_text="Phone number, email, or name"
    )
