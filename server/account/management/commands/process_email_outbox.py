from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from account.models import EmailOutbox
from account.utils import send_email


class Command(BaseCommand):
    help = "Retry pending email outbox jobs."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=20)

    def handle(self, *args, **options):
        limit = max(1, options["limit"])
        now = timezone.now()
        job_ids = list(
            EmailOutbox.objects.filter(
                status=EmailOutbox.STATUS_PENDING,
                next_attempt_at__lte=now,
            )
            .order_by("created_at")
            .values_list("id", flat=True)[:limit]
        )

        sent_count = 0
        failed_count = 0
        for job_id in job_ids:
            with transaction.atomic():
                job = EmailOutbox.objects.select_for_update().get(id=job_id)
                if (
                    job.status != EmailOutbox.STATUS_PENDING
                    or job.next_attempt_at > timezone.now()
                ):
                    continue
                job.attempts += 1
                job.save(update_fields=["attempts", "updated_at"])

            sent = send_email(
                job.subject,
                job.recipients,
                job.body,
                queue_on_failure=False,
            )

            if sent:
                job.status = EmailOutbox.STATUS_SENT
                job.sent_at = timezone.now()
                job.last_error = ""
                sent_count += 1
            else:
                failed_count += 1
                if job.attempts >= 5:
                    job.status = EmailOutbox.STATUS_FAILED
                job.last_error = "Email send failed during outbox retry."
                delay_minutes = min(60, 2**job.attempts)
                job.next_attempt_at = timezone.now() + timedelta(minutes=delay_minutes)

            job.save(
                update_fields=[
                    "status",
                    "sent_at",
                    "last_error",
                    "next_attempt_at",
                    "updated_at",
                ]
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Processed {len(job_ids)} email job(s): {sent_count} sent, {failed_count} pending/failed."
            )
        )
