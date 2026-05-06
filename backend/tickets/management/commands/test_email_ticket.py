from django.core.management.base import BaseCommand
from tickets.email_handler import email_handler
from email.mime.text import MIMEText


class Command(BaseCommand):
    help = 'Test email to ticket creation without IMAP'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, help='Sender email address')
        parser.add_argument('--subject', type=str, help='Email subject')
        parser.add_argument('--body', type=str, help='Email body')

    def handle(self, *args, **options):
        email = options.get('email') or 'test@example.com'
        subject = options.get('subject') or 'Test Ticket from CLI'
        body = options.get('body') or 'This is a test ticket created from command line.'

        self.stdout.write(f"Creating test ticket from: {email}")
        self.stdout.write(f"Subject: {subject}")
        self.stdout.write(f"Body: {body[:100]}...")

        # Create a mock email message
        msg = MIMEText(body)
        msg['Subject'] = subject
        msg['From'] = email
        msg['Message-ID'] = f"test-cli-{email}-{subject}"

        result = email_handler.process_single_email(msg)

        if result.get('created'):
            self.stdout.write(self.style.SUCCESS(
                f"✅ Ticket created successfully!"
            ))
            self.stdout.write(self.style.SUCCESS(
                f"   Ticket Number: {result.get('ticket_number')}"
            ))
            self.stdout.write(self.style.SUCCESS(
                f"   Ticket ID: {result.get('ticket_id')}"
            ))
        elif result.get('comment_added'):
            self.stdout.write(self.style.SUCCESS(
                f"✅ Comment added to ticket: {result.get('ticket_number')}"
            ))
        elif result.get('error'):
            self.stdout.write(self.style.ERROR(
                f"❌ Error: {result.get('error')}"
            ))
        else:
            self.stdout.write(f"Result: {result}")