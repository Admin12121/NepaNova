from django.contrib import admin
from .models import Sales, Saled_Products, Redeem_Code

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
