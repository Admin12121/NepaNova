import logging
import re
from datetime import timedelta
from urllib.parse import unquote

import requests
from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.db import transaction
from django.db.models import Count
from django.db.models.functions import TruncDay, TruncMonth, TruncWeek, TruncYear
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.crypto import get_random_string
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from server.utils.encryption import encrypt_response

from .models import *
from .rbac import HasRbacPermission
from .renderers import UserRenderer
from .serializers import *
from .utils import (
    generate_otp,
    generate_token,
    is_otp_valid,
    send_email,
    send_phone_otp,
    sync_resend_contact,
)

logger = logging.getLogger(__name__)


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    refresh["role"] = user.role
    refresh["roles"] = list(user.get_role_slugs())
    refresh["permissions"] = list(user.get_rbac_permission_codes())
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


PHONE_OTP_TTL_SECONDS = 5 * 60
PHONE_OTP_COOLDOWN_SECONDS = 60
PHONE_OTP_MAX_PER_HOUR = 5
PHONE_OTP_MAX_ATTEMPTS = 5


def normalize_nepali_phone(value):
    phone = re.sub(r"[\s\-().]", "", str(value or ""))
    if phone.startswith("+"):
        phone = phone[1:]
    if phone.startswith("977"):
        phone = phone[3:]
    if phone.startswith("0") and len(phone) == 11:
        phone = phone[1:]
    if not re.fullmatch(r"(97|98)\d{8}", phone):
        raise ValueError("Enter a valid Nepali mobile number.")
    return phone


class PhoneOtpRequestThrottle(AnonRateThrottle):
    rate = "5/hour"


class PhoneOtpVerifyThrottle(AnonRateThrottle):
    rate = "20/hour"


class CustomPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response(
            {
                "links": {
                    "next": self.get_next_link(),
                    "previous": self.get_previous_link(),
                },
                "count": self.page.paginator.count,
                "page_size": self.get_page_size(self.request),
                "results": data,
            }
        )


def assign_default_roles(user, assigned_by=None):
    default_roles = Role.objects.filter(is_default=True)
    for role in default_roles:
        UserRole.objects.get_or_create(
            user=user, role=role, defaults={"assigned_by": assigned_by}
        )


def with_required_default_roles(roles):
    if any(not role.is_default for role in roles):
        return roles

    role_by_id = {role.id: role for role in roles}
    for role in Role.objects.filter(is_default=True):
        role_by_id.setdefault(role.id, role)
    return list(role_by_id.values())


class NewsLetterViewSet(viewsets.ModelViewSet):
    queryset = NewLetter.objects.all().order_by("-id")
    serializer_class = NewsLetterSerializer
    renderer_classes = [UserRenderer]
    pagination_class = CustomPagination
    filter_backends = [SearchFilter, OrderingFilter]

    # Allow POST for anyone; GET/LIST only for admin; block PUT/PATCH/DELETE for non-admin
    http_method_names = ["get", "post", "head", "options"]

    def get_permissions(self):
        if self.action == "create":
            self.permission_classes = [AllowAny]
        else:
            self.permission_classes = [HasRbacPermission]
            self.required_permission = "newsletter.manage"
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        instance, created = NewLetter.objects.get_or_create(email=email)

        contact_synced = sync_resend_contact(
            instance.email,
            {
                "source": "newsletter_footer",
                "brand": "NepaNova Impact",
            },
        )
        email_sent = False

        if created:
            try:
                subject = "Welcome to NepaNova Impact"
                body = render_to_string(
                    "newsletter_welcome.html",
                    {
                        "brand_name": "NepaNova Impact",
                        "site_url": settings.FRONTEND_URL.rstrip("/"),
                    },
                )
                email_sent = send_email(subject, instance.email, body)
            except Exception as e:
                logger.error("Failed to send newsletter welcome email: %s", e)

        response_data = dict(self.get_serializer(instance).data)
        response_data.update(
            {
                "message": (
                    "You have been subscribed to our newsletter."
                    if created
                    else "This email is already subscribed to our newsletter."
                ),
                "email_sent": email_sent,
                "resend_contact_synced": contact_synced,
            }
        )

        headers = self.get_success_headers(response_data)
        return Response(
            response_data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
            headers=headers,
        )


class RbacPermissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = RbacPermission.objects.all().order_by("code")
    serializer_class = RbacPermissionSerializer
    renderer_classes = [UserRenderer]
    permission_classes = [HasRbacPermission]
    required_permission = "roles.manage"
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["code", "name", "description"]
    ordering_fields = ["code", "name", "created_at"]


