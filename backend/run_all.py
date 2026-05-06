#!/usr/bin/env python
"""
Run both Django server and email watcher together
Usage: python run_all.py
"""
import subprocess
import threading
import time
import os
import sys
import signal

def run_django():
    """Run Django development server"""
    print("🚀 Starting Django Server on http://0.0.0.0:8000")
    os.system('python manage.py runserver 0.0.0.0:8000')

def run_email_watcher():
    """Run email watcher in background"""
    print("📧 Starting Email Watcher (will run forever)")
    time.sleep(2)  # Wait for Django to start
    os.system('python run_realtime_email_watcher.py')

def run_celery_worker():
    """Run Celery worker (optional)"""
    print("⚙️ Starting Celery Worker...")
    os.system('celery -A backend worker --loglevel=info')

def signal_handler(sig, frame):
    print("\n🛑 Shutting down all services...")
    sys.exit(0)

if __name__ == "__main__":
    print("=" * 60)
    print("🚀 HELP DESK SYSTEM - FULL STARTUP")
    print("=" * 60)
    print("This will start:")
    print("  1. Django Backend Server")
    print("  2. Real-time Email Watcher")
    print("=" * 60)
    
    # Handle Ctrl+C gracefully
    signal.signal(signal.SIGINT, signal_handler)
    
    # Start email watcher in background thread
    email_thread = threading.Thread(target=run_email_watcher, daemon=True)
    email_thread.start()
    
    # Start Celery worker (optional - uncomment if needed)
    # celery_thread = threading.Thread(target=run_celery_worker, daemon=True)
    # celery_thread.start()
    
    # Run Django (this will block)
    run_django()