from django.core.management.base import BaseCommand

from account.seed import seed_initial_data


class Command(BaseCommand):
    help = "Seed RBAC permissions, roles, optional admin user, and default layout data."

    def handle(self, *args, **options):
        seed_initial_data()
        self.stdout.write(self.style.SUCCESS("Initial seed data is ready."))
