"""
Email watcher service that runs as a background thread
Integrated with Django's runserver command
"""
import threading
import time
import logging
from django.core.management import call_command
from django.conf import settings

logger = logging.getLogger(__name__)

class EmailWatcherThread(threading.Thread):
    """Background thread for email watching that never dies"""
    
    def __init__(self):
        super().__init__(daemon=True)
        self.running = True
        self.name = "EmailWatcherThread"
        
    def run(self):
        """Run the email watcher continuously"""
        from tickets.email_handler import email_handler
        
        logger.info("=" * 60)
        logger.info("📧 EMAIL WATCHER THREAD STARTED")
        logger.info("   Running in background - will never close")
        logger.info("   Only processes REAL support requests")
        logger.info("=" * 60)
        
        # Initial delay to let Django fully start
        time.sleep(3)
        
        while self.running:
            try:
                # Use the watch_emails_realtime method which stays connected
                email_handler.watch_emails_realtime_with_reconnect()
                
            except Exception as e:
                logger.error(f"Email watcher crashed: {e}")
                logger.info("Restarting email watcher in 10 seconds...")
                time.sleep(10)
                
    def stop(self):
        """Stop the email watcher"""
        self.running = False
        logger.info("Email watcher stopping...")


# Global instance
_email_watcher = None

def start_email_watcher():
    """Start the email watcher background thread"""
    global _email_watcher
    
    if _email_watcher is None or not _email_watcher.is_alive():
        _email_watcher = EmailWatcherThread()
        _email_watcher.start()
        return True
    return False

def stop_email_watcher():
    """Stop the email watcher"""
    global _email_watcher
    if _email_watcher:
        _email_watcher.stop()
        _email_watcher = None