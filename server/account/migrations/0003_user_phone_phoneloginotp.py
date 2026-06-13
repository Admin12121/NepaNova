from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("account", "0002_emailoutbox"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="phone",
            field=models.CharField(
                blank=True, max_length=15, null=True, unique=True
            ),
        ),
        migrations.CreateModel(
            name="PhoneLoginOtp",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("phone", models.CharField(db_index=True, max_length=15)),
                ("otp_hash", models.CharField(max_length=255)),
                ("attempts", models.PositiveSmallIntegerField(default=0)),
                ("expires_at", models.DateTimeField(db_index=True)),
                ("consumed_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(
                        fields=["phone", "created_at"],
                        name="account_pho_phone_0e063d_idx",
                    ),
                    models.Index(
                        fields=["phone", "consumed_at", "expires_at"],
                        name="account_pho_phone_8d0d2a_idx",
                    ),
                ],
            },
        ),
    ]
