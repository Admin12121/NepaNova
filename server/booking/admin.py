from django.contrib import admin
from .models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = [
        'name',
        'email', 
        'phone_number', 
        'measurement_type', 
        'preferred_date', 
        'preferred_time', 
        'status',
        'bill_number',
        'has_measurements_display',
        'created_at'
    ]
    list_filter = ['status', 'measurement_type', 'preferred_date']
    search_fields = ['name', 'email', 'phone_number', 'location', 'bill_number']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at', 'measurement_completed_at']
    
    def has_measurements_display(self, obj):
        return "✓" if obj.has_measurements() else "✗"
    has_measurements_display.short_description = "Has Measurements"
    
    fieldsets = (
        ('Customer Information', {
            'fields': ('name', 'email', 'phone_number', 'location')
        }),
        ('Appointment', {
            'fields': ('measurement_type', 'preferred_date', 'preferred_time', 'customer_notes')
        }),
        ('Status & Admin', {
            'fields': ('status', 'bill_number', 'delivery_date', 'admin_message')
        }),
        ('Coat & Safari Measurements', {
            'fields': ('coat_measurements', 'coat_bill_number', 'coat_date'),
            'classes': ('collapse',)
        }),
        ('Pant Measurements', {
            'fields': ('pant_measurements', 'pant_bill_number', 'pant_date'),
            'classes': ('collapse',)
        }),
        ('Shirt Measurements', {
            'fields': ('shirt_measurements', 'shirt_bill_number', 'shirt_date'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'measurement_completed_at'),
            'classes': ('collapse',)
        }),
    )
