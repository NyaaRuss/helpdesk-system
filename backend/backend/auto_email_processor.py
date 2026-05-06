#!/usr/bin/env python
"""
Automatic email processor - runs continuously to check for new emails
Run with: python auto_email_processor.py
"""
import os
import sys
import time
import django
import logging
from datetime import datetime

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from tickets.email_handler import email_handler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('email_processor.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def process_emails_continuously(check_interval=60):
    """
    Continuously check for new emails
    check_interval: seconds between checks (default 60 seconds)
    """
    logger.info("=" * 60)
    logger.info("Auto Email Processor Started")
    logger.info(f"Checking for new emails every {check_interval} seconds")
    logger.info("=" * 60)
    
    while True:
        try:
            logger.info("Checking for new emails...")
            result = email_handler.process_incoming_emails(test_mode=False)
            
            if result.get('error'):
                logger.error(f"Error: {result['error']}")
            else:
                if result.get('processed', 0) > 0:
                    logger.info(f"✅ Processed: {result.get('processed')} emails")
                    logger.info(f"   Tickets created: {result.get('tickets_created', 0)}")
                    logger.info(f"   Comments added: {result.get('comments_added', 0)}")
                else:
                    logger.info("No new emails found")
                    
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
        
        logger.info(f"Waiting {check_interval} seconds until next check...")
        time.sleep(check_interval)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--interval', type=int, default=60, 
                       help='Check interval in seconds (default: 60)')
    args = parser.parse_args()
    
    process_emails_continuously(args.interval)