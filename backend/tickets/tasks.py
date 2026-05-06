# tickets/tasks.py
import threading
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from celery import shared_task
from .models import Ticket, TicketDeadline, SLA
from .email_handler import email_handler
import logging

logger = logging.getLogger(__name__)

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

@shared_task
def process_incoming_emails_task():
    """Celery task to process incoming emails"""
    logger.info("Processing incoming emails...")
    result = email_handler.process_incoming_emails()
    logger.info(f"Email processing result: {result}")
    return result

@shared_task
def check_ticket_escalations():
    """Check for tickets that need escalation (5 minutes without activity)"""
    logger.info("Checking ticket escalations...")
    
    # Tickets that are open or in progress, not escalated, and no activity for 5 minutes
    cutoff_time = timezone.now() - timezone.timedelta(minutes=5)
    
    tickets_to_escalate = Ticket.objects.filter(
        status__in=['open', 'in_progress'],
        is_escalated=False,
        last_activity_at__lt=cutoff_time
    )
    
    escalated_count = 0
    for ticket in tickets_to_escalate:
        ticket.escalate("No activity for 5 minutes - auto-escalated")
        escalated_count += 1
        logger.info(f"Escalated ticket {ticket.ticket_number}")
    
    return {"escalated_count": escalated_count}

@shared_task
def send_deadline_reminders():
    """Send reminders for tickets approaching deadlines"""
    logger.info("Sending deadline reminders...")
    
    now = timezone.now()
    twenty_four_hours = now + timezone.timedelta(hours=24)
    one_hour = now + timezone.timedelta(hours=1)
    
    reminders_sent = {
        "24h": 0,
        "1h": 0,
        "overdue": 0
    }
    
    # Check ticket deadlines
    ticket_deadlines = TicketDeadline.objects.select_related('ticket')
    
    for td in ticket_deadlines:
        if td.is_overdue() and not td.reminder_sent_overdue:
            # Send overdue notification
            send_deadline_notification(td.ticket, "overdue")
            td.reminder_sent_overdue = True
            td.save()
            reminders_sent["overdue"] += 1
        elif td.deadline <= twenty_four_hours and not td.reminder_sent_24h:
            # Send 24-hour reminder
            send_deadline_notification(td.ticket, "24h")
            td.reminder_sent_24h = True
            td.save()
            reminders_sent["24h"] += 1
        elif td.deadline <= one_hour and not td.reminder_sent_1h:
            # Send 1-hour reminder
            send_deadline_notification(td.ticket, "1h")
            td.reminder_sent_1h = True
            td.save()
            reminders_sent["1h"] += 1
    
    # Check SLA expiry dates
    slas_expiring = SLA.objects.filter(
        expiry_date__lte=now.date() + timezone.timedelta(days=30),
        status='Active'
    )
    
    for sla in slas_expiring:
        days_left = sla.days_until_expiry()
        if days_left <= 30 and days_left > 0 and not sla.reminder_sent:
            send_sla_reminder(sla)
            sla.reminder_sent = True
            sla.last_reminder_at = now
            sla.save()
    
    return reminders_sent

def send_deadline_notification(ticket, reminder_type):
    """Send deadline notification to assigned engineers and admin"""
    recipients = []
    
    # Add assigned engineers
    for assignment in ticket.assigned_engineers.all():
        recipients.append(assignment.engineer.email)
    
    # Add admin
    admins = User.objects.filter(user_type='admin', is_active=True)
    for admin in admins:
        recipients.append(admin.email)
    
    if not recipients:
        return
    
    reminder_messages = {
        "24h": {
            "subject": f"DEADLINE REMINDER: Ticket {ticket.ticket_number} due in 24 hours",
            "body": f"Ticket {ticket.ticket_number} - {ticket.title} is due in 24 hours."
        },
        "1h": {
            "subject": f"URGENT: Ticket {ticket.ticket_number} due in 1 hour",
            "body": f"Ticket {ticket.ticket_number} - {ticket.title} is due in 1 hour. Please take action."
        },
        "overdue": {
            "subject": f"OVERDUE: Ticket {ticket.ticket_number} has passed deadline",
            "body": f"Ticket {ticket.ticket_number} - {ticket.title} is now overdue. Immediate attention required."
        }
    }
    
    info = reminder_messages.get(reminder_type, reminder_messages["24h"])
    
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
    ticket_url = f"{frontend_url}/tickets/{ticket.id}"
    
    html_message = f"""
    <html>
    <body>
        <h2>Ticket Deadline Reminder</h2>
        <p><strong>Ticket:</strong> {ticket.ticket_number} - {ticket.title}</p>
        <p><strong>Status:</strong> {ticket.get_status_display()}</p>
        <p><strong>Priority:</strong> {ticket.get_priority_display()}</p>
        <p>{info['body']}</p>
        <p><a href="{ticket_url}">View Ticket</a></p>
    </body>
    </html>
    """
    
    try:
        send_mail(
            info['subject'],
            info['body'],
            settings.DEFAULT_FROM_EMAIL,
            recipients,
            fail_silently=False,
            html_message=html_message
        )
    except Exception as e:
        logger.error(f"Failed to send deadline reminder: {e}")

def send_sla_reminder(sla):
    """Send SLA expiry reminder"""
    recipients = [sla.created_by.email]
    
    # Also notify all admins
    admins = User.objects.filter(user_type='admin', is_active=True)
    for admin in admins:
        recipients.append(admin.email)
    
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
    
    subject = f"SLA Expiry Reminder: {sla.client_name} - {sla.service_type}"
    
    html_message = f"""
    <html>
    <body>
        <h2>SLA Expiry Reminder</h2>
        <p><strong>Client:</strong> {sla.client_name}</p>
        <p><strong>Service:</strong> {sla.service_type}</p>
        <p><strong>Expiry Date:</strong> {sla.expiry_date}</p>
        <p><strong>Days until expiry:</strong> {sla.days_until_expiry()}</p>
        <p>Please review and take appropriate action.</p>
    </body>
    </html>
    """
    
    try:
        send_mail(
            subject,
            f"SLA for {sla.client_name} expires in {sla.days_until_expiry()} days",
            settings.DEFAULT_FROM_EMAIL,
            recipients,
            fail_silently=False,
            html_message=html_message
        )
    except Exception as e:
        logger.error(f"Failed to send SLA reminder: {e}")