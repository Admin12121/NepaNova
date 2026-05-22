import os
import re

from django.core.exceptions import ValidationError
from django.core.validators import (
    FileExtensionValidator,
    MaxValueValidator,
    MinValueValidator,
)
from django.db import models
from django.db.models import Q

from account.models import User

from .utils import *


class Category(models.Model):
    name = models.CharField(max_length=255, unique=True)
    categoryslug = models.CharField(max_length=100, null=True, blank=True, unique=True)

    def save(self, *args, **kwargs):
        if not self.categoryslug:
            self.categoryslug = generate_slug(self.name)
        super().save(*args, **kwargs)


class Product(models.Model):
    product_name = models.CharField(max_length=255)
    description = models.TextField()
    deactive = models.BooleanField(default=False)
    category = models.ForeignKey(
        Category, on_delete=models.SET_NULL, blank=True, null=True
    )
    productslug = models.CharField(max_length=100, null=True, blank=True, unique=True)

    def save(self, *args, **kwargs):
        if not self.productslug:
            self.productslug = generate_unique_slug(self.product_name, Product)
        super().save(*args, **kwargs)

    class Meta:
        indexes = [
            models.Index(fields=["id", "product_name", "productslug"]),
            models.Index(fields=["category"]),
        ]

    def get_average_rating(self):
        reviews = self.reviews.all()
        if reviews.exists():
            return reviews.aggregate(models.Avg("rating"))["rating__avg"]
        return None

    def get_total_ratings(self):
        return self.reviews.count()


class ProductColor(models.Model):
    color_code = models.CharField(max_length=7, primary_key=True)
    color_name = models.CharField(max_length=50)
    image = models.ImageField(upload_to="product_colors/", null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["color_code"]),
            models.Index(fields=["color_name"]),
        ]
        verbose_name = "Color"
        verbose_name_plural = "Colors"

    def save(self, *args, **kwargs):
        if self.color_code:
            normalized = self._normalize_color(self.color_code)
            self.color_code = normalized
        super().save(*args, **kwargs)

    def _normalize_color(self, value):
        value = value.strip().upper()
        if not value.startswith("#"):
            value = f"#{value}"
        return value

    def __str__(self):
        return f"{self.color_name} ({self.color_code})"


class ProductVariant(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    color = models.ForeignKey(
        ProductColor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="variants",
        to_field="color_code",
    )
    color_code = models.CharField(max_length=7, null=True, blank=True)
    color_name = models.CharField(max_length=50, null=True, blank=True)
    size = models.CharField(max_length=50, null=True, blank=True)
    price = models.DecimalField(
        max_digits=10, decimal_places=2, validators=[MinValueValidator(0)]
    )
    discount = models.IntegerField(
        null=True, blank=True, validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    stock = models.PositiveIntegerField(validators=[MinValueValidator(0)])

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["product", "color_code", "size"],
                name="unique_product_color_size_variant",
            ),
        ]
        indexes = [
            models.Index(fields=["product", "color_code"]),
            models.Index(fields=["product", "color_code", "size"]),
        ]

    def clean(self):
        super().clean()
        if self.color_code == "":
            self.color_code = None
        if self.size == "":
            self.size = None
        if not self.color_code and not self.size:
            raise ValidationError(
                {"color_code": "Provide a color_code or a size for the variant."}
            )

        if self.color_code:
            normalized = self._normalize_color(self.color_code)
            if not re.match(r"^#[0-9A-F]{6}$", normalized):
                raise ValidationError(
                    {"color_code": "Invalid color code. Use #RRGGBB."}
                )
            self.color_code = normalized

        if self.color and not self.color_code:
            self.color_code = self.color.color_code
        if self.color and not self.color_name:
            self.color_name = self.color.color_name

        if self.color_code and self.color and self.color.color_code != self.color_code:
            raise ValidationError(
                {"color": "Color reference does not match color_code."}
            )

        if self.color_name:
            self.color_name = self.color_name.strip()

        # Enforce uniqueness constraints manually since MySQL doesn't support conditional unique constraints
        if self.color_code is None and self.size:
            if (
                ProductVariant.objects.filter(
                    product=self.product, size=self.size, color_code__isnull=True
                )
                .exclude(pk=self.pk)
                .exists()
            ):
                raise ValidationError(
                    "A variant with this size already exists for this product."
                )

        if self.size is None and self.color_code:
            if (
                ProductVariant.objects.filter(
                    product=self.product, color_code=self.color_code, size__isnull=True
                )
                .exclude(pk=self.pk)
                .exists()
            ):
                raise ValidationError(
                    "A variant with this color already exists for this product."
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def _normalize_color(self, value):
        value = value.strip().upper()
        if not value.startswith("#"):
            value = f"#{value}"
        return value


class ProductImage(models.Model):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="images"
    )
    color = models.ForeignKey(
        ProductColor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="product_images",
        to_field="color_code",
    )
    index = models.IntegerField(null=True, blank=True)
    image = models.ImageField(upload_to="product_images/")

    def delete(self, *args, **kwargs):
        # use storage.delete to support remote storage backends
        try:
            if self.image and self.image.name:
                self.image.storage.delete(self.image.name)
        except Exception:
            pass
        super().delete(*args, **kwargs)

    def save(self, *args, **kwargs):
        # Only enforce max images when creating a new image
        if self.pk is None and self.product.images.count() >= 5:
            raise ValidationError(
                "You can only upload a maximum of 5 images per product."
            )

        if self.image:
            self.image = compress_image(self.image)
        super().save(*args, **kwargs)


class NotifyUser(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="notify_user",
        null=True,
        blank=True,
    )
    variant = models.ForeignKey(
        ProductVariant, on_delete=models.SET_NULL, null=True, blank=True
    )  # was SmallIntegerField
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)


class Review(models.Model):
    product = models.ForeignKey(
        Product, related_name="reviews", on_delete=models.CASCADE
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)])
    title = models.CharField(max_length=255)
    content = models.TextField()
    verified = models.BooleanField(default=False)
    recommended = models.BooleanField(default=True)
    delivery = models.BooleanField(default=True)
    favoutare = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class ReviewImage(models.Model):
    review = models.ForeignKey(
        Review,
        on_delete=models.CASCADE,
        related_name="review_images",
        null=True,
        blank=True,
    )
    image = models.ImageField(
        upload_to="review/image/",
        null=True,
        validators=[FileExtensionValidator(allowed_extensions=["jpg", "jpeg", "png"])],
    )

    def save(self, *args, **kwargs):
        if self.image:
            self.image = compress_image(self.image, quality=85)
        super().save(*args, **kwargs)


class Cart(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="cart_user")
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, null=True, related_name="cart_product"
    )
    variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.SET_NULL,
        null=True,
        default=None,
        related_name="cart_product_variant",
    )
    pcs = models.IntegerField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if self.pcs is None or self.pcs <= 0:
            raise ValidationError("pcs must be a positive integer")
        if self.variant is None:
            raise ValidationError("variant must be specified")
        if self.pcs > self.variant.stock:
            raise ValidationError("Not enough stock available")
        super().save(*args, **kwargs)

    class Meta:
        unique_together = ("user", "variant")
