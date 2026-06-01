import logging
import secrets

import resend
from django.conf import settings
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils import timezone

logger = logging.getLogger(__name__)


def generate_otp():
    """Generate a cryptographically secure 6-digit OTP."""
    return str(secrets.randbelow(900000) + 100000)


def is_otp_valid(user, otp):
    if (
        user.otp_token
        and user.otp_created_at
        and user.otp_token == otp
        and (timezone.now() - user.otp_created_at).seconds < 300
    ):
        return True
    return False


class TokenGenerator(PasswordResetTokenGenerator):
    def _make_hash_value(self, user, timestamp):
        return str(user.pk) + str(timestamp)


generate_token = TokenGenerator()


def _normalize_recipients(email):
    if not email:
        return []
    recipients = [email] if isinstance(email, str) else list(email)
    return [recipient for recipient in recipients if recipient]


def queue_email(subject, email, body, error_message=""):
    recipients = _normalize_recipients(email)
    if not recipients:
        return False
    try:
        from account.models import EmailOutbox

        EmailOutbox.objects.create(
            subject=subject,
            recipients=recipients,
            body=body,
            last_error=error_message,
        )
        return True
    except Exception as ex:
        logger.error("Failed to queue email to %s: %s", recipients, ex)
        return False


def send_email(subject, email, body, queue_on_failure=True):
    recipients = _normalize_recipients(email)
    if not recipients:
        logger.warning("Email skipped because no recipients were provided.")
        return False
    if not settings.RESEND_API_KEY:
        logger.error("Email skipped because RESEND_API_KEY is not configured.")
        if queue_on_failure:
            queue_email(
                subject,
                recipients,
                body,
                "RESEND_API_KEY is not configured.",
            )
        return False

    try:
        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send(
            {
                "from": settings.RESEND_FROM_EMAIL,
                "to": recipients,
                "subject": subject,
                "html": body,
            }
        )
        return True
    except Exception as ex:
        logger.error("Resend error while sending email to %s: %s", recipients, ex)
        if queue_on_failure:
            queue_email(subject, recipients, body, str(ex))

    return False


def sync_resend_contact(email, properties=None):
    if not settings.RESEND_API_KEY:
        logger.error(
            "Resend contact sync skipped because RESEND_API_KEY is not configured."
        )
        return False

    params = {
        "email": email,
        "unsubscribed": False,
    }
    audience_id = getattr(settings, "RESEND_AUDIENCE_ID", "")
    if audience_id:
        params["audience_id"] = audience_id
    if properties:
        params["properties"] = properties

    try:
        resend.api_key = settings.RESEND_API_KEY
        resend.Contacts.create(params)
        return True
    except Exception as create_ex:
        logger.info(
            "Resend contact create failed for %s; trying update: %s",
            email,
            create_ex,
        )

    try:
        resend.api_key = settings.RESEND_API_KEY
        resend.Contacts.update(params)
        return True
    except Exception as update_ex:
        logger.error("Resend contact sync failed for %s: %s", email, update_ex)

    return False
