# tickets/models.py
from django.db import models
from users.models import User
from django.utils import timezone
from datetime import timedelta

class Ticket(models.Model):
    PRIORITY_CHOICES = (
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    )
    
    STATUS_CHOICES = (
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('pending_client', 'Pending Client Response'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
        ('reopened', 'Reopened'),
        ('escalated', 'Escalated'),
    )
    
    CATEGORY_CHOICES = (
        ('technical', 'Technical Issue'),
        ('billing', 'Billing'),
        ('account', 'Account Issue'),
        ('feature_request', 'Feature Request'),
        ('other', 'Other'),
    )
    
    ticket_number = models.CharField(max_length=20, unique=True)
    title = models.CharField(max_length=200)
    description = models.TextField()
    client = models.ForeignKey(User, on_delete=models.CASCADE, related_name='client_tickets')
    engineer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='engineer_tickets')
    admin = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='admin_tickets')
    
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='technical')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    deadline = models.DateTimeField(null=True, blank=True)
    
    # NEW: Timeline tracking fields
    custom_resolution_hours = models.IntegerField(null=True, blank=True, help_text="Custom resolution time in hours for this ticket")
    time_spent_hours = models.FloatField(default=0, help_text="Total time spent on this ticket in hours")
    last_time_update = models.DateTimeField(null=True, blank=True)
    is_overdue = models.BooleanField(default=False)
    overdue_notification_sent = models.BooleanField(default=False)
    warning_notification_sent = models.BooleanField(default=False)
    
    is_escalated = models.BooleanField(default=False)
    escalation_reason = models.TextField(blank=True, null=True)
    escalated_at = models.DateTimeField(null=True, blank=True)
    last_activity_at = models.DateTimeField(auto_now_add=True)
    
    client_requested_timeline = models.CharField(max_length=50, blank=True, null=True)
    progress_percentage = models.IntegerField(default=0)
    current_stage = models.CharField(max_length=100, blank=True, null=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.ticket_number} - {self.title}"
    
    def get_resolution_deadline_hours(self):
        """Get the resolution deadline in hours based on priority or custom setting"""
        if self.custom_resolution_hours:
            return self.custom_resolution_hours
        
        default_hours = {
            'critical': 24,
            'high': 48,
            'medium': 72,
            'low': 120
        }
        return default_hours.get(self.priority, 72)
    
    def calculate_deadline(self):
        """Calculate deadline based on priority"""
        hours = self.get_resolution_deadline_hours()
        return self.created_at + timedelta(hours=hours)
    
    def save_deadline(self):
        """Save the calculated deadline"""
        if not self.deadline:
            self.deadline = self.calculate_deadline()
            self.save(update_fields=['deadline'])
        return self.deadline
    
    def get_time_elapsed(self):
        """Get time elapsed since ticket creation in hours"""
        now = timezone.now()
        elapsed = (now - self.created_at).total_seconds() / 3600
        return round(elapsed, 1)
    
    def get_time_remaining(self):
        """Get time remaining until deadline in hours"""
        if not self.deadline:
            self.save_deadline()
        
        now = timezone.now()
        if now > self.deadline:
            return 0
        remaining = (self.deadline - now).total_seconds() / 3600
        return round(remaining, 1)
    
    def get_time_status(self):
        """Get the time status of the ticket"""
        if self.status == 'resolved' or self.status == 'closed':
            return 'completed'
        
        remaining = self.get_time_remaining()
        total = self.get_resolution_deadline_hours()
        elapsed = self.get_time_elapsed()
        percentage_used = (elapsed / total) * 100 if total > 0 else 0
        
        if remaining <= 0:
            return 'overdue'
        elif percentage_used >= 90:
            return 'critical_time'
        elif percentage_used >= 75:
            return 'warning_time'
        elif percentage_used >= 50:
            return 'moderate_time'
        else:
            return 'good_time'
    
    def check_and_escalate(self):
        """Check if ticket needs escalation based on time"""
        if self.status == 'resolved' or self.status == 'closed':
            return False
        
        if self.is_escalated:
            return False
        
        # Ensure deadline exists
        if not self.deadline:
            self.save_deadline()
        
        time_status = self.get_time_status()
        
        if time_status == 'overdue':
            self.escalate(reason=f"Ticket exceeded resolution deadline of {self.get_resolution_deadline_hours()} hours")
            return True
        elif time_status == 'critical_time' and not self.overdue_notification_sent:
            self.send_time_critical_notification()
            self.overdue_notification_sent = True
            self.save(update_fields=['overdue_notification_sent'])
        elif time_status == 'warning_time' and not self.warning_notification_sent:
            self.send_warning_notification()
            self.warning_notification_sent = True
            self.save(update_fields=['warning_notification_sent'])
        
        return False
    
    def send_warning_notification(self):
        """Send warning notification for ticket nearing deadline"""
        from django.core.mail import send_mail
        from django.conf import settings
        
        remaining = self.get_time_remaining()
        subject = f"⚠️ WARNING: Ticket {self.ticket_number} nearing deadline"
        
        message = f"""
        DEADLINE WARNING
        
        Ticket #{self.ticket_number} is approaching its resolution deadline.
        
        Details:
        - Title: {self.title}
        - Priority: {self.get_priority_display()}
        - Created: {self.created_at}
        - Deadline: {self.deadline}
        - Hours Remaining: {remaining} hours
        - Time Elapsed: {self.get_time_elapsed()} hours
        
        Please take action to resolve this ticket before it escalates.
        
        View Ticket: {settings.FRONTEND_URL}/tickets/{self.id}
        """
        
        # Notify engineer and admin
        recipients = []
        for engineer_assignment in self.assigned_engineers.all():
            if engineer_assignment.engineer.email:
                recipients.append(engineer_assignment.engineer.email)
        
        admins = User.objects.filter(user_type='admin', is_active=True)
        for admin in admins:
            if admin.email:
                recipients.append(admin.email)
        
        if recipients:
            send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, recipients, fail_silently=True)
    
    def send_time_critical_notification(self):
        """Send notification that ticket is nearing deadline"""
        from django.core.mail import send_mail
        from django.conf import settings
        
        remaining = self.get_time_remaining()
        subject = f"🔴 CRITICAL: Ticket {self.ticket_number} will escalate soon!"
        
        message = f"""
        CRITICAL DEADLINE WARNING
        
        Ticket #{self.ticket_number} will be automatically escalated in {remaining} hours!
        
        Details:
        - Title: {self.title}
        - Priority: {self.get_priority_display()}
        - Created: {self.created_at}
        - Deadline: {self.deadline}
        - Time Elapsed: {self.get_time_elapsed()} hours
        - Hours Remaining: {remaining} hours
        
        IMMEDIATE ACTION REQUIRED!
        
        View Ticket: {settings.FRONTEND_URL}/tickets/{self.id}
        """
        
        # Notify engineer and admin
        recipients = []
        for engineer_assignment in self.assigned_engineers.all():
            if engineer_assignment.engineer.email:
                recipients.append(engineer_assignment.engineer.email)
        
        admins = User.objects.filter(user_type='admin', is_active=True)
        for admin in admins:
            if admin.email:
                recipients.append(admin.email)
        
        if recipients:
            send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, recipients, fail_silently=True)
    
    def escalate(self, reason="Not attended within time limit", escalated_by=None):
        """Escalate the ticket"""
        from .models import EscalationHistory, TicketLog, EngineerFailedTicket
        
        self.is_escalated = True
        self.escalation_reason = reason
        self.escalated_at = timezone.now()
        self.status = 'escalated'
        self.save(update_fields=['is_escalated', 'escalation_reason', 'escalated_at', 'status'])
        
        # Create escalation history
        EscalationHistory.objects.create(
            ticket=self,
            escalated_from=self.status,
            escalated_to='escalated',
            reason=reason,
            escalated_by=escalated_by
        )
        
        # Record as failed for assigned engineers
        for engineer_assignment in self.assigned_engineers.all():
            EngineerFailedTicket.objects.get_or_create(
                engineer=engineer_assignment.engineer,
                ticket=self,
                defaults={'reason': f"Failed to resolve within {self.get_resolution_deadline_hours()} hours"}
            )
        
        TicketLog.objects.create(
            ticket=self,
            user=escalated_by,
            action="Ticket Escalated",
            details=f"Ticket escalated: {reason}"
        )
        
        # Send escalation notification
        self.send_escalation_notification(reason)
        return True
    
    def send_escalation_notification(self, reason):
        """Send escalation notification to admin"""
        from django.core.mail import send_mail
        from django.conf import settings
        
        admins = User.objects.filter(user_type='admin', is_active=True)
        admin_emails = [admin.email for admin in admins if admin.email]
        
        if admin_emails:
            subject = f"🚨 ESCALATED: Ticket {self.ticket_number} requires attention"
            message = f"""
            AUTOMATIC ESCALATION ALERT
            
            Ticket #{self.ticket_number} has been automatically escalated!
            
            Ticket Details:
            - Title: {self.title}
            - Client: {self.client.email}
            - Priority: {self.get_priority_display()}
            - Created: {self.created_at}
            - Deadline: {self.deadline}
            - Escalation Reason: {reason}
            - Assigned Engineers: {', '.join([e.engineer.username for e in self.assigned_engineers.all()])}
            
            Please review and reassign immediately.
            
            View Ticket: {settings.FRONTEND_URL}/tickets/{self.id}
            """
            send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, admin_emails, fail_silently=True)
    
    def update_time_spent(self):
        """Update time spent on ticket"""
        if self.last_time_update:
            now = timezone.now()
            elapsed = (now - self.last_time_update).total_seconds() / 3600
            self.time_spent_hours += elapsed
        self.last_time_update = timezone.now()
        self.save(update_fields=['time_spent_hours', 'last_time_update'])
    
    def update_progress(self):
        progress_map = {
            'open': 10,
            'in_progress': 30,
            'pending_client': 50,
            'escalated': 60,
            'resolved': 90,
            'closed': 100,
        }
        self.progress_percentage = progress_map.get(self.status, 0)
        self.save(update_fields=['progress_percentage'])


