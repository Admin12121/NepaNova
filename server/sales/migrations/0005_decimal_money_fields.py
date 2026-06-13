from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("sales", "0004_sales_order_source_created_by_direct_purchase"),
    ]

    operations = [
        migrations.AlterField(
            model_name="sales",
            name="discount",
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=12, null=True
            ),
        ),
        migrations.AlterField(
            model_name="sales",
            name="sub_total",
            field=models.DecimalField(decimal_places=2, max_digits=12),
        ),
        migrations.AlterField(
            model_name="sales",
            name="total_amt",
            field=models.DecimalField(decimal_places=2, max_digits=12),
        ),
        migrations.AlterField(
            model_name="saled_products",
            name="price",
            field=models.DecimalField(decimal_places=2, max_digits=12),
        ),
        migrations.AlterField(
            model_name="saled_products",
            name="qty",
            field=models.DecimalField(decimal_places=2, max_digits=10),
        ),
        migrations.AlterField(
            model_name="saled_products",
            name="total",
            field=models.DecimalField(decimal_places=2, max_digits=12),
        ),
    ]
