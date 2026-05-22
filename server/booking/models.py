from django.db import models


class Booking(models.Model):
    """
    Unified booking and measurement model.
    Customer fills basic info, admin fills measurements.
    """

    MEASUREMENT_TYPE_CHOICES = [
        ("in_store", "In-Store"),
        ("home_visit", "Home Visit"),
        ("self", "Self"),
    ]

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("confirmed", "Confirmed"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
        ("delivered", "Delivered"),
        ("cancelled", "Cancelled"),
    ]

    # Customer Info (filled by user)
    name = models.CharField(max_length=255)
    email = models.EmailField(default="noemail@example.com")
    phone_number = models.CharField(max_length=20)
    location = models.CharField(max_length=500)
    measurement_type = models.CharField(
        max_length=20, choices=MEASUREMENT_TYPE_CHOICES, default="in_store"
    )
    preferred_date = models.DateField()
    preferred_time = models.TimeField()
    customer_notes = models.TextField(blank=True, null=True)

    # Status and Admin Info
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    bill_number = models.CharField(max_length=50, unique=True, blank=True, null=True)
    delivery_date = models.DateField(null=True, blank=True)
    admin_message = models.TextField(blank=True, null=True)

    # Bill / Order Slip Data (JSON format)
    # Stores: items (list of {sn, description, qty, rate, amount_rs, amount_ps}),
    #         total_rs, total_ps, advance_rs, advance_ps, balance_rs, balance_ps,
    #         amount_in_words, date_ordered, date_delivery
    bill_data = models.JSONField(default=dict, blank=True)

    # Coat & Safari, W. Coat Measurements (JSON format)
    # Each measurement has A and B columns
    # Measurements: L (Length), C (Chest), W (Waist), H (Hips),
    #               S (Shoulder), B (Back), SL (Sleeve Length), N (Neck)
    coat_measurements = models.JSONField(default=dict, blank=True)
    coat_bill_number = models.CharField(max_length=50, blank=True, null=True)
    coat_date = models.DateField(null=True, blank=True)

    # Pant Measurements (JSON format)
    # Measurements: L (Length), W (Waist), H (Hips), T (Thigh),
    #               HIL, K (Knee), B (Bottom)
    pant_measurements = models.JSONField(default=dict, blank=True)
    pant_bill_number = models.CharField(max_length=50, blank=True, null=True)
    pant_date = models.DateField(null=True, blank=True)

    # Shirt Measurements (JSON format)
    # Measurements: L (Length), C (Chest), W (Waist), H (Hips),
    #               S (Shoulder), SL (Sleeve Length), N (Neck)
    shirt_measurements = models.JSONField(default=dict, blank=True)
    shirt_bill_number = models.CharField(max_length=50, blank=True, null=True)
    shirt_date = models.DateField(null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    measurement_completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} - {self.preferred_date} ({self.status})"

    def has_measurements(self):
        """Check if any measurements have been filled"""
        return bool(
            self.coat_measurements or self.pant_measurements or self.shirt_measurements
        )
