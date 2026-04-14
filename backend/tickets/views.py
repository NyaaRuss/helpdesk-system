from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db.models import Avg, F, Count
from django.core.cache import cache
from datetime import timedelta
import threading
from django.core.mail import send_mail
from django.conf import settings
from django.urls import reverse

from rest_framework import generics, permissions, status, filters, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from playwright.sync_api import sync_playwright
from rest_framework.permissions import AllowAny
from .models import User
from .models import Ticket, TicketEngineer, TicketLog, Message, SLA
from .serializers import (
    TicketSerializer, TicketLogSerializer, MessageSerializer, 
    SimpleTicketSerializer, SLASerializer
)

User = get_user_model()

# --- TICKET CREATION & LISTING ---

class TicketCreateView(generics.CreateAPIView):
    serializer_class = SimpleTicketSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def perform_create(self, serializer):
        ticket = serializer.save()
        
        # Log ticket creation
        TicketLog.objects.create(
            ticket=ticket,
            user=self.request.user,
            action="Ticket created",
            details=f"Title: {ticket.title}, Priority: {ticket.get_priority_display()}, Category: {ticket.get_category_display()}"
        )
        
        # Send email notifications to all engineers and admins
        self.send_ticket_notification(ticket)
    
    def send_ticket_notification(self, ticket):
        """Send email notifications to all engineers and admins about new ticket"""
        
        # Get all engineers and admins
        engineers = User.objects.filter(user_type='engineer', is_active=True)
        admins = User.objects.filter(user_type='admin', is_active=True)
        
        # Combine recipients
        recipients = list(engineers) + list(admins)
        
        if not recipients:
            print("No recipients found to send notifications")
            return
        
        # Get frontend URL from settings
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        ticket_url = f"{frontend_url}/tickets/{ticket.id}"
        
        subject = f"New Ticket Created: {ticket.ticket_number} - {ticket.title}"
        
        # Plain text message
        message = f"""
NEW TICKET ALERT

A new ticket has been created in the Help Desk System.

Ticket Details:
------------------------
Ticket #: {ticket.ticket_number}
Title: {ticket.title}
Priority: {ticket.get_priority_display()}
Category: {ticket.get_category_display()}
Status: {ticket.get_status_display()}
Created By: {ticket.client.username} ({ticket.client.email})
Created At: {ticket.created_at.strftime('%Y-%m-%d %H:%M:%S')}

Description:
{ticket.description[:500]}{'...' if len(ticket.description) > 500 else ''}

View Ticket: {ticket_url}

Please review and assign this ticket as soon as possible.

---
Help Desk System
"""
        
        # HTML message for better formatting
        html_message = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; }}
        .container {{ max-width: 600px; margin: 0 auto; background: white; }}
        .header {{ background: #1976d2; color: white; padding: 20px; text-align: center; }}
        .content {{ padding: 20px; }}
        .ticket-details {{ width: 100%; border-collapse: collapse; margin: 15px 0; }}
        .ticket-details td {{ padding: 10px; border: 1px solid #ddd; }}
        .ticket-details tr:nth-child(even) {{ background: #f9f9f9; }}
        .priority-critical {{ background: #f44336; color: white; padding: 3px 8px; border-radius: 3px; display: inline-block; }}
        .priority-high {{ background: #ff9800; color: white; padding: 3px 8px; border-radius: 3px; display: inline-block; }}
        .priority-medium {{ background: #2196f3; color: white; padding: 3px 8px; border-radius: 3px; display: inline-block; }}
        .priority-low {{ background: #4caf50; color: white; padding: 3px 8px; border-radius: 3px; display: inline-block; }}
        .button {{ background: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }}
        .footer {{ background: #f4f4f4; padding: 10px; text-align: center; font-size: 12px; color: #666; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>New Ticket Alert</h2>
        </div>
        <div class="content">
            <p>A new ticket has been created in the Help Desk System.</p>
            
            <h3>Ticket Details:</h3>
            <table class="ticket-details">
                <tr>
                    <td><strong>Ticket #:</strong></td>
                    <td>{ticket.ticket_number}</td>
                </tr>
                <tr>
                    <td><strong>Title:</strong></td>
                    <td>{ticket.title}</td>
                </tr>
                <tr>
                    <td><strong>Priority:</strong></td>
                    <td>
                        <span class="priority-{ticket.priority}">
                            {ticket.get_priority_display()}
                        </span>
                    </td>
                </tr>
                <tr>
                    <td><strong>Category:</strong></td>
                    <td>{ticket.get_category_display()}</td>
                </tr>
                <tr>
                    <td><strong>Status:</strong></td>
                    <td>{ticket.get_status_display()}</td>
                </tr>
                <tr>
                    <td><strong>Created By:</strong></td>
                    <td>{ticket.client.username} ({ticket.client.email})</td>
                </tr>
                <tr>
                    <td><strong>Created At:</strong></td>
                    <td>{ticket.created_at.strftime('%Y-%m-%d %H:%M:%S')}</td>
                </tr>
            </table>
            
            <h3>Description:</h3>
            <div style="background: #f9f9f9; padding: 15px; border-radius: 5px;">
                {ticket.description.replace(chr(10), '<br>')}
            </div>
            
            <div style="text-align: center;">
                <a href="{ticket_url}" class="button">View Ticket</a>
            </div>
        </div>
        <div class="footer">
            <p>Help Desk System - Please review and assign this ticket as soon as possible.</p>
        </div>
    </div>
</body>
</html>
"""
        
        # Send emails to all recipients
        email_sent_count = 0
        for recipient in recipients:
            try:
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [recipient.email],
                    fail_silently=False,
                    html_message=html_message
                )
                email_sent_count += 1
            except Exception as e:
                print(f"Failed to send email to {recipient.email}: {e}")
        
        # Log the notification
        TicketLog.objects.create(
            ticket=ticket,
            user=None,
            action="Email notifications sent",
            details=f"Notifications sent to {email_sent_count} engineers/admins"
        )
        
        print(f"Sent ticket notification to {email_sent_count} recipients")

class TicketListView(generics.ListAPIView):
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'priority', 'category']
    search_fields = ['title', 'description', 'ticket_number']
    ordering_fields = ['created_at', 'updated_at', 'priority']
    
    def get_queryset(self):
        user = self.request.user
        if user.user_type in ['admin', 'engineer']:
            return Ticket.objects.all()
        return Ticket.objects.filter(client=user)

class TicketDetailView(generics.RetrieveUpdateAPIView):
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.user_type in ['admin', 'engineer']:
            return Ticket.objects.all()
        return Ticket.objects.filter(client=user)

    def perform_update(self, serializer):
        old_instance = self.get_object()
        old_priority = old_instance.priority
        old_status = old_instance.status
        instance = serializer.save()
        
        if old_priority != instance.priority:
            TicketLog.objects.create(
                ticket=instance,
                user=self.request.user,
                action="Priority Updated",
                details=f"Changed from {old_priority} to {instance.priority}"
            )
        
        if old_status != instance.status:
            TicketLog.objects.create(
                ticket=instance,
                user=self.request.user,
                action="Status Updated",
                details=f"Ticket moved from {old_status} to {instance.status}"
            )
            if instance.status == 'resolved':
                instance.resolved_at = timezone.now()
                instance.save()
        elif old_priority == instance.priority:
            TicketLog.objects.create(
                ticket=instance,
                user=self.request.user,
                action="Ticket Updated",
                details="General information updated."
            )

# --- ASSIGNMENT, MESSAGES & LOGS ---

class TicketAssignView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        ticket = get_object_or_404(Ticket, pk=pk)
        engineer_ids = request.data.get('engineer_ids', [])
        single_id = request.data.get('engineer_id')
        
        if not engineer_ids and single_id:
            engineer_ids = [single_id]
            
        if not engineer_ids:
            return Response({'error': 'Engineer selection required'}, status=400)
            
        if request.data.get('clear_existing', False):
            TicketEngineer.objects.filter(ticket=ticket).delete()
            
        engineers = User.objects.filter(id__in=engineer_ids, user_type='engineer')
        for eng in engineers:
            TicketEngineer.objects.get_or_create(ticket=ticket, engineer=eng)
            
        ticket.status = 'in_progress'
        ticket.save()

        TicketLog.objects.create(
            ticket=ticket,
            user=request.user,
            action=f"Assigned to {', '.join([e.username for e in engineers])}",
            details=f"Assigned by {request.user.username}"
        )
        return Response({'message': 'Assignment successful'})

class MessageCreateView(generics.CreateAPIView):
    queryset = Message.objects.all()
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        message = serializer.save()
        TicketLog.objects.create(
            ticket=message.ticket,
            user=self.request.user,
            action=f"Message sent by {self.request.user.username}",
            details=f"Message: {message.content[:50]}..."
        )

class TicketMessagesView(generics.ListAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return Message.objects.filter(ticket_id=self.kwargs['ticket_id'])

class TicketLogsView(generics.ListAPIView):
    serializer_class = TicketLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return TicketLog.objects.filter(ticket_id=self.kwargs['ticket_id'])

# --- DASHBOARD & ANALYTICS ---

class DashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        if user.user_type == 'client':
            tickets = Ticket.objects.filter(client=user)
            stats = {
                'total_tickets': tickets.count(),
                'open_tickets': tickets.filter(status='open').count(),
                'resolved_tickets': tickets.filter(status='resolved').count(),
            }
        elif user.user_type == 'engineer':
            tickets = Ticket.objects.filter(assigned_engineers__engineer=user)
            stats = {
                'assigned_tickets': tickets.count(),
                'active_tickets': tickets.filter(status='in_progress').count(),
                'resolved_tickets': tickets.filter(status='resolved').count(),
            }
        else: # admin
            stats = {
                'total_tickets': Ticket.objects.count(),
                'open_tickets': Ticket.objects.filter(status='open').count(),
                'high_priority': Ticket.objects.filter(priority__in=['high', 'critical']).count(),
            }
        return Response(stats)

class EngineerPerformanceView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk=None):
        """
        Calculates performance metrics. 
        If pk is provided, it calculates for that specific engineer (Admin view).
        If pk is None, it calculates for the currently logged-in user (Engineer view).
        """
        # Determine target user
        target_user_id = pk if pk else request.user.id
        target_user = get_object_or_404(User, id=target_user_id)
        
        # Filter tickets where this user is assigned
        my_tickets = Ticket.objects.filter(assigned_engineers__engineer=target_user)
        resolved = my_tickets.filter(status__in=['resolved', 'closed'], updated_at__isnull=False)
        
        # Calculate Average Resolution Time
        avg_time = resolved.annotate(
            duration=F('updated_at') - F('created_at')
        ).aggregate(Avg('duration'))['duration__avg']
        
        # Convert duration to hours
        avg_hours = round(avg_time.total_seconds() / 3600, 1) if avg_time else 0
        
        # Calculate Success Rate
        total_count = my_tickets.count()
        success_rate = round((resolved.count() / total_count * 100), 1) if total_count > 0 else 0

        return Response({
            'engineer_name': f"{target_user.first_name} {target_user.last_name}",
            'resolved_tickets': resolved.count(),
            'avg_resolution_time': f"{avg_hours}h",
            'success_rate': f"{success_rate}%",
            'total_assigned': total_count
        })

# --- EGP SCRAPER WITH ASYNC BACKGROUND FETCHING ---

class TenderScrapeView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        """
        Instant response logic to prevent frontend timeouts.
        """
        # 1. Check for cached data
        cached_data = cache.get('praz_tenders_cache')
        
        if cached_data:
            # Data found: Return instantly and refresh it in the background
            threading.Thread(target=self.perform_background_scrape).start()
            return Response(cached_data)

        # 2. No data found: Trigger scraper in background and return empty list immediately.
        # This prevents the "Connection Error" on the first load.
        threading.Thread(target=self.perform_background_scrape).start()
        return Response([], status=200)

    def scrape_praz_portal(self):
        """Standard scraping logic using Playwright."""
        with sync_playwright() as p:
            # Using no-sandbox to ensure it runs in restricted environments
            browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
            page = browser.new_page()
            url = "https://egp.praz.org.zw/egp-SW5kZXhlcy9pbmRleA==?searchSuppName=Computers%2C+Printers%2C+Photocopiers%2C+Networking+Equipment+and+Accessories"
            try:
                page.goto(url, timeout=45000)
                page.wait_for_selector("table tbody tr", timeout=20000)
                rows = page.query_selector_all("table tbody tr")
                tenders = []
                for row in rows:
                    cols = row.query_selector_all("td")
                    if len(cols) >= 8: # Strictly matches the 8 columns on the portal
                        tenders.append({
                            "tenderId": cols[0].inner_text().strip(),
                            "referenceNumber": cols[1].inner_text().strip(),
                            "title": cols[2].inner_text().strip(),
                            "category": cols[4].inner_text().strip(), 
                            "entity": cols[5].inner_text().strip(),   
                            "publishDate": cols[6].inner_text().strip(),
                            "closingDate": cols[7].inner_text().strip(),
                        })
                return tenders
            except Exception as e:
                print(f"Scraper internal failure: {e}")
                return []
            finally:
                browser.close()

    def perform_background_scrape(self):
        """Worker thread to fill the memory cache without blocking the main request."""
        fresh_data = self.scrape_praz_portal()
        if fresh_data:
            cache.set('praz_tenders_cache', fresh_data, 3600) # Save for 1 hour

class TicketViewSet(viewsets.ModelViewSet):
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.user_type in ['admin', 'engineer']:
            return Ticket.objects.all()
        return Ticket.objects.filter(client=user)

# --- SLA VIEWS ---

class SLAListCreateView(generics.ListCreateAPIView):
    """
    Handles listing all SLAs and creating new ones.
    Includes current_stage and scope fields.
    """
    serializer_class = SLASerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Admins and Engineers see everything; Clients see nothing (per your React logic)
        return SLA.objects.all().order_by('expiry_date')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        # Automatically set the creator to the logged-in user
        serializer.save(created_by=self.request.user)

class SLADetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Handles 'View Progress' and stage updates.
    GET: Fetch details for the modal.
    PATCH: Update the current_stage (e.g., move from Baselining to Negotiation).
    """
    queryset = SLA.objects.all()
    serializer_class = SLASerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_update(self, serializer):
        instance = serializer.save()
        # Optional: Log the stage change in the console or a log model
        print(f"SLA {instance.id} moved to stage {instance.current_stage}")