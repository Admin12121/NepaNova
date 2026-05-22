import logging
import secrets
import smtplib

from django.conf import settings
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.mail import EmailMessage
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


def send_email(subject, email, body):
    try:
        msg = EmailMessage(
            subject=subject,
            body=body,
            from_email=settings.EMAIL_HOST_USER,
            to=[email] if isinstance(email, str) else email,
        )
        msg.content_subtype = "html"
        msg.send(fail_silently=False)
        return True
    except smtplib.SMTPException as e:
        logger.error("SMTP Error while sending email to %s: %s", email, e)
    except Exception as ex:
        logger.error("Unexpected error while sending email to %s: %s", email, ex)

    return False
