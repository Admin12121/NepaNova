from collections import Counter

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Count, Max, Min, Q, Sum
from django.shortcuts import get_object_or_404
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import (
    SAFE_METHODS,
    AllowAny,
    BasePermission,
    IsAuthenticated,
)
from rest_framework.response import Response
from rest_framework.views import APIView

from account.models import SearchHistory, User
from account.utils import send_email
from sales.models import Saled_Products
from server.utils.encryption import encrypt_response

from .models import *
from .serializers import *


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100


class CustomReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated


class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_staff


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    permission_classes = [IsAdminOrReadOnly]

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return CategoryViewSerializer
        return CategorySerializer

    @action(methods=["get"], detail=False, permission_classes=[AllowAny])
    def get_category(self, request, *args, **kwargs):
        self.pagination_class = StandardResultsSetPagination
        name_filter = request.query_params.get("name", None)
        if name_filter:
            category = Category.objects.filter(name__icontains=name_filter).order_by(
                "-id"
            )
        else:
            category = Category.objects.all().order_by("-id")
        page = self.paginate_queryset(category)
        if page is not None:
            serializer = CategoryViewSerializer(
                page, many=True, context={"request": request}
            )
            return self.get_paginated_response(serializer.data)
        serializer = CategoryViewSerializer(
            category, many=True, context={"request": request}
        )
        return Response(serializer.data)


class ProductColorViewSet(viewsets.ModelViewSet):
    queryset = ProductColor.objects.all()
    serializer_class = ProductColorSerializer
    permission_classes = [IsAdminOrReadOnly]

    def _normalize_color_code(self, color_code):
        if not color_code:
            return None
        normalized = color_code.strip().upper()
        if not normalized.startswith("#"):
            normalized = f"#{normalized}"
        return normalized

    def get_queryset(self):
        queryset = super().get_queryset()
        color_code = self.request.query_params.get("color_code")
        if color_code:
            normalized = self._normalize_color_code(color_code)
            queryset = queryset.filter(color_code=normalized)
        return queryset

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if data.get("color_code"):
            data["color_code"] = self._normalize_color_code(data.get("color_code"))
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )


