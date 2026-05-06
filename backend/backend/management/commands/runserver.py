"""
Custom runserver command that also starts email watcher
Usage: python manage.py runserver
"""
import threading
import sys
from django.core.management.commands.runserver import Command as BaseRunServerCommand
from django.core.management import call_command


class Command(BaseRunServerCommand):
    """Extended runserver command that starts email watcher in background"""
    
    def run(self, **options):
        """Start email watcher before running the server"""
        
        # Start email watcher in background thread
        try:
            from backend.email_watcher_service import start_email_watcher
            start_email_watcher()
            self.stdout.write(self.style.SUCCESS(
                "\n✅ Email watcher started in background thread"
            ))
            self.stdout.write(self.style.WARNING(
                "   Watching for new emails (will never close)"
            ))
            self.stdout.write(self.style.WARNING(
                "   Only REAL support requests will create tickets\n"
            ))
        except Exception as e:
            self.stdout.write(self.style.WARNING(
                f"⚠️ Email watcher not started: {e}"
            ))
        
        # Run the normal runserver
        super().run(**options)