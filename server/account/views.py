import logging
import re

import requests
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
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from server.utils.encryption import encrypt_response

from .models import *
from .renderers import UserRenderer
from .serializers import *
from .utils import generate_otp, generate_token, is_otp_valid, send_email

logger = logging.getLogger(__name__)


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    refresh["role"] = user.role
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


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
            # list, retrieve, etc. require admin
            self.permission_classes = [IsAuthenticated, IsAdminUser]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()

        try:
            subject = "Welcome to Alphasuits Newsletter 💖"
            body = render_to_string("newsletter_welcome.html")
            send_email(subject, instance.email, body)
        except Exception as e:
            logger.error("Failed to send newsletter welcome email: %s", e)

        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("-id")
    serializer_class = UserDataSerializer
    renderer_classes = [UserRenderer]

    def get_permissions(self):
        if self.action in ["list", "retrieve", "destroy", "get_all_users"]:
            self.permission_classes = [IsAuthenticated, IsAdminUser]
        elif self.action in ["create", "login", "social_login"]:
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

        try:
            # Send welcome email
            subject = "Welcome to Alphasuits"
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
                                "contact us at info@alphasuits.com.np"
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
                        "contact us at info@alphasuits.com.np"
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
    permission_classes = [IsAuthenticated, IsAdminUser]
    pagination_class = CustomPagination
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["first_name", "last_name", "email", "username"]
    ordering_fields = ["created_at", "first_name", "email"]

    def get_queryset(self):
        queryset = super().get_queryset()
        state = self.request.query_params.get("state")
        role = self.request.query_params.get("role")
        if state:
            queryset = queryset.filter(state=state)
        if role:
            queryset = queryset.filter(role=role)
        return queryset

    @action(detail=False, methods=["get"])
    def list_users(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="by-username/(?P<username>[^/.]+)")
    def retrieve_user_by_username(self, request, username=None):
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = UserDetailSerializer(user, context={"request": request})
        user_data = serializer.data

        # Get order stats
        from sales.models import Sales

        orders = Sales.objects.filter(costumer_name=user)
        user_data["total_orders"] = orders.count()
        user_data["total_spent"] = sum(o.total_amt for o in orders)
        user_data["orders"] = [
            {
                "id": o.id,
                "transactionuid": o.transactionuid,
                "status": o.status,
                "total_amt": o.total_amt,
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
        allowed_fields = ["role", "state"]
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
        role = request.data.get("role")
        if state:
            user.state = state
        if role:
            user.role = role
        user.save()
        serializer = self.get_serializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SiteViewLogViewSet(viewsets.ModelViewSet):
    queryset = SiteViewLog.objects.all().order_by("-timestamp")
    serializer_class = SiteViewLogSerializer
    renderer_classes = [UserRenderer]

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]
        return [IsAuthenticated(), IsAdminUser()]

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
        return [IsAuthenticated(), IsAdminUser()]

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
        # DELETE, UPDATE, etc. require admin
        return [IsAuthenticated(), IsAdminUser()]

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