class ProductViewSet(viewsets.ModelViewSet):
    queryset = (
        Product.objects.select_related("category")
        .prefetch_related("productvariant_set__color", "reviews")
        .all()
        .order_by("-id")
    )
    serializer_class = ProductSerializer
    permission_classes = [IsAdminOrReadOnly]
    parser_classes = [MultiPartParser, FormParser]
    pagination_class = StandardResultsSetPagination

    def create(self, request, *args, **kwargs):
        data = request.data
        is_multi_variant = data.get("is_multi_variant", "false").lower() == "true"
        variants_data = self._extract_variants_data(data)
        images_data = self._extract_images_data(data)

        with transaction.atomic():
            try:
                product_serializer = self.get_serializer(data=data)
                product_serializer.is_valid(raise_exception=True)
                product = product_serializer.save()

                if is_multi_variant:
                    self._create_variants(variants_data, product)
                else:
                    self._create_single_variant(data, product)
                self._save_images(images_data, product)

                headers = self.get_success_headers(product_serializer.data)
                return Response(
                    product_serializer.data,
                    status=status.HTTP_201_CREATED,
                    headers=headers,
                )
            except ValidationError as ve:
                transaction.set_rollback(True)
                return Response(
                    {"error": ve.detail}, status=status.HTTP_400_BAD_REQUEST
                )
            except Exception as e:
                transaction.set_rollback(True)
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def _extract_variants_data(self, data):
        variants_data = []
        index = 0
        while True:
            variant_id = data.get(f"variants[{index}][id]")
            size = data.get(f"variants[{index}][size]")
            price = data.get(f"variants[{index}][price]")
            stock = data.get(f"variants[{index}][stock]")
            discount = data.get(f"variants[{index}][discount]")
            color_code = data.get(f"variants[{index}][color_code]")
            color_name = data.get(f"variants[{index}][color_name]")

            if any([size, price, stock, discount, color_code, color_name]):
                variant = {
                    "id": variant_id,
                    "size": size,
                    "price": price,
                    "stock": stock,
                    "discount": discount,
                    "color_code": color_code,
                    "color_name": color_name,
                }
                variants_data.append(variant)
                index += 1
            else:
                break
        return variants_data

    def _extract_images_data(self, data):
        images_data = []
        index = 0
        while True:
            image = data.get(f"images[{index}]")
            if image:
                images_data.append(image)
                index += 1
            else:
                break
        return images_data

    def _normalize_color_code(self, color_code):
        if not color_code:
            return None
        normalized = color_code.strip().upper()
        if not normalized.startswith("#"):
            normalized = f"#{normalized}"
        return normalized

    def _ensure_color_reference(self, color_code, color_name):
        normalized = self._normalize_color_code(color_code)
        if not normalized:
            return None, color_name, None

        defaults = {"color_name": color_name or "Color"}
        color_obj, created = ProductColor.objects.get_or_create(
            color_code=normalized,
            defaults=defaults,
        )
        if color_name and color_obj.color_name != color_name:
            color_obj.color_name = color_name
            color_obj.save(update_fields=["color_name"])
        resolved_name = color_obj.color_name
        return normalized, resolved_name, color_obj

    def _create_variants(self, variants_data, product):
        for variant_data in variants_data:
            color_code, color_name, color_obj = self._ensure_color_reference(
                variant_data.get("color_code"), variant_data.get("color_name")
            )
            variant_payload = {
                "product": product.id,
                "color": color_obj.color_code if color_obj else None,
                "color_code": color_code,
                "color_name": color_name,
                "size": variant_data.get("size"),
                "price": variant_data.get("price"),
                "stock": variant_data.get("stock"),
                "discount": variant_data.get("discount"),
            }
            variant_serializer = ProductVariantSerializer(data=variant_payload)
            variant_serializer.is_valid(raise_exception=True)
            variant_serializer.save()

    def _create_single_variant(self, single_variant_data, product):
        color_code, color_name, color_obj = self._ensure_color_reference(
            single_variant_data.get("color_code"), single_variant_data.get("color_name")
        )
        payload = {
            "product": product.id,
            "color": color_obj.color_code if color_obj else None,
            "color_code": color_code,
            "color_name": color_name,
            "size": single_variant_data.get("size"),
            "price": single_variant_data.get("price"),
            "stock": single_variant_data.get("stock"),
            "discount": single_variant_data.get("discount"),
        }
        variant_serializer = ProductVariantSerializer(data=payload)
        variant_serializer.is_valid(raise_exception=True)
        variant_serializer.save()

    def _save_images(self, images_data, product):
        for index, image in enumerate(images_data):
            if image:
                image_index = self.request.data.get(f"imageIndex[{index}]")
                image_color = self.request.data.get(f"imageColor[{index}]")
                image_data = {
                    "product": product.id,
                    "image": image,
                    "index": image_index,
                }
                if image_color:
                    image_data["color"] = image_color
                image_serializer = ProductImageSerializer(data=image_data)
                image_serializer.is_valid(raise_exception=True)
                image_serializer.save()

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params
        user = self.request.user

        if not user.is_authenticated or not user.is_staff:
            queryset = queryset.filter(deactive=False)

        productslug = params.get("productslug")
        search = params.get("search")
        if productslug:
            queryset = queryset.filter(productslug=productslug)
            if not queryset.exists():
                raise Http404("Product not found")
            return queryset
        filters = Q()

        if search:
            filters &= Q(product_name__icontains=search) | Q(
                description__icontains=search
            )

        filters &= self._build_category_filters(params)
        filters &= self._build_price_filters(params)
        filters &= self._build_attribute_filters(params)

        queryset = queryset.annotate(
            min_variant_price=Min("productvariant__price"),
            max_variant_price=Max("productvariant__price"),
            sales_count=Sum("productvariant__saled_products__qty"),
            total_variant_stock=Sum("productvariant__stock"),
        )

        queryset = self._apply_ordering(queryset, params.get("filter"))

        queryset = queryset.filter(filters).distinct()
        return queryset

    def _build_category_filters(self, params):
        filters = Q()
        category = params.get("category")
        categoryslug = params.get("categoryslug")

        if category:
            filters &= Q(category__name__icontains=category)
        if categoryslug:
            filters &= Q(category__categoryslug__icontains=categoryslug)

        return filters

    def _build_price_filters(self, params):
        min_price = params.get("min_price")
        max_price = params.get("max_price")
        price_filter = Q()

        if min_price:
            price_filter &= Q(productvariant__price__gte=min_price)
        if max_price:
            price_filter &= Q(productvariant__price__lte=max_price)

        return price_filter

    def _build_attribute_filters(self, params):
        """Build attribute-related filters like color, size, and metal."""
        filters = Q()

        # Color filter prioritizes variant fields; falls back to description markers
        color_param = params.get("color", "")
        color_values = [v.strip() for v in color_param.split(",") if v.strip()]
        color_values += [v.strip() for v in params.getlist("color") if v.strip()]
        if color_values:
            color_filter = Q()
            for value in color_values:
                normalized = value.upper()
                if not normalized.startswith("#"):
                    normalized = (
                        f"#{normalized}" if len(normalized) in (3, 6, 7) else normalized
                    )
                color_filter |= Q(productvariant__color_code__iexact=normalized)
                color_filter |= Q(productvariant__color_name__iexact=value)
                color_filter |= Q(description__icontains=f"#{value}")
            filters &= color_filter

        size_param = params.get("size", "")
        size_values = [v.strip() for v in size_param.split(",") if v.strip()]
        size_values += [v.strip() for v in params.getlist("size") if v.strip()]
        if size_values:
            size_filter = Q()
            for value in size_values:
                size_filter |= Q(productvariant__size__iexact=value)
                size_filter |= Q(description__icontains=f"#{value}")
            filters &= size_filter

        metal_param = params.get("metal", "")
        metal_values = [v.strip() for v in metal_param.split(",") if v.strip()]
        metal_values += [v.strip() for v in params.getlist("metal") if v.strip()]
        if metal_values:
            metal_filter = Q()
            for value in metal_values:
                metal_filter |= Q(description__icontains=f"#{value}")
            filters &= metal_filter

        stock_filter = params.get("stock")
        if stock_filter == "in":
            filters &= Q(total_variant_stock__gt=0)
        elif stock_filter == "out":
            filters &= Q(total_variant_stock__lte=0)

        return filters

    def _apply_ordering(self, queryset, order_by):
        ordering_map = {
            "bestselling": "-sales_count",
            "newin": "-id",
            "hightolow": "-min_variant_price",
            "lowtohigh": "min_variant_price",
        }
        return queryset.order_by(ordering_map.get(order_by, "-id"))

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        data = request.data
        is_multi_variant = data.get("is_multi_variant", "false").lower() == "true"
        instance.product_name = data.get("product_name", instance.product_name)
        instance.description = data.get("description", instance.description)
        instance.category_id = data.get("category", instance.category_id)

        instance.save()

        if is_multi_variant:
            variants_data = self._extract_variants_data(data)
            self._update_variants(variants_data, instance)
        else:
            single_variant_data = {
                "size": data.get("size"),
                "price": data.get("price"),
                "stock": data.get("stock"),
                "discount": data.get("discount"),
                "color_code": data.get("color_code"),
                "color_name": data.get("color_name"),
            }
            existing_variant = instance.productvariant_set.first()
            if existing_variant:
                color_code, color_name, color_obj = self._ensure_color_reference(
                    single_variant_data.get("color_code"),
                    single_variant_data.get("color_name"),
                )
                existing_variant.price = single_variant_data["price"]
                existing_variant.stock = single_variant_data["stock"]
                existing_variant.discount = single_variant_data["discount"]
                existing_variant.size = single_variant_data["size"]
                existing_variant.color = color_obj
                existing_variant.color_code = color_code
                existing_variant.color_name = color_name
                existing_variant.save()
            else:
                self._create_single_variant(single_variant_data, instance)

        return Response(
            {"msg": "Product updated successfully"}, status=status.HTTP_200_OK
        )

    def _update_variants(self, variants_data, product):
        existing_variants = {
            variant.id: variant for variant in product.productvariant_set.all()
        }
        existing_combinations = {
            (variant.color_code or None, variant.size or None)
            for variant in existing_variants.values()
        }

        for variant_data in variants_data:
            raw_variant_id = variant_data.get("id")
            variant_id = int(raw_variant_id) if raw_variant_id else None
            size = variant_data.get("size") or None
            color_code, color_name, color_obj = self._ensure_color_reference(
                variant_data.get("color_code"), variant_data.get("color_name")
            )

            if variant_id and variant_id in existing_variants:
                variant = existing_variants[variant_id]
                variant.size = size
                variant.price = variant_data.get("price", variant.price)
                variant.stock = variant_data.get("stock", variant.stock)
                variant.discount = variant_data.get("discount", variant.discount)
                variant.color = color_obj
                variant.color_code = color_code
                variant.color_name = color_name
                variant.save()
                existing_combinations.add((color_code, size))
            else:
                if (color_code, size) in existing_combinations:
                    raise ValidationError(
                        f"Variant with the same color/size already exists for this product."
                    )
                payload = {
                    "product": product.id,
                    "color": color_obj.color_code if color_obj else None,
                    "color_code": color_code,
                    "color_name": color_name,
                    "size": size,
                    "price": variant_data.get("price"),
                    "stock": variant_data.get("stock"),
                    "discount": variant_data.get("discount"),
                }
                variant_serializer = ProductVariantSerializer(data=payload)
                variant_serializer.is_valid(raise_exception=True)
                variant_serializer.save()
                existing_combinations.add((color_code, size))

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def recommended(self, request):
        recommended_products = get_recommended_products(request.user)
        serializer = self.get_serializer(recommended_products, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], permission_classes=[AllowAny])
    def trending(self, request):
        trending_products = self.get_trending_products()
        serializer = self.get_serializer(trending_products, many=True)
        return Response(serializer.data)

    def get_trending_products(self):
        past_week = timezone.now() - timezone.timedelta(days=7)
        trending_keywords = (
            SearchHistory.objects.filter(search_date__gte=past_week)
            .values("keyword")
            .annotate(count=Count("keyword"))
            .order_by("-count")[:5]
        )
        if trending_keywords:
            keyword = trending_keywords[0]["keyword"]
            trending_products = Product.objects.filter(
                Q(product_name__icontains=keyword)
            ).distinct()[:10]
        else:
            trending_products = Product.objects.none()
        return trending_products

    @action(detail=False, methods=["get"], permission_classes=[AllowAny])
    def get_products_by_ids(self, request):
        ids = request.query_params.get("ids", None)
        all_flag = request.query_params.get("all", "false").lower() == "true"
        if ids:
            ids_list = ids.split(",")
            queryset = self.queryset.filter(id__in=ids_list)
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = (
                    self.get_serializer(
                        page,
                        many=True,
                        context={"request": request, "is_detail": False},
                    )
                    if all_flag
                    else ProductByIdsSerializer(
                        page,
                        many=True,
                        context={"request": request, "is_detail": False},
                    )
                )
                return self.get_paginated_response(serializer.data)
            serializer = (
                self.get_serializer(
                    queryset,
                    many=True,
                    context={"request": request, "is_detail": False},
                )
                if all_flag
                else ProductByIdsSerializer(
                    queryset,
                    many=True,
                    context={"request": request, "is_detail": False},
                )
            )
            return Response(serializer.data)
        else:
            return Response(
                {"error": "No IDs provided"}, status=status.HTTP_400_BAD_REQUEST
            )

    @encrypt_response
    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def checkout_products(self, request):
        ids = request.query_params.get("ids", None)
        all_flag = request.query_params.get("all", "false").lower() == "true"
        if ids:
            ids_list = ids.split(",")
            queryset = self.queryset.filter(id__in=ids_list)
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = (
                    self.get_serializer(
                        page,
                        many=True,
                        context={"request": request, "is_detail": False},
                    )
                    if all_flag
                    else ProductByIdsSerializer(
                        page,
                        many=True,
                        context={"request": request, "is_detail": False},
                    )
                )
                return self.get_paginated_response(serializer.data)
            serializer = (
                self.get_serializer(
                    queryset,
                    many=True,
                    context={"request": request, "is_detail": False},
                )
                if all_flag
                else ProductByIdsSerializer(
                    queryset,
                    many=True,
                    context={"request": request, "is_detail": False},
                )
            )
            return Response(serializer.data)
        else:
            return Response(
                {"error": "No IDs provided"}, status=status.HTTP_400_BAD_REQUEST
            )

    @method_decorator(cache_page(60 * 15))
    def retrieve(self, request, *args, **kwargs):
        productslug = request.query_params.get("productslug")
        if productslug:
            instance = get_object_or_404(self.get_queryset(), productslug=productslug)
        else:
            instance = self.get_object()
        serializer = self.get_serializer(
            instance, context={"request": request, "is_detail": True}
        )
        return Response(serializer.data)

    def list(self, request, *args, **kwargs):
        productslug = request.query_params.get("productslug")
        if productslug:
            instance = get_object_or_404(self.get_queryset(), productslug=productslug)
            serializer = self.get_serializer(
                instance, context={"request": request, "is_detail": True}
            )
            return Response(serializer.data)
        else:
            queryset = self.filter_queryset(self.get_queryset())
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(
                    page, many=True, context={"request": request, "is_detail": False}
                )
                return self.get_paginated_response(serializer.data)

            serializer = self.get_serializer(
                queryset, many=True, context={"request": request, "is_detail": False}
            )
            return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.deactive = not instance.deactive
        instance.save()
        return Response(
            {"message": "Product deleted successfull"}, status=status.HTTP_200_OK
        )


