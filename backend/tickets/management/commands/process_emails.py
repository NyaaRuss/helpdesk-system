"""
Django management command to process emails from command line
Run with: python manage.py process_emails
"""
from django.core.management.base import BaseCommand
from tickets.email_handler import email_handler
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Process incoming emails to create tickets and comments'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--once',
            action='store_true',
            help='Process emails only once and exit',
        )
    
    def handle(self, *args, **options):
        self.stdout.write("Starting email processing...")
        
        result = email_handler.process_incoming_emails()
        
        if result.get('error'):
            self.stdout.write(self.style.ERROR(f"Error: {result['error']}"))
        else:
            self.stdout.write(self.style.SUCCESS(
                f"Processed: {result.get('processed', 0)} emails, "
                f"Created: {result.get('tickets_created', 0)} tickets, "
                f"Added: {result.get('comments_added', 0)} comments"
            ))
        
        if not options.get('once'):
            self.stdout.write("Email processing completed")