from django.apps import AppConfig


class AccountConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "account"

    def ready(self):
        from django.db.models.signals import post_migrate

        from .seed import seed_initial_data

        post_migrate.connect(
            seed_initial_data,
            sender=self,
            dispatch_uid="account.seed_initial_data",
        )