class EngineerFailedTicket(models.Model):
    """Track tickets that engineers failed to complete on time"""
    engineer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='failed_tickets')
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='failed_assignments')
    reason = models.TextField()
    failed_at = models.DateTimeField(auto_now_add=True)
    resolved_by_admin = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-failed_at']
        unique_together = ['engineer', 'ticket']
    
    def __str__(self):
        return f"{self.engineer.username} - {self.ticket.ticket_number}"


class TicketLog(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='logs')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=200)
    details = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.ticket.ticket_number} - {self.action}"


class Message(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField()
    attachments = models.FileField(upload_to='message_attachments/', null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    
    email_message_id = models.CharField(max_length=255, blank=True, null=True)
    is_from_email = models.BooleanField(default=False)
    
    # NEW: Internal notes (only visible to staff)
    is_internal = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['timestamp']
    
    def __str__(self):
        return f"{self.sender.username}: {self.content[:50]}"


class Assignment(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='assignments')
    engineer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assignments')
    assigned_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='made_assignments')
    assigned_at = models.DateTimeField(auto_now_add=True)
    note = models.TextField(blank=True, null=True)
    
    def __str__(self):
        return f"{self.ticket.ticket_number} -> {self.engineer.username}"


class TicketEngineer(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='assigned_engineers')
    engineer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ticket_assignments')
    assigned_at = models.DateTimeField(auto_now_add=True)
    is_primary = models.BooleanField(default=False)
    
    class Meta:
        unique_together = ['ticket', 'engineer']
    
    def __str__(self):
        return f"{self.ticket.ticket_number} - {self.engineer.username}"


# tickets/models.py - Add this to the SLA model

class SLA(models.Model):
    STAGE_CHOICES = (
        (0, 'Requirements & Baselining'),
        (1, 'Negotiation & Drafting'),
        (2, 'Implementation & Tooling'),
        (3, 'Operations & Monitoring'),
        (4, 'Reporting & Audit'),
        (5, 'Billing & Renewal'),
    )

    client_name = models.CharField(max_length=255)
    service_type = models.CharField(max_length=255)
    scope = models.CharField(max_length=100, blank=True, null=True)
    date_entered = models.DateField()
    expiry_date = models.DateField()
    description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=50, default="Active")
    current_stage = models.IntegerField(choices=STAGE_CHOICES, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_slas')
    
    # NEW: Assigned engineers field
    assigned_engineers = models.ManyToManyField(User, blank=True, related_name='assigned_slas')
    
    reminder_sent = models.BooleanField(default=False)
    last_reminder_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['expiry_date'] 
        verbose_name = "SLA"
        verbose_name_plural = "SLAs"

    def __str__(self):
        return f"{self.client_name} - {self.service_type} ({self.get_current_stage_display()})"
    
    def days_until_expiry(self):
        if self.expiry_date:
            delta = self.expiry_date - timezone.now().date()
            return delta.days
        return None


class TicketDeadline(models.Model):
    ticket = models.OneToOneField(Ticket, on_delete=models.CASCADE, related_name='deadline_tracker')
    deadline = models.DateTimeField()
    reminder_sent_24h = models.BooleanField(default=False)
    reminder_sent_1h = models.BooleanField(default=False)
    reminder_sent_overdue = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Deadline for {self.ticket.ticket_number}: {self.deadline}"
    
    def is_overdue(self):
        return timezone.now() > self.deadline


class EmailToTicketMapping(models.Model):
    email_message_id = models.CharField(max_length=255, unique=True)
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='email_mappings')
    processed_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.email_message_id} -> {self.ticket.ticket_number}"


class EscalationHistory(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='escalation_history')
    escalated_from = models.CharField(max_length=50, choices=Ticket.STATUS_CHOICES)
    escalated_to = models.CharField(max_length=50, default='escalated')
    reason = models.TextField()
    escalated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    escalated_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.ticket.ticket_number} escalated at {self.escalated_at}"