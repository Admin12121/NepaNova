from django.db.models import Avg
from rest_framework import serializers

from .models import *


class CategoryViewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = "__all__"


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "categoryslug"]


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = "__all__"
        extra_kwargs = {
            "color": {"required": False, "allow_null": True},
        }


class ProductColorSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = ProductColor
        fields = ["color_code", "color_name", "image"]

    def get_image(self, obj):
        if obj.image:
            request = self.context.get("request")
            return (
                request.build_absolute_uri(obj.image.url) if request else obj.image.url
            )
        return None


class ImageDataSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    color = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ["id", "image", "color"]

    def get_image(self, obj):
        request = self.context.get("request")
        return request.build_absolute_uri(obj.image.url) if request else obj.image.url

    def get_color(self, obj):
        if obj.color:
            return obj.color.color_code
        return None


class ProductVariantSerializer(serializers.ModelSerializer):
    color = serializers.SlugRelatedField(
        slug_field="color_code",
        queryset=ProductColor.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = ProductVariant
        fields = [
            "id",
            "product",
            "color",
            "color_code",
            "color_name",
            "size",
            "price",
            "discount",
            "stock",
        ]

    def validate_color_code(self, value):
        if value is None:
            return value
        normalized = value.strip().upper()
        if not normalized.startswith("#"):
            normalized = f"#{normalized}"
        import re

        if not re.match(r"^#[0-9A-F]{6}$", normalized):
            raise serializers.ValidationError("Invalid color code. Use #RRGGBB.")
        return normalized


class ProductSerializer(serializers.ModelSerializer):
    categoryname = serializers.SerializerMethodField()
    reviews = serializers.SerializerMethodField()
    rating = serializers.SerializerMethodField()
    total_ratings = serializers.SerializerMethodField()
    colors = serializers.SerializerMethodField()
    has_colors = serializers.SerializerMethodField()
    has_sizes = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = "__all__"

    def get_categoryname(self, obj):
        return obj.category.name if obj.category else None

    def get_reviews(self, obj):
        request = self.context.get("request")
        if request and request.method == "GET" and self.context.get("is_detail", False):
            reviews = obj.reviews.all().filter(favoutare=True, verified=True)
            return ReviewSerializer(reviews, many=True, context=self.context).data

    def get_rating(self, obj):
        verified_reviews = obj.reviews.filter(verified=True)
        if verified_reviews.exists():
            average_rating = verified_reviews.aggregate(Avg("rating"))["rating__avg"]
            return round(average_rating, 2) if average_rating is not None else None
        return None

    def get_total_ratings(self, obj):
        return obj.reviews.filter(verified=True).count()

    def get_colors(self, obj):
        color_values = (
            obj.productvariant_set.exclude(color_code__isnull=True)
            .exclude(color_code="")
            .values("color_code", "color_name")
            .distinct()
        )
        colors = []
        for color in color_values:
            color_obj = ProductColor.objects.filter(
                color_code=color["color_code"]
            ).first()
            colors.append(
                {
                    "color_code": color["color_code"],
                    "color_name": color["color_name"],
                    "image": ProductColorSerializer(
                        color_obj, context=self.context
                    ).data.get("image")
                    if color_obj
                    else None,
                }
            )
        return colors

    def get_has_colors(self, obj):
        return (
            obj.productvariant_set.exclude(color_code__isnull=True)
            .exclude(color_code="")
            .exists()
        )

    def get_has_sizes(self, obj):
        return (
            obj.productvariant_set.exclude(size__isnull=True).exclude(size="").exists()
        )

    def to_representation(self, instance):
        representation = super().to_representation(instance)

        request = self.context.get("request")
        if request and request.method == "GET":
            variants = instance.productvariant_set.select_related("color").all()
            images = instance.images.all()

            variants_data = ProductVariantSerializer(variants, many=True).data
            if len(variants_data) == 1:
                representation["variants"] = variants_data[0]
            else:
                representation["variants"] = variants_data
            representation["images"] = ImageDataSerializer(
                images, many=True, context=self.context
            ).data
            representation["categoryname"] = self.get_categoryname(instance)
            representation["colors"] = self.get_colors(instance)

        return representation


class ProductByIdsSerializer(serializers.ModelSerializer):
    categoryname = serializers.SerializerMethodField()
    colors = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = "__all__"

    def get_categoryname(self, obj):
        return obj.category.name if obj.category else None

    def get_colors(self, obj):
        color_values = (
            obj.productvariant_set.exclude(color_code__isnull=True)
            .exclude(color_code="")
            .values("color_code", "color_name")
            .distinct()
        )
        colors = []
        for color in color_values:
            color_obj = ProductColor.objects.filter(
                color_code=color["color_code"]
            ).first()
            colors.append(
                {
                    "color_code": color["color_code"],
                    "color_name": color["color_name"],
                    "image": ProductColorSerializer(
                        color_obj, context=self.context
                    ).data.get("image")
                    if color_obj
                    else None,
                }
            )
        return colors

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        request = self.context.get("request")
        if request and request.method == "GET":
            variants = instance.productvariant_set.all()
            images = instance.images.first()
            variants_data = ProductVariantSerializer(variants, many=True).data
            if len(variants_data) == 1:
                representation["variants"] = variants_data[0]
            else:
                representation["variants"] = variants_data
            representation["images"] = ImageDataSerializer(
                images, context=self.context
            ).data
            representation["categoryname"] = self.get_categoryname(instance)
            representation["colors"] = self.get_colors(instance)
        return representation


class ReviewWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = "__all__"


class ReviewImageWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReviewImage
        fields = "__all__"


class ReviewImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = ReviewImage
        fields = "__all__"

    def get_image(self, obj):
        request = self.context.get("request")
        if obj.image:
            return (
                request.build_absolute_uri(obj.image.url) if request else obj.image.url
            )
        return None


class ReviewSerializer(serializers.ModelSerializer):
    review_images = ReviewImageSerializer(many=True, read_only=True)
    user = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            "user",
            "verified",
            "rating",
            "title",
            "content",
            "recommended",
            "delivery",
            "review_images",
            "created_at",
        ]

    def get_user(self, obj):
        return obj.user.first_name if obj.user else None

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        request = self.context.get("request")
        if request and request.method == "GET":
            representation["review_images"] = ReviewImageSerializer(
                instance.review_images.all(), many=True, context=self.context
            ).data
        return representation


class NotifyUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotifyUser
        fields = "__all__"


class AddtoCartSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cart
        fields = "__all__"


class ReviewWithProductSerializer(serializers.ModelSerializer):
    product_name = serializers.SerializerMethodField()
    productslug = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
    product_image = serializers.SerializerMethodField()
    review_images = ReviewImageSerializer(many=True, read_only=True)

    class Meta:
        model = Review
        fields = [
            "id",
            "verified",
            "user",
            "rating",
            "title",
            "content",
            "recommended",
            "delivery",
            "review_images",
            "favoutare",
            "created_at",
            "product_name",
            "productslug",
            "category_name",
            "product_image",
        ]

    def get_product_name(self, obj):
        return obj.product.product_name if obj.product else None

    def get_productslug(self, obj):
        return obj.product.productslug if obj.product else None

    def get_category_name(self, obj):
        return (
            obj.product.category.name if obj.product and obj.product.category else None
        )

    def get_product_image(self, obj):
        request = self.context.get("request")
        image_instance = obj.product.images.first()
        if image_instance:
            return request.build_absolute_uri(image_instance.image.url)

        return None

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        request = self.context.get("request")
        if request and request.method == "GET":
            representation["review_images"] = ReviewImageSerializer(
                instance.review_images.all(), many=True, context=self.context
            ).data
        return representation


class NotifySerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()

    class Meta:
        model = NotifyUser
        fields = ["email", "user"]

    def get_user(self, obj):
        return obj.user.email if obj.user else None


class LowStockVariantSerializer(serializers.ModelSerializer):
    notify_users = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = [
            "id",
            "size",
            "color_code",
            "color_name",
            "price",
            "stock",
            "discount",
            "notify_users",
        ]

    def get_notify_users(self, obj):
        notify_users = NotifyUser.objects.filter(product=obj.product, variant=obj.id)
        return NotifySerializer(notify_users, many=True).data


class LowStockProductSerializer(serializers.ModelSerializer):
    low_stock_variants = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "product_name",
            "description",
            "category",
            "productslug",
            "image",
            "low_stock_variants",
        ]

    def get_low_stock_variants(self, obj):
        low_stock_variants = obj.productvariant_set.filter(stock__lt=5)
        return LowStockVariantSerializer(low_stock_variants, many=True).data

    def get_image(self, obj):
        first_image = obj.images.first()
        request = self.context.get("request")
        return (
            request.build_absolute_uri(first_image.image.url) if first_image else None
        )
