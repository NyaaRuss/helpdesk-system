"""
Email handler for processing incoming emails to create tickets and comments
UPDATED: Properly saves customer replies and sends admin/engineer replies instantly
"""
import re
import email
import imaplib
import smtplib
import secrets
import string
import random
import socket
import select
import time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import parseaddr
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import Ticket, Message, EmailToTicketMapping, TicketLog
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


class EmailHandler:
    """Handle incoming and outgoing emails for ticket system"""

    def __init__(self):
        self.imap_host = getattr(settings, 'EMAIL_IMAP_HOST', 'imap.gmail.com')
        self.imap_port = getattr(settings, 'EMAIL_IMAP_PORT', 993)
        self.email_user = getattr(settings, 'EMAIL_IMAP_USER', settings.EMAIL_HOST_USER)
        self.email_password = getattr(settings, 'EMAIL_IMAP_PASSWORD', settings.EMAIL_HOST_PASSWORD)
        self.helpdesk_email = getattr(settings, 'HELPDESK_EMAIL', settings.DEFAULT_FROM_EMAIL)
        self.processed_email_ids = set()
        self.frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        
        # Valid domains that can receive email
        self.VALID_DOMAINS = [
            'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
            'icloud.com', 'protonmail.com', 'aol.com', 'mail.com',
        ]

    def is_valid_email_domain(self, email):
        """Check if email domain can receive emails (prevents bounce-back loops)"""
        if not email or '@' not in email:
            return False
        
        domain = email.split('@')[1].lower()
        
        # Always reject fake/example domains
        fake_domains = ['example.com', 'test.com', 'domain.com', 'yourcompany.com', 'localhost']
        if domain in fake_domains:
            return False
        
        return True

    def is_valid_ticket_email(self, from_email, subject, body):
        """
        SIMPLIFIED: Accept all legitimate user emails, reject only system/bounce/auto-reply
        """
        from_email_lower = from_email.lower()
        combined = f"{subject} {body}".lower()
        
        # ========== ALWAYS REJECT (SYSTEM EMAILS) ==========
        system_senders = [
            'mailer-daemon', 'postmaster', 'noreply', 'no-reply', 
            'donotreply', 'do-not-reply', 'administrator', 'webmaster',
        ]
        for sender in system_senders:
            if sender in from_email_lower:
                logger.info(f"REJECTED: System sender '{sender}'")
                return False, "System sender"
        
        # ========== ALWAYS REJECT (BOUNCE BACKS) ==========
        bounce_keywords = [
            'delivery status notification', 'mail delivery failed', 
            'undeliverable', 'address not found', 'does not exist',
            'recipient address rejected', 'failure notice', 'delivery failed',
            'could not be delivered', 'dns error', 'mx lookup',
            'no such user', 'invalid recipient', 'returned to sender',
        ]
        for keyword in bounce_keywords:
            if keyword in combined:
                logger.info(f"REJECTED: Bounce-back - '{keyword}'")
                return False, "Bounce-back email"
        
        # ========== ALWAYS REJECT (AUTO-REPLIES) ==========
        auto_keywords = [
            'auto-reply', 'automatic reply', 'out of office', 'ooo',
            'away from office', 'vacation reply', 'auto response',
            'automated response', 'i am currently out of the office'
        ]
        for keyword in auto_keywords:
            if keyword in combined:
                logger.info(f"REJECTED: Auto-reply - '{keyword}'")
                return False, "Auto-reply email"
        
        # ========== ACCEPT ALL OTHER EMAILS ==========
        logger.info(f"ACCEPTED: Valid user email from {from_email}")
        return True, "Valid user email"

    def clean_email_body(self, body):
        """Clean email body - remove signatures, HTML, quoted replies"""
        if not body:
            return ""
        
        # Remove HTML tags
        body = re.sub(r'<[^>]+>', ' ', body)
        
        # Remove email signatures
        signature_patterns = [
            r'--\s*$',
            r'^Sent from my.*$',
            r'^Get Outlook for.*$',
            r'^Sent with.*$',
            r'^Best regards,.*$',
            r'^Kind Regards,.*$',
            r'^Regards,.*$',
            r'^Thanks,.*$',
            r'^Thank you,.*$',
            r'^Sincerely,.*$',
            r'^Cheers,.*$',
        ]
        
        for pattern in signature_patterns:
            body = re.sub(pattern, '', body, flags=re.IGNORECASE | re.MULTILINE)
        
        # Remove quoted reply text
        lines = body.split('\n')
        clean_lines = []
        
        for line in lines:
            # Skip quoted lines
            if line.strip().startswith('>'):
                continue
            # Skip "On ... wrote:" lines
            if re.match(r'^On .* wrote:', line):
                continue
            # Skip header lines
            if line.lower().startswith(('from:', 'sent:', 'to:', 'subject:', 'cc:', 'bcc:')):
                continue
            
            if line.strip():
                clean_lines.append(line.strip())
        
        cleaned = ' '.join(clean_lines)
        cleaned = re.sub(r'\s+', ' ', cleaned)
        
        return cleaned.strip()[:3000]

    def get_email_body(self, msg):
        """Extract and clean body from email"""
        body = ""
        
        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                content_disposition = str(part.get("Content-Disposition"))
                
                if content_type == "text/plain" and "attachment" not in content_disposition:
                    try:
                        payload = part.get_payload(decode=True)
                        if payload:
                            body = payload.decode('utf-8', errors='ignore')
                            break
                    except:
                        pass
                elif content_type == "text/html" and not body:
                    try:
                        payload = part.get_payload(decode=True)
                        if payload:
                            html_content = payload.decode('utf-8', errors='ignore')
                            body = re.sub(r'<[^>]+>', ' ', html_content)
                    except:
                        pass
        else:
            try:
                payload = msg.get_payload(decode=True)
                if payload:
                    body = payload.decode('utf-8', errors='ignore')
                else:
                    body = msg.get_payload()
            except:
                body = msg.get_payload()
        
        cleaned_body = self.clean_email_body(body)
        
        if not cleaned_body:
            subject = msg.get('Subject', '')
            cleaned_body = f"Subject: {subject}"
        
        return cleaned_body

    def extract_actual_message(self, body, subject):
        """Extract the actual user message from email content"""
        if not body:
            return subject if subject else ""
        
        lines = body.split('\n')
        actual_message = []
        
        for line in lines:
            line = line.strip()
            if line and not line.startswith('>') and not line.startswith('On '):
                if not any(x in line.lower() for x in ['regards', 'thanks', 'sent from', 'outlook']):
                    actual_message.append(line)
                elif len(actual_message) > 0:
                    break
        
        result = ' '.join(actual_message) if actual_message else subject
        return result[:500]

    def connect_imap(self):
        """Connect to IMAP server with timeout"""
        try:
            socket.setdefaulttimeout(30)
            mail = imaplib.IMAP4_SSL(self.imap_host, self.imap_port, timeout=30)
            mail.login(self.email_user, self.email_password)
            mail.select('INBOX')
            return mail
        except Exception as e:
            logger.error(f"IMAP connection failed: {e}")
            return None

    def get_next_ticket_number(self):
        """Generate sequential ticket number"""
        last_ticket = Ticket.objects.order_by('-id').first()
        
        if last_ticket and last_ticket.ticket_number:
            match = re.search(r'TICKET-(\d+)', last_ticket.ticket_number)
            if match:
                next_num = int(match.group(1)) + 1
            else:
                next_num = Ticket.objects.count() + 1
        else:
            next_num = 1
        
        return f"TICKET-{next_num}"

    def extract_ticket_number_from_subject(self, subject):
        """Extract ticket number from email subject with multiple patterns"""
        if not subject:
            return None

        patterns = [
            r'\[(TICKET-\d+)\]',           # [TICKET-123]
            r'Re:\s*\[(TICKET-\d+)\]',     # Re: [TICKET-123]
            r'Re:\s*(TICKET-\d+)',          # Re: TICKET-123
            r'(TICKET-\d+)',                # TICKET-123
            r'#(\d+)',                      # #123
            r'ticket[:\s]*#?(\d+)',         # ticket #123, ticket 123
        ]

        for pattern in patterns:
            match = re.search(pattern, subject, re.IGNORECASE)
            if match:
                ticket_num = match.group(1)
                # If it's just a number, convert to TICKET- format
                if ticket_num.isdigit():
                    ticket_num = f"TICKET-{ticket_num}"
                return ticket_num.upper()
        return None

    def extract_priority_from_email(self, body, subject):
        """Extract priority from email content"""
        combined = f"{subject} {body}".lower()

        if any(w in combined for w in ['urgent', 'asap', 'critical', 'emergency']):
            return 'critical'
        elif any(w in combined for w in ['high', 'important']):
            return 'high'
        return 'medium'

    def get_or_create_user(self, email):
        """Get or create user - ONLY for valid emails"""
        if not email:
            return None
        
        if any(x in email.lower() for x in ['mailer-daemon', 'postmaster', 'noreply', 'example.com', 'test.com']):
            return None

        if not self.is_valid_email_domain(email):
            return None

        email = email.lower().strip()

        try:
            return User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            username = email.split('@')[0]
            base = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base}{counter}"
                counter += 1

            random_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))

            user = User.objects.create_user(
                username=username,
                email=email,
                password=random_password,
                user_type='client',
                first_name='',
                last_name='',
                is_active=True
            )

            self.send_welcome_email(user)
            return user

    def send_combined_welcome_and_ticket_email(self, user, ticket, original_message, original_subject):
        """Send ONE email with welcome info AND ticket details"""
        if not self.is_valid_email_domain(user.email):
            return
        
        ticket_url = f"{self.frontend_url}/tickets/{ticket.id}"
        reset_url = f"{self.frontend_url}/forgot-password"
        
        priority_display = dict(Ticket.PRIORITY_CHOICES).get(ticket.priority, ticket.priority)
        status_display = dict(Ticket.STATUS_CHOICES).get(ticket.status, ticket.status)
        
        subject = f"[{ticket.ticket_number}] Your Support Request - Ticket Created"
        
        html_message = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; background: #fff; }}
                .header {{ background: #1a73e8; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; }}
                .ticket-box {{ background: #f0f7ff; border-left: 4px solid #1a73e8; padding: 15px; margin: 15px 0; }}
                .message-box {{ background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }}
                .button {{ background: #1a73e8; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }}
                .footer {{ background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>✅ Support Ticket Created</h2>
                </div>
                <div class="content">
                    <p>Dear <strong>{user.username or user.email}</strong>,</p>
                    <p>Your support request has been received and a ticket has been created.</p>
                    
                    <div class="ticket-box">
                        <h3>📋 Ticket Details</h3>
                        <p><strong>Ticket Number:</strong> {ticket.ticket_number}</p>
                        <p><strong>Subject:</strong> {ticket.title}</p>
                        <p><strong>Priority:</strong> {priority_display}</p>
                        <p><strong>Status:</strong> {status_display}</p>
                        <p><strong>Created:</strong> {ticket.created_at.strftime('%Y-%m-%d %H:%M:%S')}</p>
                    </div>
                    
                    <div class="message-box">
                        <h3>📝 Your Message</h3>
                        <p>{original_message}</p>
                    </div>
                    
                    <p style="text-align: center;">
                        <a href="{ticket_url}" class="button">🔗 View Your Ticket</a>
                    </p>
                    
                    <hr>
                    
                    <h3>🔐 Account Information</h3>
                    <p>An account has been created for you:</p>
                    <ul>
                        <li><strong>Username:</strong> {user.username}</li>
                        <li><strong>Email:</strong> {user.email}</li>
                    </ul>
                    <p><a href="{reset_url}">Click here to set your password</a></p>
                    
                    <hr>
                    
                    <p><strong>💡 Quick Actions:</strong></p>
                    <ul>
                        <li>Reply to this email to add comments</li>
                        <li>Use ticket number <strong>{ticket.ticket_number}</strong> in future communications</li>
                    </ul>
                </div>
                <div class="footer">
                    <p>Help Desk System | Support Team</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        try:
            send_mail(
                subject,
                f"Ticket {ticket.ticket_number} created",
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
                html_message=html_message
            )
            logger.info(f"Combined email sent to {user.email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False

    def send_customer_reply_notification(self, ticket, reply_message, original_message=None):
        """Send email notification to customer when engineer/admin replies"""
        if not self.is_valid_email_domain(ticket.client.email):
            return
        
        ticket_url = f"{self.frontend_url}/tickets/{ticket.id}"
        
        subject = f"Re: [{ticket.ticket_number}] {ticket.title}"
        
        html_message = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; }}
                .container {{ max-width: 600px; margin: 0 auto; }}
                .header {{ background: #1976d2; color: white; padding: 15px; text-align: center; }}
                .content {{ padding: 20px; }}
                .reply-box {{ background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 15px 0; }}
                .original-box {{ background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0; }}
                .button {{ background: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>📧 New Reply on Your Ticket</h2>
                </div>
                <div class="content">
                    <p>Dear <strong>{ticket.client.username or ticket.client.email}</strong>,</p>
                    <p>You have received a new reply on ticket <strong>{ticket.ticket_number}</strong>.</p>
                    
                    <div class="reply-box">
                        <p><strong>From:</strong> {reply_message.sender.username} ({reply_message.sender.user_type})</p>
                        <p><strong>Response:</strong></p>
                        <p style="white-space: pre-wrap;">{reply_message.content}</p>
                    </div>
                    
                    <div class="original-box">
                        <p><strong>Your original message:</strong></p>
                        <p style="white-space: pre-wrap;">{original_message if original_message else "No original message available"}</p>
                    </div>
                    
                    <div style="text-align: center; margin: 20px 0;">
                        <a href="{ticket_url}" class="button">View Full Conversation</a>
                    </div>
                    
                    <p><em>Reply to this email to continue the conversation.</em></p>
                </div>
            </div>
        </body>
        </html>
        """
        
        try:
            send_mail(
                subject,
                f"New reply on ticket {ticket.ticket_number}",
                settings.DEFAULT_FROM_EMAIL,
                [ticket.client.email],
                fail_silently=False,
                html_message=html_message
            )
            logger.info(f"Customer notification sent to {ticket.client.email} for {ticket.ticket_number}")
            return True
        except Exception as e:
            logger.error(f"Failed to send customer notification: {e}")
            return False

    def send_engineer_admin_notification(self, ticket, message_content, is_new_ticket=False, sender_name=None):
        """Send notification to engineers and admins about new ticket or new reply"""
        engineers = User.objects.filter(user_type='engineer', is_active=True)
        admins = User.objects.filter(user_type='admin', is_active=True)
        recipients = list(engineers) + list(admins)
        
        if not recipients:
            return
        
        ticket_url = f"{self.frontend_url}/tickets/{ticket.id}"
        
        if is_new_ticket:
            subject = f"New Ticket Created: {ticket.ticket_number} - {ticket.title}"
            action_text = "created"
        else:
            subject = f"New Reply on Ticket: {ticket.ticket_number} - {ticket.title}"
            action_text = f"replied by {sender_name}"
        
        html_message = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; }}
                .container {{ max-width: 600px; margin: 0 auto; }}
                .header {{ background: #ff9800; color: white; padding: 15px; text-align: center; }}
                .content {{ padding: 20px; }}
                .ticket-info {{ background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0; }}
                .message-box {{ background: #fff3e0; padding: 15px; border-radius: 5px; margin: 10px 0; }}
                .button {{ background: #ff9800; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>📢 Ticket {action_text.upper()}</h2>
                </div>
                <div class="content">
                    <div class="ticket-info">
                        <p><strong>Ticket #:</strong> {ticket.ticket_number}</p>
                        <p><strong>Title:</strong> {ticket.title}</p>
                        <p><strong>Priority:</strong> {ticket.get_priority_display()}</p>
                        <p><strong>Status:</strong> {ticket.get_status_display()}</p>
                        <p><strong>From:</strong> {ticket.client.email}</p>
                    </div>
                    
                    <div class="message-box">
                        <p><strong>Message:</strong></p>
                        <p>{message_content[:500]}</p>
                    </div>
                    
                    <p style="text-align: center;">
                        <a href="{ticket_url}" class="button">View & Respond</a>
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        recipient_emails = [r.email for r in recipients if self.is_valid_email_domain(r.email)]
        
        if recipient_emails:
            try:
                send_mail(
                    subject,
                    f"Ticket {ticket.ticket_number} has been {action_text}.\n\nMessage: {message_content[:200]}",
                    settings.DEFAULT_FROM_EMAIL,
                    recipient_emails,
                    fail_silently=True,
                    html_message=html_message
                )
                logger.info(f"Notification sent to {len(recipient_emails)} staff members for ticket {ticket.ticket_number}")
            except Exception as e:
                logger.error(f"Failed to send staff notification: {e}")

    def send_welcome_email(self, user):
        """Send welcome email to new user"""
        if not self.is_valid_email_domain(user.email):
            return
            
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        
        subject = "Welcome to Help Desk System"
        
        html_message = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; }}
                .container {{ max-width: 500px; margin: 0 auto; }}
                .header {{ background: #667eea; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>Welcome to Help Desk System</h2>
                </div>
                <div class="content">
                    <p>Dear <strong>{user.username}</strong>,</p>
                    <p>An account has been created for you.</p>
                    
                    <h3>Your Account Details:</h3>
                    <ul>
                        <li><strong>Username:</strong> {user.username}</li>
                        <li><strong>Email:</strong> {user.email}</li>
                    </ul>
                    
                    <p><a href="{frontend_url}/forgot-password">Click here to set your password</a></p>
                    
                    <hr>
                    <p>Help Desk System Team</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        try:
            send_mail(
                subject,
                f"Welcome {user.username}!",
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=True,
                html_message=html_message
            )
        except Exception as e:
            logger.error(f"Failed to send welcome email: {e}")

    def process_new_ticket(self, from_email, subject, body, message_id):
        """Create new ticket from email"""
        
        if not self.is_valid_email_domain(from_email):
            return {"rejected": True, "reason": "Invalid domain"}
        
        actual_message = self.extract_actual_message(body, subject)
        
        user = self.get_or_create_user(from_email)
        if not user:
            return {"error": "Could not create user"}
        
        ticket_number = self.get_next_ticket_number()
        priority = self.extract_priority_from_email(body, subject)
        
        ticket = Ticket.objects.create(
            ticket_number=ticket_number,
            title=subject[:200] if subject else "Support Request",
            description=actual_message[:5000],
            client=user,
            priority=priority,
            status='open'
        )
        
        EmailToTicketMapping.objects.create(
            email_message_id=message_id,
            ticket=ticket
        )
        
        # Save the customer message as a comment in the ticket
        message = Message.objects.create(
            ticket=ticket,
            sender=user,
            content=actual_message[:1000],
            is_from_email=True,
            is_internal=False  # Customer message is not internal
        )
        
        TicketLog.objects.create(
            ticket=ticket,
            user=user,
            action="Ticket created via email",
            details=f"From: {from_email}\nMessage: {actual_message[:100]}..."
        )
        
        # Send email to customer (welcome + ticket info)
        self.send_combined_welcome_and_ticket_email(user, ticket, actual_message, subject)
        
        # Send notification to engineers and admins about new ticket
        self.send_engineer_admin_notification(ticket, actual_message, is_new_ticket=True, sender_name=user.username)
        
        logger.info(f"✅ TICKET CREATED: {ticket_number} from {from_email}")
        
        return {"created": True, "ticket_number": ticket_number, "ticket_id": ticket.id}

    def process_ticket_reply(self, ticket, from_email, body, message_id, subject, user):
        """Process reply to existing ticket - saves customer message and notifies staff"""
        
        # Check if this email has already been processed
        if EmailToTicketMapping.objects.filter(email_message_id=message_id).exists():
            logger.info(f"Email {message_id} already processed, skipping")
            return {"error": "Already processed"}
        
        actual_message = self.extract_actual_message(body, subject)
        
        if not actual_message or len(actual_message.strip()) < 2:
            logger.info(f"Empty or very short message, skipping")
            return {"error": "Empty message"}
        
        # CRITICAL: Save the customer's reply as a message in the ticket
        message = Message.objects.create(
            ticket=ticket,
            sender=user,
            content=actual_message[:2000],
            is_from_email=True,
            email_message_id=message_id,
            is_internal=False  # Customer messages are NOT internal
        )
        
        # Record the mapping to prevent duplicate processing
        EmailToTicketMapping.objects.create(
            email_message_id=message_id,
            ticket=ticket
        )
        
        # Update ticket status if it was resolved/closed
        if ticket.status in ['resolved', 'closed']:
            ticket.status = 'reopened'
            ticket.save()
            logger.info(f"Ticket {ticket.ticket_number} reopened due to customer reply")
        
        # Update last activity timestamp
        ticket.last_activity_at = timezone.now()
        ticket.save(update_fields=['last_activity_at'])
        
        # Log the action with the customer's message content
        TicketLog.objects.create(
            ticket=ticket,
            user=user,
            action="Customer replied via email",
            details=f"From: {from_email}\nMessage: {actual_message[:200]}..."
        )
        
        # Send notification to engineers and admins about the new customer reply
        # Include the customer's message so they can see what was said
        self.send_engineer_admin_notification(ticket, actual_message, is_new_ticket=False, sender_name=user.username)
        
        logger.info(f"✅ CUSTOMER REPLY SAVED to {ticket.ticket_number} from {from_email}")
        logger.info(f"   Message content: {actual_message[:100]}...")
        
        return {"comment_added": True, "ticket_number": ticket.ticket_number, "message_saved": True}

    def process_single_email(self, msg):
        """Process single email - determines if it's a new ticket or reply"""
        subject = msg.get('Subject', '') or ''
        from_email = parseaddr(msg.get('From', ''))[1] or ''
        body = self.get_email_body(msg)
        message_id = msg.get('Message-ID', '')
        
        # First validate the email
        is_valid, reason = self.is_valid_ticket_email(from_email, subject, body)
        
        if not is_valid:
            logger.info(f"❌ REJECTED: {reason}")
            return {"rejected": True, "reason": reason}
        
        # Check if already processed
        if EmailToTicketMapping.objects.filter(email_message_id=message_id).exists():
            logger.info(f"Email {message_id} already processed, skipping")
            return {"error": "Already processed"}
        
        # Get or create user
        user = self.get_or_create_user(from_email)
        if not user:
            return {"error": "Could not create/find user"}
        
        # Try to extract ticket number from subject (for replies)
        ticket_number = self.extract_ticket_number_from_subject(subject)
        
        if ticket_number:
            # This might be a reply to an existing ticket
            try:
                ticket = Ticket.objects.get(ticket_number=ticket_number)
                logger.info(f"Found existing ticket {ticket_number} from subject - processing as reply")
                return self.process_ticket_reply(ticket, from_email, body, message_id, subject, user)
            except Ticket.DoesNotExist:
                logger.info(f"Ticket {ticket_number} not found, creating new ticket")
                return self.process_new_ticket(from_email, subject, body, message_id)
        else:
            # No ticket number found, create new ticket
            return self.process_new_ticket(from_email, subject, body, message_id)

    def watch_emails_realtime(self):
        """Watch for emails in real-time with auto-reconnect"""
        logger.info("=" * 60)
        logger.info("📧 REAL-TIME EMAIL WATCHER ACTIVE")
        logger.info("   - Creates new tickets from emails")
        logger.info("   - Saves customer replies as comments")
        logger.info("   - Notifies staff of new tickets and replies")
        logger.info("=" * 60)
        
        while True:
            try:
                mail = self.connect_imap()
                if not mail:
                    time.sleep(10)
                    continue
                
                logger.info("✅ Connected, waiting for emails...")
                mail.send(b'IDLE\r\n')
                
                while True:
                    try:
                        select.select([mail.socket()], [], [], 60)
                        mail.send(b'DONE\r\n')
                        
                        status, messages = mail.search(None, 'UNSEEN')
                        if status == 'OK' and messages[0]:
                            for email_id in messages[0].split():
                                mail.store(email_id, '+FLAGS', '\\SEEN')
                                status, msg_data = mail.fetch(email_id, '(RFC822)')
                                if status == 'OK':
                                    msg = email.message_from_bytes(msg_data[0][1])
                                    result = self.process_single_email(msg)
                                    
                                    if result.get('created'):
                                        logger.info(f"✅ TICKET CREATED: {result.get('ticket_number')}")
                                    elif result.get('rejected'):
                                        logger.info(f"❌ REJECTED: {result.get('reason')}")
                                    elif result.get('comment_added') and result.get('message_saved'):
                                        logger.info(f"💬 CUSTOMER REPLY SAVED: {result.get('ticket_number')}")
                                    elif result.get('comment_added'):
                                        logger.info(f"💬 COMMENT ADDED: {result.get('ticket_number')}")
                                    elif result.get('error'):
                                        logger.info(f"⚠️ ERROR: {result.get('error')}")
                        
                        mail.send(b'IDLE\r\n')
                        
                    except (socket.timeout, ConnectionError):
                        break
                    except KeyboardInterrupt:
                        return
                        
            except Exception as e:
                logger.error(f"Error: {e}")
                time.sleep(10)


email_handler = EmailHandler()