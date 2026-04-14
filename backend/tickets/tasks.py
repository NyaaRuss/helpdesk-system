# tickets/tasks.py
import threading
from django.core.mail import send_mail
from django.conf import settings

class EmailNotificationThread(threading.Thread):
    def __init__(self, subject, message, html_message, recipient_list):
        self.subject = subject
        self.message = message
        self.html_message = html_message
        self.recipient_list = recipient_list
        threading.Thread.__init__(self)
    
    def run(self):
        try:
            send_mail(
                self.subject,
                self.message,
                settings.DEFAULT_FROM_EMAIL,
                self.recipient_list,
                fail_silently=False,
                html_message=self.html_message
            )
        except Exception as e:
            print(f"Background email failed: {e}")