def get_recommended_products(self, user):
    search_history = SearchHistory.objects.filter(user=user).values_list(
        "keyword", flat=True
    )
    if not search_history:
        return Product.objects.order_by("?")[:5]
    keyword_counter = Counter(search_history)
    most_searched_keywords = [keyword for keyword, _ in keyword_counter.most_common(3)]
    query = Q()
    for keyword in most_searched_keywords:
        query |= Q(product_name__icontains=keyword)
    recommended_products = Product.objects.filter(query).distinct()[:10]
    return recommended_products


class TrendingView(APIView):
    def get(self, request, format=None):
        past_week = timezone.now() - timezone.timedelta(days=7)
        trending_keywords = (
            SearchHistory.objects.filter(search_date__gte=past_week)
            .values("keyword")
            .annotate(count=Count("keyword"))
            .order_by("-count")[:5]
        )
        if not trending_keywords:
            trending_keywords = (
                SearchHistory.objects.values("keyword")
                .annotate(count=Count("keyword"))
                .order_by("-count")[:5]
            )

        if trending_keywords:
            keyword = trending_keywords[0]["keyword"]
            trending_products = Product.objects.filter(
                Q(product_name__icontains=keyword)
            ).distinct()
        else:
            trending_products = Product.objects.none()
        if not trending_products.exists():
            trending_products = Product.objects.order_by("-id")[:4]
        serializer = ProductSerializer(
            trending_products,
            many=True,
            context={"request": request, "is_detail": False},
        )
        return Response(serializer.data, status=status.HTTP_200_OK)


