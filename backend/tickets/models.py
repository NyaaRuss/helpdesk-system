from django.db import models
from users.models import User

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
    
    is_escalated = models.BooleanField(default=False)
    escalation_reason = models.TextField(blank=True, null=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.ticket_number} - {self.title}"

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
    
# Add this model for multiple engineers per ticket
class TicketEngineer(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='assigned_engineers')
    engineer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ticket_assignments')
    assigned_at = models.DateTimeField(auto_now_add=True)
    is_primary = models.BooleanField(default=False)
    
    class Meta:
        unique_together = ['ticket', 'engineer']
    
    def __str__(self):
        return f"{self.ticket.ticket_number} - {self.engineer.username}"
    
class SLA(models.Model):
    # Lifecycle stages for the progress tracker
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
    
    # Scope field (Corrected: placeholder removed to fix Django error)
    scope = models.CharField(max_length=100, blank=True, null=True)
    
    date_entered = models.DateField()
    expiry_date = models.DateField()
    description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=50, default="Active")
    
    # Tracks the current progress stage (0-5)
    current_stage = models.IntegerField(choices=STAGE_CHOICES, default=0)
    
    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_slas')

    class Meta:
        ordering = ['expiry_date'] 
        verbose_name = "SLA"
        verbose_name_plural = "SLAs"

    def __str__(self):
        # Using get_current_stage_display() shows the text instead of the number in Admin
        return f"{self.client_name} - {self.service_type} ({self.get_current_stage_display()})"