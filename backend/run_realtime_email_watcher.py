#!/usr/bin/env python
"""
Real-time email watcher - Runs forever, never dies
Usage: python run_realtime_email_watcher.py
"""
import os
import sys
import django
import logging
import time

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from tickets.email_handler import email_handler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def run_forever():
    """Run email watcher with infinite retries"""
    logger.info("=" * 60)
    logger.info("📧 REAL-TIME EMAIL WATCHER")
    logger.info("   This process will run FOREVER")
    logger.info("   Will auto-reconnect if connection drops")
    logger.info("=" * 60)
    
    while True:
        try:
            # This will run until connection drops
            email_handler.watch_emails_realtime()
        except KeyboardInterrupt:
            logger.info("Received interrupt, shutting down...")
            break
        except Exception as e:
            logger.error(f"Email watcher crashed: {e}")
            logger.info("Restarting in 10 seconds...")
            time.sleep(10)
            continue

if __name__ == "__main__":
    run_forever()