class RecommendationView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, format=None):
        if request.user.is_authenticated:
            product_id = request.query_params.get("product_id")
            user = request.user
            recommended_products = self.get_recommended_products(user, product_id)
        else:
            product_id = request.query_params.get("product_id")
            if product_id:
                recommended_products = self.get_similar_products(product_id)
                if isinstance(recommended_products, Response):
                    return recommended_products
            else:
                return Response(
                    {"detail": "Product ID is required for unauthenticated users."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        serializer = ProductSerializer(
            recommended_products,
            many=True,
            context={"request": request, "is_detail": False},
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    def get_similar_products(self, product_id):
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response(
                {"detail": "Product not found."}, status=status.HTTP_404_NOT_FOUND
            )
        similar_products = Product.objects.filter(category=product.category).exclude(
            id=product_id
        )[:10]
        return similar_products

    def get_recommended_products(self, user, product_id=None):
        search_history = SearchHistory.objects.filter(user=user).values_list(
            "keyword", flat=True
        )
        if not search_history:
            return Product.objects.order_by("?")[:5]
        keyword_counter = Counter(search_history)
        most_searched_keywords = [
            keyword for keyword, _ in keyword_counter.most_common(3)
        ]
        query = Q()
        for keyword in most_searched_keywords:
            query |= Q(product_name__icontains=keyword)
        recommended_products = Product.objects.filter(query).distinct()
        if product_id:
            recommended_products = recommended_products.exclude(id=product_id)
        return recommended_products[:10]


class ProductVariantViewSet(viewsets.ModelViewSet):
    queryset = ProductVariant.objects.select_related("product", "color").all()
    serializer_class = ProductVariantSerializer
    permission_classes = [IsAdminOrReadOnly]

    def _normalize_color_code(self, color_code):
        if not color_code:
            return None
        normalized = color_code.strip().upper()
        if not normalized.startswith("#"):
            normalized = f"#{normalized}"
        return normalized

    def _ensure_color_reference(self, color_code, color_name=None):
        normalized = self._normalize_color_code(color_code)
        if not normalized:
            return None, None
        defaults = {"color_name": color_name or "Color"}
        color_obj, _ = ProductColor.objects.get_or_create(
            color_code=normalized, defaults=defaults
        )
        if color_name and color_obj.color_name != color_name:
            color_obj.color_name = color_name
            color_obj.save(update_fields=["color_name"])
        return normalized, color_obj

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if data.get("color_code") or data.get("color"):
            normalized_code, color_obj = self._ensure_color_reference(
                data.get("color_code") or data.get("color"), data.get("color_name")
            )
            data["color_code"] = normalized_code
            data["color"] = color_obj.color_code if color_obj else None

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        data = request.data
        if data.get("color_code") or data.get("color"):
            normalized_code, color_obj = self._ensure_color_reference(
                data.get("color_code") or data.get("color"), data.get("color_name")
            )
            data = data.copy()
            data["color_code"] = normalized_code
            data["color"] = color_obj.color_code if color_obj else None
        serializer = self.get_serializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Send restock notification emails with actual product data
        notify_users = NotifyUser.objects.filter(variant=instance.id).select_related(
            "product"
        )
        if notify_users.exists():
            product = instance.product
            product_image = None
            if product and product.images.exists():
                first_img = product.images.first()
                if first_img and first_img.image:
                    product_image = request.build_absolute_uri(first_img.image.url)

            from django.conf import settings

            frontend_url = getattr(
                settings, "FRONTEND_URL", "https://alphasuits.com.np"
            ).rstrip("/")
            product_url = (
                f"{frontend_url}/collections/{product.productslug}"
                if product
                else frontend_url
            )

            context = {
                "product_name": product.product_name if product else "Your item",
                "product_image": product_image,
                "product_price": str(instance.price) if instance.price else None,
                "variant_name": instance.size
                or (instance.color_name if hasattr(instance, "color_name") else None),
                "product_url": product_url,
            }

            emails = [nu.email for nu in notify_users if nu.email]
            if emails:
                subject = "You asked, we restocked ✨"
                body = render_to_string("restockitem.html", context)
                send_email(subject, emails, body)
            notify_users.delete()

        return Response({"message": "Variant Updated"}, status=status.HTTP_200_OK)

    def destroy(self, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response({"message": "Variant Deleted"}, status=status.HTTP_200_OK)


class ProductImageViewSet(viewsets.ModelViewSet):
    queryset = ProductImage.objects.all()
    serializer_class = ProductImageSerializer
    permission_classes = [IsAdminOrReadOnly]

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Image Updated"}, status=status.HTTP_200_OK)

    def destroy(self, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response({"message": "Image Removed"}, status=status.HTTP_200_OK)


class ReviewPostViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.select_related("product", "user").all().order_by("-id")
    serializer_class = ReviewWriteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def _get_eligible_purchase_count(self, user, product):
        """
        Count distinct completed purchase transactions for this user+product.
        Only sales with delivered/successful status count as eligible.
        """
        eligible_statuses = ["delivered", "successful"]
        return (
            Saled_Products.objects.filter(
                transition__costumer_name=user,
                transition__status__in=eligible_statuses,
                product=product,
            )
            .values("transition")
            .distinct()
            .count()
        )

    def create(self, request, *args, **kwargs):
        user = request.user

        # Build a plain dict from request data — avoid QueryDict.copy()
        # which deep-copies and chokes on unpicklable TemporaryUploadedFile handles
        data = {
            "user": user.id,
            "rating": request.data.get("rating"),
            "title": request.data.get("title"),
            "content": request.data.get("content"),
            "recommended": request.data.get("recommended"),
            "delivery": request.data.get("delivery"),
        }

        product_slug = request.data.get("product_slug")
        try:
            product = Product.objects.get(productslug=product_slug)
        except Product.DoesNotExist:
            return Response(
                {"error": "Product not found."}, status=status.HTTP_404_NOT_FOUND
            )
        data["product"] = product.id

        eligible_purchases = self._get_eligible_purchase_count(user, product)
        if eligible_purchases == 0:
            return Response(
                {"error": "You can only review products you have purchased."},
                status=status.HTTP_403_FORBIDDEN,
            )

        existing_reviews = Review.objects.filter(user=user, product=product).count()
        if existing_reviews >= eligible_purchases:
            return Response(
                {
                    "error": "You have already reviewed this product for all your purchases."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)

        try:
            with transaction.atomic():
                review = serializer.save()
                image = request.FILES.get("image")
                if image:
                    if hasattr(image, "seek"):
                        image.seek(0)
                    image_data = {"review": review.id, "image": image}
                    image_serializer = ReviewImageWriteSerializer(data=image_data)
                    image_serializer.is_valid(raise_exception=True)
                    image_serializer.save()
        except ValidationError:
            raise  # Let DRF handle its own ValidationError normally
        except DjangoValidationError as e:
            error_msg = e.message if hasattr(e, "message") else str(e)
            return Response(
                {"error": error_msg},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"msg": "Review Posted Successfully"}, status=status.HTTP_201_CREATED
        )

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        data = request.data
        if (
            request.user.id != instance.user.id
            and request.user.role != "Admin"
            and request.user.role != "Staff"
        ):
            return Response(
                {"detail": "You are not authorized to update this review data."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = self.get_serializer(instance, data=data)
        if serializer.is_valid(raise_exception=True):
            with transaction.atomic():
                self.perform_update(serializer)
                image = request.FILES.get("image")
                if image:
                    try:
                        review_image = ReviewImageWriteSerializer(
                            review=instance, image=image
                        )
                        review_image.save()
                    except Exception as e:
                        transaction.set_rollback(True)
                        raise e
        return Response(
            {"msg": "Review Updated Successfully"}, status=status.HTTP_200_OK
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if request.user.role != "Admin" and request.user.role != "Staff":
            return Response(
                {"detail": "You are not authorized to delete this review data."},
                status=status.HTTP_403_FORBIDDEN,
            )
        # Fixed: was a tuple bug (trailing comma made subject a tuple)
        subject = "Your review has been removed"
        body = render_to_string(
            "reviewrejected.html", {"remark": request.data.get("remark")}
        )
        send_email(subject, instance.user.email, body)
        self.perform_destroy(instance)
        return Response(
            {"msg": "Review Deleted Successfully"}, status=status.HTTP_200_OK
        )

    @action(detail=False, methods=["patch"], permission_classes=[IsAuthenticated])
    def update_reviews(self, request, *args, **kwargs):
        instance = self.get_object()
        data = request.data
        if (
            request.user.id != instance.user.id
            and request.user.role != "Admin"
            and request.user.role != "Staff"
        ):
            return Response(
                {"detail": "You are not authorized to update this review data."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = self.get_serializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"msg": "Review Updated Successfully"}, status=status.HTTP_200_OK
        )

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def verify_review(self, request, *args, **kwargs):
        instance = self.get_object()
        data = {"verified": True}
        if request.user.role != "Admin" and request.user.role != "Staff":
            return Response(
                {"detail": "You are not authorized to verify this review data."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = self.get_serializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"msg": "Review Verified Successfully"}, status=status.HTTP_200_OK
        )


class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.select_related("product", "user").all().order_by("-id")
    serializer_class = ReviewSerializer
    pagination_class = StandardResultsSetPagination

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.AllowAny()]
        if self.action in ["get_user_reviews", "pending_reviews"]:
            return [IsAuthenticated()]
        # Admin-only for everything else (update, destroy, etc.)
        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = super().get_queryset()
        product_slug = self.kwargs.get("product_slug")
        star = self.request.query_params.get("star")
        review_filter = self.request.query_params.get("filter")
        search = self.request.query_params.get("search")

        # When accessed via /reviews/{slug}/data/ — filter by product
        if product_slug:
            queryset = queryset.filter(product__productslug=product_slug)
        else:
            # Admin-only listing (no product_slug means admin review list)
            user = self.request.user
            if not (
                user.is_authenticated
                and (user.role in ("Admin", "Staff") or user.is_superuser)
            ):
                from rest_framework.exceptions import PermissionDenied

                raise PermissionDenied("You are not authorized to view all reviews.")

        if star and star != "0":
            queryset = queryset.filter(rating=int(star))

        if search:
            queryset = queryset.filter(
                Q(product__product_name__icontains=search)
                | Q(user__username__icontains=search)
                | Q(user__first_name__icontains=search)
            )

        if review_filter == "recent":
            queryset = queryset.order_by("-created_at")
        elif review_filter == "rating":
            queryset = queryset.order_by("-rating")

        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset().filter(verified=True)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(
                page, many=True, context={"request": request}
            )
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def get_user_reviews(self, request, *args, **kwargs):
        user = request.user
        if not user:
            return Response(
                {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )
        reviews = self.get_queryset()
        if user.is_staff:
            reviews = reviews
        else:
            reviews = reviews.filter(user=user)
        page = self.paginate_queryset(reviews)
        if page is not None:
            serializer = ReviewWithProductSerializer(
                page, many=True, context={"request": request}
            )
            return self.get_paginated_response(serializer.data)
        serializer = ReviewWithProductSerializer(
            reviews, many=True, context={"request": request}
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(
        detail=False,
        methods=["get"],
        permission_classes=[IsAuthenticated],
        url_path="pending-reviews",
    )
    def pending_reviews(self, request, *args, **kwargs):
        """
        Returns products the user has purchased (delivered/successful) but
        has NOT yet reviewed, grouped by distinct purchase transaction.
        Each entry represents one review opportunity.
        """
        user = request.user
        eligible_statuses = ["delivered", "successful"]

        # Get all delivered sale-product entries for this user
        sale_products = (
            Saled_Products.objects.filter(
                transition__costumer_name=user,
                transition__status__in=eligible_statuses,
            )
            .select_related("product", "transition", "product__category")
            .prefetch_related("product__images")
        )

        # Build a dict: product_id -> list of transition_ids (distinct purchases)
        product_purchases = {}
        for sp in sale_products:
            if sp.product is None:
                continue
            pid = sp.product.id
            tid = sp.transition_id
            if pid not in product_purchases:
                product_purchases[pid] = {"product": sp.product, "transitions": set()}
            product_purchases[pid]["transitions"].add(tid)

        # Count existing reviews per product for this user
        existing_review_counts = dict(
            Review.objects.filter(user=user)
            .values_list("product_id")
            .annotate(cnt=Count("id"))
            .values_list("product_id", "cnt")
        )

        # Build pending review list
        pending = []
        for pid, info in product_purchases.items():
            eligible_count = len(info["transitions"])
            reviewed_count = existing_review_counts.get(pid, 0)
            remaining = eligible_count - reviewed_count
            if remaining > 0:
                product = info["product"]
                first_image = product.images.first()
                pending.append(
                    {
                        "product_id": product.id,
                        "product_name": product.product_name,
                        "productslug": product.productslug,
                        "category_name": (
                            product.category.name if product.category else ""
                        ),
                        "product_image": (
                            request.build_absolute_uri(first_image.image.url)
                            if first_image and first_image.image
                            else None
                        ),
                        "remaining_reviews": remaining,
                    }
                )

        return Response(pending, status=status.HTTP_200_OK)


class NotifyUserViewSet(viewsets.ModelViewSet):
    queryset = NotifyUser.objects.select_related("product", "user").all()
    serializer_class = NotifyUserSerializer

    # Block PUT, PATCH, DELETE for everyone except admin
    http_method_names = ["get", "post", "head", "options"]

    def get_permissions(self):
        if self.action in ["create", "list", "retrieve"]:
            return [AllowAny()]
        # Admin only for everything else
        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = super().get_queryset()
        product_id = self.request.query_params.get("product_id")
        variant = self.request.query_params.get("variant")

        if product_id:
            queryset = queryset.filter(product_id=product_id)
        if variant:
            queryset = queryset.filter(variant=variant)

        return queryset

    def create(self, request, *args, **kwargs):
        email = request.data.get("email")
        product_id = request.data.get("product")
        variant_id = request.data.get("variant")

        if not email or not product_id:
            return Response(
                {"error": "Email and product are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        product = get_object_or_404(Product, id=product_id)
        user = request.user if request.user.is_authenticated else None

        # Prevent duplicate: 1 email per product+variant combination
        existing = NotifyUser.objects.filter(
            email=email, product=product, variant_id=variant_id
        ).exists()
        if existing:
            return Response(
                {"error": "You are already on the notification list for this item."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        notify_user = NotifyUser.objects.create(
            product=product, variant_id=variant_id, user=user, email=email
        )
        serializer = self.get_serializer(notify_user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def list(self, request, *args, **kwargs):
        product_id = request.query_params.get("product")
        variant = request.query_params.get("variant")
        user = request.user if request.user.is_authenticated else None

        # If checking for a specific product+variant, return whether user already requested
        if product_id and variant:
            if user:
                exists = NotifyUser.objects.filter(
                    product_id=product_id, variant=variant, user=user
                ).exists()
                return Response({"requested": exists})
            else:
                return Response({"requested": False})

        # Full list: admin only
        if not (user and (user.is_superuser or user.role in ("Admin", "Staff"))):
            return Response(
                {"detail": "Admin access required for full listing."},
                status=status.HTTP_403_FORBIDDEN,
            )

        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class AddToCartViewSet(viewsets.ModelViewSet):
    queryset = Cart.objects.select_related("product", "variant", "user").all()
    serializer_class = AddtoCartSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        items = request.data.get("items", [])
        user = request.user
        cart_items = []

        for item in items:
            product = get_object_or_404(Product, id=item["id"])
            variant = get_object_or_404(ProductVariant, id=item["variantId"])
            pcs = item["pcs"]
            existing_cart_item = Cart.objects.filter(
                user=user, product=product, variant=variant
            )
            if existing_cart_item.exists():
                existing_cart_item.delete()
            cart_item = Cart(user=user, product=product, variant=variant, pcs=pcs)
            cart_items.append(cart_item)

        Cart.objects.bulk_create(cart_items)
        return Response({"msg": "Added to Cart"}, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        serializer.save()

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        data = request.data
        instance = Cart.objects.get(
            user=request.user, product_id=data["product"], variant_id=data["variant"]
        )
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        if serializer.validated_data["pcs"] > instance.variant.stock:
            return Response(
                {"error": "Not enough stock available"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        self.perform_update(serializer)
        return Response({"msg": "Cart Updated"}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["delete"], permission_classes=[IsAuthenticated])
    def cartdestroy(self, request, *args, **kwargs):
        user = request.user
        product_id = kwargs.get("product_id")
        variant_id = kwargs.get("variant_id")

        if not product_id or not variant_id:
            return Response(
                {"error": "Product ID or Variant ID not provided"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            cart_item = Cart.objects.get(
                user=user, product_id=product_id, variant_id=variant_id
            )
            cart_item.delete()
            return Response(
                {"msg": "Item removed from cart"}, status=status.HTTP_200_OK
            )
        except Cart.DoesNotExist:
            return Response(
                {"error": "Item not found in cart"}, status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=["delete"], permission_classes=[IsAuthenticated])
    def clearcart(self, request, *args, **kwargs):
        deleted_count, _ = Cart.objects.filter(user=request.user).delete()
        message = (
            f"Successfully removed {deleted_count} item(s) from the cart"
            if deleted_count > 0
            else "Cart is already empty"
        )
        return Response({"message": message}, status=status.HTTP_200_OK)


class StocksView(APIView):
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def check_permissions(self, request):
        super().check_permissions(request)
        if not request.user.is_staff and not request.user.is_superuser:
            self.permission_denied(request, message="Admin access required.")

    def get(self, request, *args, **kwargs):
        low_stock_products = Product.objects.filter(
            productvariant__stock__lt=5
        ).distinct()
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(low_stock_products, request)
        serializer = LowStockProductSerializer(
            page, many=True, context={"request": request}
        )
        return paginator.get_paginated_response(serializer.data)
