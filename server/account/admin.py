from django.contrib import admin

from .models import EmailOutbox


@admin.register(EmailOutbox)
class EmailOutboxAdmin(admin.ModelAdmin):
    list_display = ("id", "subject", "status", "attempts", "next_attempt_at", "sent_at")
    list_filter = ("status",)
    search_fields = ("subject", "recipients", "last_error")
    readonly_fields = (
        "subject",
        "recipients",
        "body",
        "status",
        "attempts",
        "last_error",
        "next_attempt_at",
        "sent_at",
        "created_at",
        "updated_at",
    )
