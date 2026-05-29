from django.core.management.base import BaseCommand

from sales.services.pickdrop import process_pending_shipments


class Command(BaseCommand):
    help = "Process queued Pick & Drop shipment bookings."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=20)

    def handle(self, *args, **options):
        result = process_pending_shipments(limit=options["limit"])
        self.stdout.write(
            self.style.SUCCESS(
                "Pick & Drop shipment processing complete: "
                f"{result['processed']} processed, {result['failed']} failed."
            )
        )
