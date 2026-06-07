from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("sales", "0003_alter_sales_transactionuid"),
    ]

    operations = [
        migrations.AddField(
            model_name="sales",
            name="created_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="created_sales_orders",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="sales",
            name="direct_purchase",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="sales",
            name="order_source",
            field=models.CharField(
                choices=[
                    ("web_checkout", "Web checkout"),
                    ("pos_web", "Web POS"),
                    ("pos_local", "Local POS"),
                ],
                default="web_checkout",
                max_length=20,
            ),
        ),
    ]