class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.prefetch_related(
        "permissions", "user_assignments__user"
    ).all()
    serializer_class = RoleSerializer
    renderer_classes = [UserRenderer]
    permission_classes = [HasRbacPermission]
    required_permission = "roles.manage"
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name", "slug"]
    ordering_fields = ["position", "name", "created_at"]

    def _reject_immutable_role(self, role):
        if role.is_mutable:
            return None
        return Response(
            {"error": "System and default roles are read-only."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    def update(self, request, *args, **kwargs):
        role = self.get_object()
        rejection = self._reject_immutable_role(role)
        if rejection:
            return rejection
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        role = self.get_object()
        rejection = self._reject_immutable_role(role)
        if rejection:
            return rejection
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        role = self.get_object()
        if not role.is_mutable:
            return Response(
                {"error": "System and default roles cannot be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="assign")
    def assign(self, request, pk=None):
        role = self.get_object()
        user_ids = request.data.get("user_ids", [])
        if not isinstance(user_ids, list) or not user_ids:
            return Response(
                {"error": "user_ids must be a non-empty list."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        users = User.objects.filter(id__in=user_ids)
        with transaction.atomic():
            for user in users:
                UserRole.objects.get_or_create(
                    user=user, role=role, defaults={"assigned_by": request.user}
                )
        return Response(
            {"message": f"Assigned {role.name} to {users.count()} user(s)."},
            status=status.HTTP_200_OK,
        )


class UserRoleViewSet(viewsets.ModelViewSet):
    queryset = UserRole.objects.select_related("user", "role", "assigned_by").all()
    serializer_class = UserRoleSerializer
    renderer_classes = [UserRenderer]
    permission_classes = [HasRbacPermission]
    required_permission = "roles.manage"
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["user__email", "role__name", "role__slug"]
    ordering_fields = ["assigned_at"]

    def perform_create(self, serializer):
        serializer.save(assigned_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        assignment = self.get_object()
        if (
            assignment.role.is_default
            and not assignment.user.rbac_roles.exclude(role__is_default=True).exists()
        ):
            return Response(
                {"error": "The default customer role cannot be removed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("-id")
    serializer_class = UserDataSerializer
    renderer_classes = [UserRenderer]

    def get_permissions(self):
        if self.action in ["list", "retrieve", "get_all_users"]:
            self.permission_classes = [HasRbacPermission]
            self.required_permission = "users.view"
        elif self.action == "destroy":
            self.permission_classes = [HasRbacPermission]
            self.required_permission = "users.manage"
        elif self.action in [
            "create",
            "login",
            "social_login",
            "request_phone_otp",
            "verify_phone_otp",
        ]:
            self.permission_classes = [AllowAny]
        elif self.action in ["update", "partial_update", "me", "device"]:
            self.permission_classes = [IsAuthenticated]
        else:
            self.permission_classes = [IsAuthenticated]
        return super(UserViewSet, self).get_permissions()

    @encrypt_response
    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def me(self, request):
        user = request.user
        serializer = UserDetailSerializer(user, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = UserRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Auto-activate the user (no activation email needed)
        user.state = "active"
        user.save(update_fields=["state"])
        assign_default_roles(user, assigned_by=user)

        try:
            # Send welcome email
            subject = "Welcome to NepaNova Impact"
            body = render_to_string(
                "welcome.html",
                {"email": user.email, "username": user.username},
            )
            send_email(subject, user.email, body)
        except Exception as e:
            logger.error("Failed to send welcome email for %s: %s", user.email, e)

        tokens = get_tokens_for_user(user)
        return Response(
            {"message": "Account created successfully!", "token": tokens},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["post"])
    def social_login(self, request):
        data = request.data
        provider = data.get("provider")
        email = data.get("email")
        username = data.get("username")
        profile = data.get("profile", {})
        provider_id = profile.get("id") or profile.get("sub")
        if not provider or not email or not username:
            return Response(
                {"error": "Required fields missing"}, status=status.HTTP_400_BAD_REQUEST
            )
        avatar_url = profile.get("avatar_url") or profile.get("picture")
        User = get_user_model()
        try:
            with transaction.atomic():
                password = get_random_string(
                    length=32,
                    allowed_chars="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=",
                )

                user, created = User.objects.get_or_create(
                    email=email,
                    defaults={
                        "username": username,
                        "state": "active",
                    },
                )

                if not created and user.state == "blocked":
                    return Response(
                        {
                            "error": (
                                "Your account has been suspended due to a violation of our "
                                "Terms and Conditions. For more details or inquiries, "
                                "contact us at info@nepanova.com"
                            ),
                            "blocked": True,
                            "terms_url": "/terms-of-service",
                        },
                        status=status.HTTP_403_FORBIDDEN,
                    )

                account, account_created = Account.objects.get_or_create(
                    user=user,
                    provider=provider,
                    defaults={"providerId": provider_id, "details": str(profile)},
                )
                if not account_created:
                    account.providerId = provider_id
                    account.details = str(profile)
                    account.save()

                if created:
                    user.set_password(password)
                    user.save(update_fields=["password"])
                    assign_default_roles(user, assigned_by=user)
                    if avatar_url:
                        self._save_user_avatar(user, avatar_url, username)
                    # Fixed: was a tuple bug (trailing comma made it a tuple)
                    subject = "Your account is now Active"
                    body = render_to_string(
                        "welcome.html", {"email": email, "username": username}
                    )

                    send_email(subject, email, body)

                tokens = get_tokens_for_user(user)
                return Response(
                    {"message": "Login successful!", "token": tokens},
                    status=status.HTTP_200_OK,
                )
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _save_user_avatar(self, user, avatar_url, username):
        try:
            response = requests.get(avatar_url, timeout=10)
            if response.status_code == 200:
                ext = avatar_url.rsplit(".", 1)[-1].split("?")[0]
                if ext.lower() not in ["jpg", "jpeg", "png"]:
                    ext = "jpg"
                filename = f"profile/{username}_avatar.{ext}"
                user.profile.save(filename, ContentFile(response.content), save=True)
        except Exception as e:
            logger.error("Failed to save avatar for %s: %s", username, e)

    def _get_or_create_phone_user(self, phone):
        UserModel = get_user_model()
        user, created = UserModel.objects.get_or_create(
            phone=phone,
            defaults={
                "email": f"phone-{phone}@phone.nepanova.local",
                "username": f"phone_{phone[-4:]}_{get_random_string(6).lower()}",
                "first_name": "Phone",
                "last_name": "User",
                "state": "active",
            },
        )

        if created:
            user.set_unusable_password()
            user.save(update_fields=["password"])
            assign_default_roles(user, assigned_by=user)

        return user

    @action(
        detail=False,
        methods=["post"],
        url_path="phone-otp/request",
        permission_classes=[AllowAny],
        throttle_classes=[PhoneOtpRequestThrottle],
    )
    def request_phone_otp(self, request):
        try:
            phone = normalize_nepali_phone(request.data.get("phone"))
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        recent_otp = PhoneLoginOtp.objects.filter(phone=phone).first()
        if (
            recent_otp
            and (now - recent_otp.created_at).total_seconds()
            < PHONE_OTP_COOLDOWN_SECONDS
        ):
            retry_after = PHONE_OTP_COOLDOWN_SECONDS - int(
                (now - recent_otp.created_at).total_seconds()
            )
            return Response(
                {
                    "error": "Please wait before requesting another OTP.",
                    "retry_after": max(retry_after, 1),
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        hourly_count = PhoneLoginOtp.objects.filter(
            phone=phone,
            created_at__gte=now - timedelta(hours=1),
        ).count()
        if hourly_count >= PHONE_OTP_MAX_PER_HOUR:
            return Response(
                {"error": "Too many OTP requests. Please try again later."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        otp = generate_otp()
        if not send_phone_otp(phone, otp):
            return Response(
                {"error": "Could not send OTP right now. Please try again later."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        PhoneLoginOtp.objects.create(
            phone=phone,
            otp_hash=make_password(otp),
            expires_at=now + timedelta(seconds=PHONE_OTP_TTL_SECONDS),
        )
        return Response(
            {
                "message": "OTP sent successfully.",
                "expires_in": PHONE_OTP_TTL_SECONDS,
            },
            status=status.HTTP_200_OK,
        )

    @action(
        detail=False,
        methods=["post"],
        url_path="phone-otp/verify",
        permission_classes=[AllowAny],
        throttle_classes=[PhoneOtpVerifyThrottle],
    )
    def verify_phone_otp(self, request):
        try:
            phone = normalize_nepali_phone(request.data.get("phone"))
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        otp = re.sub(r"\D", "", str(request.data.get("otp") or ""))
        if not re.fullmatch(r"\d{6}", otp):
            return Response(
                {"error": "Enter the 6 digit OTP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()
        challenge = (
            PhoneLoginOtp.objects.filter(
                phone=phone,
                consumed_at__isnull=True,
                expires_at__gt=now,
            )
            .order_by("-created_at")
            .first()
        )
        invalid_response = Response(
            {"error": "Invalid or expired OTP."},
            status=status.HTTP_400_BAD_REQUEST,
        )
        if not challenge:
            return invalid_response

        if challenge.attempts >= PHONE_OTP_MAX_ATTEMPTS:
            return Response(
                {"error": "Too many verification attempts. Request a new OTP."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        if not check_password(otp, challenge.otp_hash):
            challenge.attempts += 1
            challenge.save(update_fields=["attempts"])
            return invalid_response

        with transaction.atomic():
            challenge.consumed_at = now
            challenge.save(update_fields=["consumed_at"])
            user = self._get_or_create_phone_user(phone)

        if user.state == "blocked":
            return Response(
                {
                    "error": (
                        "Your account has been suspended due to a violation of our "
                        "Terms and Conditions. For more details or inquiries, "
                        "contact us at info@nepanova.com"
                    ),
                    "blocked": True,
                    "terms_url": "/terms-of-service",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        tokens = get_tokens_for_user(user)
        return Response(
            {"message": "Login successful!", "token": tokens},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"])
    def login(self, request):
        email = request.data.get("email")
        password = request.data.get("password")

        if not email or not password:
            return Response(
                {"error": "Email and password are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"error": "Invalid email or password"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if user.state == "blocked":
            return Response(
                {
                    "error": (
                        "Your account has been suspended due to a violation of our "
                        "Terms and Conditions. For more details or inquiries, "
                        "contact us at info@nepanova.com"
                    ),
                    "blocked": True,
                    "terms_url": "/terms-of-service",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if not user.check_password(password):
            return Response(
                {"error": "Invalid email or password"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        tokens = get_tokens_for_user(user)
        return Response(
            {"message": "Login successful!", "token": tokens},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def device(self, request):
        data = request.data
        user = request.user
        signature = data.get("signature")
        if not signature:
            return Response(
                {"error": "Signature is required"}, status=status.HTTP_400_BAD_REQUEST
            )
        device, created = UserDevice.objects.update_or_create(
            user=user,
            signature=signature,
            defaults={
                "device_type": data.get("device_type", "unknown"),
                "device_os": data.get("device_os", "unknown"),
                "last_login": timezone.now(),
                "ip_address": data.get("ip_address"),
            },
        )
        return Response(
            {"message": "Device registered" if created else "Device updated"},
            status=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(
            {"message": "Object deleted"}, status=status.HTTP_204_NO_CONTENT
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", True)
        # Always update the authenticated user's own profile only
        user = request.user
        serializer = self.get_serializer(user, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response("Profile Updated.", status=status.HTTP_200_OK)


class UserActivationView(APIView):
    def get(self, request, uidb64, token):
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user is not None:
            if generate_token.check_token(user, token):
                user.state = "active"
                user.save()
                return Response(
                    {"success": "Your account has been activated successfully."},
                    status=status.HTTP_200_OK,
                )
            else:
                return Response(
                    {"error": "Activation link is expired."},
                    status=status.HTTP_410_GONE,
                )
        else:
            return Response(
                {"error": "Activation link is invalid."},
                status=status.HTTP_400_BAD_REQUEST,
            )


class PasswordResetThrottle(AnonRateThrottle):
    """Custom throttle: 3 password reset requests per day."""

    rate = "3/day"


class PasswordResetView(APIView):
    throttle_classes = [PasswordResetThrottle]

    def post(self, request):
        email = request.data.get("email")
        try:
            user = User.objects.get(email=email)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            otp = generate_otp()
            user.otp_token = otp
            user.otp_created_at = timezone.now()
            user.save()
            subject = "Password Reset OTP"
            body = render_to_string("reset_password.html", {"otp": otp})
            send_email(subject, email, body)
            return Response(
                {"message": "OTP sent to your email", "uid": uid},
                status=status.HTTP_200_OK,
            )
        else:
            return Response(
                {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )

    def patch(self, request):
        uidb64 = request.data.get("uid")
        token = request.data.get("token", None)
        password = request.data.get("password", None)
        otp = request.data.get("otp", None)
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user and otp:
            if is_otp_valid(user, otp):
                token = generate_token.make_token(user)
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                return Response(
                    {
                        "message": "OTP verified successfully",
                        "token": token,
                        "uid": uid,
                    },
                    status=status.HTTP_200_OK,
                )
            else:
                return Response(
                    {"error": "Invalid OTP"}, status=status.HTTP_400_BAD_REQUEST
                )
        elif user and token:
            if generate_token.check_token(user, token):
                user.set_password(password)
                user.save()
                subject = "Customer account password reset"
                body = render_to_string(
                    "password_changed.html",
                )
                send_email(subject, user.email, body)
                return Response(
                    {"success": "Your password has been changed successfully."},
                    status=status.HTTP_200_OK,
                )
            else:
                return Response(
                    {"error": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST
                )
        else:
            return Response(
                {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )


class AdminUserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("-id")
    serializer_class = UserDataSerializer
    renderer_classes = [UserRenderer]
    permission_classes = [HasRbacPermission]
    pagination_class = CustomPagination
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["first_name", "last_name", "email", "username"]
    ordering_fields = ["created_at", "first_name", "email"]

    def get_permissions(self):
        if self.action in ["list", "retrieve", "list_users", "retrieve_user_by_username"]:
            return [HasRbacPermission("users.view")]
        if self.action == "set_roles":
            return [HasRbacPermission("roles.manage")]
        return [HasRbacPermission("users.manage")]

    def get_queryset(self):
        queryset = super().get_queryset()
        state = self.request.query_params.get("state")
        role = self.request.query_params.get("role")
        if state:
            queryset = queryset.filter(state=state)
        if role:
            queryset = queryset.filter(role=role)
        return queryset

    def _sync_legacy_role(self, user):
        role_slugs = user.get_role_slugs()
        if "admin" in role_slugs:
            user.role = "Admin"
            user.is_admin = True
        elif "staff" in role_slugs:
            user.role = "Staff"
            user.is_admin = False
        elif role_slugs:
            user.role = "User"
            user.is_admin = False
        else:
            user.role = "User"
            user.is_admin = False
        user.save(update_fields=["role", "is_admin"])

    @action(detail=False, methods=["get"])
    def list_users(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="by-username/(?P<username>.+)")
    def retrieve_user_by_username(self, request, username=None):
        identifier = unquote(username or "").strip()
        try:
            user = User.objects.get(username=identifier)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except User.MultipleObjectsReturned:
            return Response(
                {"error": "Multiple users matched this identifier."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = UserDetailSerializer(user, context={"request": request})
        user_data = serializer.data

        # Get order stats
        from sales.models import Sales

        orders = Sales.objects.filter(costumer_name=user)
        user_data["total_orders"] = orders.count()
        user_data["total_spent"] = float(sum(o.total_amt for o in orders))
        user_data["orders"] = [
            {
                "id": o.id,
                "transactionuid": o.transactionuid,
                "status": o.status,
                "total_amt": float(o.total_amt),
                "created": o.created,
            }
            for o in orders.order_by("-id")[:10]
        ]

        return Response(user_data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["patch"], url_path="bulk-update")
    def bulk_update(self, request):
        ids = request.data.get("ids", [])
        update_data = request.data.get("data", {})
        if not ids:
            return Response(
                {"error": "No user IDs provided"}, status=status.HTTP_400_BAD_REQUEST
            )
        users = User.objects.filter(id__in=ids)
        count = users.count()
        if not count:
            return Response(
                {"error": "No users found"}, status=status.HTTP_404_NOT_FOUND
            )
        allowed_fields = ["state"]
        update_kwargs = {k: v for k, v in update_data.items() if k in allowed_fields}
        if update_kwargs:
            users.update(**update_kwargs)
        return Response(
            {"message": f"Updated {count} users"}, status=status.HTTP_200_OK
        )

    @action(detail=False, methods=["delete"], url_path="bulk-delete")
    def bulk_delete(self, request):
        ids = request.data.get("ids", [])
        if not ids:
            return Response(
                {"error": "No user IDs provided"}, status=status.HTTP_400_BAD_REQUEST
            )
        users = User.objects.filter(id__in=ids)
        count = users.count()
        if not count:
            return Response(
                {"error": "No users found"}, status=status.HTTP_404_NOT_FOUND
            )
        users.delete()
        return Response(
            {"message": f"Deleted {count} users"}, status=status.HTTP_200_OK
        )

    @action(detail=False, methods=["patch"], url_path="bulk-activate")
    def bulk_activate(self, request):
        ids = request.data.get("ids", [])
        if not ids:
            return Response(
                {"error": "No user IDs provided"}, status=status.HTTP_400_BAD_REQUEST
            )
        users = User.objects.filter(id__in=ids)
        count = users.count()
        if not count:
            return Response(
                {"error": "No users found"}, status=status.HTTP_404_NOT_FOUND
            )
        users.update(state="active")
        return Response(
            {"message": f"Activated {count} users"}, status=status.HTTP_200_OK
        )

    @action(detail=False, methods=["patch"], url_path="bulk-block")
    def bulk_block(self, request):
        ids = request.data.get("ids", [])
        if not ids:
            return Response(
                {"error": "No user IDs provided"}, status=status.HTTP_400_BAD_REQUEST
            )
        users = User.objects.filter(id__in=ids)
        count = users.count()
        if not count:
            return Response(
                {"error": "No users found"}, status=status.HTTP_404_NOT_FOUND
            )
        users.update(state="blocked")
        return Response(
            {"message": f"Blocked {count} users"}, status=status.HTTP_200_OK
        )

    @action(detail=True, methods=["patch"], url_path="update-state")
    def update_state(self, request, pk=None):
        user = self.get_object()
        state = request.data.get("state")
        if state:
            user.state = state
        user.save()
        serializer = self.get_serializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["put", "patch"], url_path="roles")
    def set_roles(self, request, pk=None):
        user = self.get_object()
        serializer = UserRoleAssignmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        role_ids = serializer.validated_data["role_ids"]
        roles = list(Role.objects.filter(id__in=role_ids))
        if len(roles) != len(set(role_ids)):
            return Response(
                {"error": "One or more roles do not exist."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        roles = with_required_default_roles(roles)

        with transaction.atomic():
            UserRole.objects.filter(user=user).exclude(role__in=roles).delete()
            for role in roles:
                UserRole.objects.get_or_create(
                    user=user, role=role, defaults={"assigned_by": request.user}
                )
            self._sync_legacy_role(user)

        user.refresh_from_db()
        return Response(
            self.get_serializer(user, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


class SiteViewLogViewSet(viewsets.ModelViewSet):
    queryset = SiteViewLog.objects.all().order_by("-timestamp")
    serializer_class = SiteViewLogSerializer
    renderer_classes = [UserRenderer]

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]
        return [HasRbacPermission("dashboard.view")]

    def create(self, request, *args, **kwargs):
        data = request.data
        user = request.user if request.user.is_authenticated else None
        log = SiteViewLog.objects.create(
            user=user,
            country=data.get("country", "Unknown"),
            city=data.get("city", "Unknown"),
            user_agent=data.get("user_agent", "Unknown"),
        )
        return Response(
            {"message": "Log created", "id": log.id}, status=status.HTTP_201_CREATED
        )


class SiteViewLogAnalyticsView(APIView):
    def get_permissions(self):
        return [HasRbacPermission("dashboard.view")]

    def get(self, request):
        period = request.query_params.get("period", "daily")
        days = int(request.query_params.get("days", 30))

        end_date = timezone.now()
        start_date = end_date - timezone.timedelta(days=days)

        queryset = SiteViewLog.objects.filter(timestamp__gte=start_date)

        if period == "daily":
            trunc_fn = TruncDay
        elif period == "weekly":
            trunc_fn = TruncWeek
        elif period == "monthly":
            trunc_fn = TruncMonth
        elif period == "yearly":
            trunc_fn = TruncYear
        else:
            trunc_fn = TruncDay

        # Views over time
        views_over_time = (
            queryset.annotate(period=trunc_fn("timestamp"))
            .values("period")
            .annotate(count=Count("id"))
            .order_by("period")
        )

        # Unique visitors (by user_agent)
        unique_visitors = (
            queryset.annotate(period=trunc_fn("timestamp"))
            .values("period")
            .annotate(count=Count("user_agent", distinct=True))
            .order_by("period")
        )

        # Top countries
        top_countries = (
            queryset.values("country")
            .annotate(count=Count("id"))
            .order_by("-count")[:10]
        )

        # Top cities
        top_cities = (
            queryset.values("city").annotate(count=Count("id")).order_by("-count")[:10]
        )

        # Summary stats
        total_views = queryset.count()
        total_unique = queryset.values("user_agent").distinct().count()

        # Views today
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        views_today = queryset.filter(timestamp__gte=today_start).count()

        # Growth (compare last 7 days vs previous 7 days)
        seven_days_ago = end_date - timezone.timedelta(days=7)
        fourteen_days_ago = end_date - timezone.timedelta(days=14)
        recent_views = SiteViewLog.objects.filter(timestamp__gte=seven_days_ago).count()
        previous_views = SiteViewLog.objects.filter(
            timestamp__gte=fourteen_days_ago, timestamp__lt=seven_days_ago
        ).count()
        growth = (
            round(((recent_views - previous_views) / previous_views) * 100, 1)
            if previous_views > 0
            else 0
        )

        return Response(
            {
                "views_over_time": list(views_over_time),
                "unique_visitors": list(unique_visitors),
                "top_countries": list(top_countries),
                "top_cities": list(top_cities),
                "summary": {
                    "total_views": total_views,
                    "total_unique_visitors": total_unique,
                    "views_today": views_today,
                    "growth_percentage": growth,
                },
            }
        )


class SearchView(viewsets.ModelViewSet):
    queryset = SearchHistory.objects.all().order_by("-search_date")
    serializer_class = SearchHistorySerializer
    renderer_classes = [UserRenderer]
    pagination_class = CustomPagination

    def get_permissions(self):
        if self.action in ["create", "list", "popular_keywords"]:
            return [AllowAny()]
        return [HasRbacPermission("settings.manage")]

    # Only allow GET, POST, HEAD, OPTIONS for non-admin; admin can do anything via permissions
    http_method_names = ["get", "post", "delete", "head", "options"]

    def create(self, request, *args, **kwargs):
        keyword = request.data.get("keyword")
        user = request.user if request.user.is_authenticated else None
        if not keyword:
            return Response(
                {"error": "Keyword is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Sanitize: strip whitespace, remove HTML tags, enforce max length
        keyword = keyword.strip()
        keyword = re.sub(r"<[^>]*>", "", keyword)  # strip HTML tags
        keyword = keyword[:100]  # enforce 100 char limit

        if not keyword:
            return Response(
                {"error": "Keyword is invalid"}, status=status.HTTP_400_BAD_REQUEST
            )

        search_history = SearchHistory.objects.create(
            user=user,
            keyword=keyword,
        )

        serializer = self.get_serializer(search_history)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="popular-keywords")
    def popular_keywords(self, request):
        past_month = timezone.now() - timezone.timedelta(days=30)
        keywords = (
            SearchHistory.objects.filter(search_date__gte=past_month)
            .values("keyword")
            .annotate(count=Count("keyword"))
            .order_by("-count")[:10]
        )
        if not keywords:
            keywords = (
                SearchHistory.objects.values("keyword")
                .annotate(count=Count("keyword"))
                .order_by("-count")[:10]
            )
        keyword_list = [entry["keyword"] for entry in keywords]
        return Response(keyword_list, status=status.HTTP_200_OK)


class DeliveryAddressView(viewsets.ModelViewSet):
    queryset = DeliveryAddress.objects.all().order_by("-id")
    serializer_class = DeliveryAddressSerializer
    renderer_classes = [UserRenderer]
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination

    def get_queryset(self):
        user = self.request.user
        return DeliveryAddress.objects.filter(user=user, is_deleted=False).order_by(
            "-id"
        )

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        data["user"] = request.user.id
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        try:
            serializer.save()
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.user != request.user:
            return Response(
                {"error": "You can only update your own addresses."},
                status=status.HTTP_403_FORBIDDEN,
            )
        data = request.data.copy()
        serializer = self.get_serializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            serializer.save()
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.user != request.user:
            return Response(
                {"error": "You can only delete your own addresses."},
                status=status.HTTP_403_FORBIDDEN,
            )
        instance.is_deleted = True
        instance.save()
        return Response({"message": "Address deleted"}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def get_default(self, request):
        user = request.user
        default_address = DeliveryAddress.objects.filter(
            user=user, default=True, is_deleted=False
        ).first()
        if default_address:
            serializer = self.get_serializer(default_address)
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            return Response(
                {"message": "No data available"}, status=status.HTTP_404_NOT_FOUND
            )
