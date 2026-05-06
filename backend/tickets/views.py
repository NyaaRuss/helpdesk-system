# tickets/views.py
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db.models import Avg, F, Count, Q, Sum, DurationField, ExpressionWrapper
from django.db.models.functions import TruncDate, ExtractHour
from django.core.cache import cache
from datetime import timedelta, datetime
import threading
import logging
import re
from django.core.mail import send_mail
from django.conf import settings

from rest_framework import generics, permissions, status, filters, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from playwright.sync_api import sync_playwright
from rest_framework.permissions import AllowAny
from .models import Ticket, TicketEngineer, TicketLog, Message, SLA, EngineerFailedTicket, EscalationHistory
from .serializers import (
    TicketSerializer, TicketLogSerializer, MessageSerializer, 
    SimpleTicketSerializer, SLASerializer, SimpleUserSerializer
)

logger = logging.getLogger(__name__)

User = get_user_model()

def get_next_ticket_number():
    """Generate sequential ticket number: TICKET-1, TICKET-2, etc."""
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

# --- TICKET CREATION & LISTING ---

class TicketCreateView(generics.CreateAPIView):
    serializer_class = SimpleTicketSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        ticket_number = get_next_ticket_number()
        
        ticket = Ticket.objects.create(
            ticket_number=ticket_number,
            title=serializer.validated_data['title'],
            description=serializer.validated_data['description'],
            category=serializer.validated_data['category'],
            priority=serializer.validated_data.get('priority', 'medium'),
            client=request.user,
            status='open'
        )
        
        # Calculate and save deadline
        ticket.save_deadline()
        
        TicketLog.objects.create(
            ticket=ticket,
            user=self.request.user,
            action="Ticket created",
            details=f"Title: {ticket.title}, Priority: {ticket.get_priority_display()}, Category: {ticket.get_category_display()}, Deadline: {ticket.deadline}"
        )
        
        self.send_ticket_notification(ticket)
        
        return Response({
            'id': ticket.id,
            'ticket_number': ticket.ticket_number,
            'title': ticket.title,
            'description': ticket.description,
            'status': ticket.status,
            'priority': ticket.priority,
            'category': ticket.category,
            'created_at': ticket.created_at,
            'deadline': ticket.deadline,
            'message': f'Ticket {ticket.ticket_number} created successfully'
        }, status=status.HTTP_201_CREATED)
    
    def send_ticket_notification(self, ticket):
        engineers = User.objects.filter(user_type='engineer', is_active=True)
        admins = User.objects.filter(user_type='admin', is_active=True)
        recipients = list(engineers) + list(admins)
        
        if not recipients:
            return
        
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        ticket_url = f"{frontend_url}/tickets/{ticket.id}"
        
        subject = f"New Ticket Created: {ticket.ticket_number} - {ticket.title}"
        
        message = f"""
NEW TICKET ALERT

Ticket #: {ticket.ticket_number}
Title: {ticket.title}
Priority: {ticket.get_priority_display()}
Created By: {ticket.client.username} ({ticket.client.email})
Deadline: {ticket.deadline}

View Ticket: {ticket_url}
"""
        
        for recipient in recipients:
            try:
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [recipient.email],
                    fail_silently=True,
                )
            except Exception as e:
                print(f"Failed to send email to {recipient.email}: {e}")

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

class TicketDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Updated to support DELETE with notifications"""
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
            # Recalculate deadline when priority changes
            instance.deadline = instance.calculate_deadline()
            instance.save(update_fields=['deadline'])
            
            TicketLog.objects.create(
                ticket=instance,
                user=self.request.user,
                action="Priority Updated",
                details=f"Changed from {old_priority} to {instance.priority}. New deadline: {instance.deadline}"
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
        
        # Check if ticket needs escalation after update
        instance.check_and_escalate()

    def destroy(self, request, *args, **kwargs):
        ticket = self.get_object()
        deletion_reason = request.data.get('reason', 'No reason provided')
        
        if request.user.user_type != 'admin':
            return Response({'error': 'Only administrators can delete tickets'}, status=status.HTTP_403_FORBIDDEN)
        
        ticket_number = ticket.ticket_number
        ticket_title = ticket.title
        client_email = ticket.client.email
        client_name = ticket.client.username or ticket.client.email
        created_at = ticket.created_at
        assigned_engineers = list(ticket.assigned_engineers.all())
        
        TicketLog.objects.create(
            ticket=ticket,
            user=request.user,
            action="Ticket Deleted",
            details=f"Deleted by {request.user.username}. Reason: {deletion_reason}"
        )
        
        self.send_deletion_notification_to_client(client_email, client_name, ticket_number, ticket_title, deletion_reason, created_at)
        self.send_deletion_notification_to_engineers(assigned_engineers, ticket_number, ticket_title, deletion_reason, request.user)
        self.send_deletion_notification_to_admins(ticket_number, ticket_title, deletion_reason, request.user)
        
        self.perform_destroy(ticket)
        
        return Response({
            'message': f'Ticket {ticket_number} has been deleted successfully',
            'deleted_ticket': ticket_number
        }, status=status.HTTP_200_OK)
    
    def send_deletion_notification_to_client(self, email, name, ticket_number, title, reason, created_at):
        from django.core.mail import send_mail
        from django.conf import settings
        
        subject = f"Ticket {ticket_number} has been deleted"
        
        html_message = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; }}
                .container {{ max-width: 600px; margin: 0 auto; }}
                .header {{ background: #d32f2f; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; }}
                .ticket-info {{ background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0; }}
                .footer {{ background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>🗑️ Ticket Deleted</h2>
                </div>
                <div class="content">
                    <p>Dear <strong>{name}</strong>,</p>
                    <p>Your support ticket has been deleted from our system.</p>
                    
                    <div class="ticket-info">
                        <h3>📋 Deleted Ticket Details</h3>
                        <p><strong>Ticket Number:</strong> {ticket_number}</p>
                        <p><strong>Title:</strong> {title}</p>
                        <p><strong>Created Date:</strong> {created_at.strftime('%Y-%m-%d %H:%M:%S') if created_at else 'N/A'}</p>
                        <p><strong>Deletion Reason:</strong> {reason}</p>
                    </div>
                    
                    <p>If you believe this was a mistake or need further assistance, please create a new ticket or contact our support team.</p>
                    
                    <hr>
                    <p><strong>Need help?</strong> <a href="{settings.FRONTEND_URL}/tickets/new">Create a new ticket</a></p>
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
                subject=subject,
                message=f"Your ticket {ticket_number} has been deleted.\n\nReason: {reason}",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
                html_message=html_message
            )
            logger.info(f"Deletion notification sent to client {email} for ticket {ticket_number}")
        except Exception as e:
            logger.error(f"Failed to send deletion email to client {email}: {e}")
    
    def send_deletion_notification_to_engineers(self, engineers, ticket_number, title, reason, deleted_by):
        from django.core.mail import send_mail
        from django.conf import settings
        
        if not engineers:
            return
        
        engineer_emails = [eng.email for eng in engineers if eng.email]
        
        if not engineer_emails:
            return
        
        subject = f"Ticket {ticket_number} has been deleted"
        
        html_message = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; }}
                .container {{ max-width: 600px; margin: 0 auto; }}
                .header {{ background: #d32f2f; color: white; padding: 15px; text-align: center; }}
                .content {{ padding: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>🗑️ Ticket Deleted</h2>
                </div>
                <div class="content">
                    <p>Dear Team,</p>
                    <p>A ticket you were assigned to has been deleted.</p>
                    
                    <h3>Deleted Ticket Details:</h3>
                    <ul>
                        <li><strong>Ticket Number:</strong> {ticket_number}</li>
                        <li><strong>Title:</strong> {title}</li>
                        <li><strong>Deleted By:</strong> {deleted_by.username} ({deleted_by.user_type})</li>
                        <li><strong>Deletion Reason:</strong> {reason}</li>
                    </ul>
                    
                    <p>No further action is required on this ticket.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        try:
            send_mail(
                subject=subject,
                message=f"Ticket {ticket_number} has been deleted by {deleted_by.username}.\n\nReason: {reason}",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=engineer_emails,
                fail_silently=True,
                html_message=html_message
            )
            logger.info(f"Deletion notification sent to {len(engineer_emails)} engineers for ticket {ticket_number}")
        except Exception as e:
            logger.error(f"Failed to send deletion email to engineers: {e}")
    
    def send_deletion_notification_to_admins(self, ticket_number, title, reason, deleted_by):
        from django.core.mail import send_mail
        from django.conf import settings
        
        admins = User.objects.filter(user_type='admin', is_active=True)
        admin_emails = [admin.email for admin in admins if admin.email]
        
        if not admin_emails:
            return
        
        admin_emails = [email for email in admin_emails if email != deleted_by.email]
        
        if not admin_emails:
            return
        
        subject = f"[ACTION] Ticket {ticket_number} was deleted"
        
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
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>📢 Ticket Deletion Notification</h2>
                </div>
                <div class="content">
                    <p>Dear Admin,</p>
                    <p>The following ticket has been deleted from the system:</p>
                    
                    <h3>Deleted Ticket Details:</h3>
                    <ul>
                        <li><strong>Ticket Number:</strong> {ticket_number}</li>
                        <li><strong>Title:</strong> {title}</li>
                        <li><strong>Deleted By:</strong> {deleted_by.username} ({deleted_by.user_type})</li>
                        <li><strong>Deletion Reason:</strong> {reason}</li>
                    </ul>
                    
                    <p>This action has been logged for audit purposes.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        try:
            send_mail(
                subject=subject,
                message=f"Ticket {ticket_number} was deleted by {deleted_by.username}.\n\nReason: {reason}",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=admin_emails,
                fail_silently=True,
                html_message=html_message
            )
            logger.info(f"Deletion notification sent to {len(admin_emails)} admins for ticket {ticket_number}")
        except Exception as e:
            logger.error(f"Failed to send deletion email to admins: {e}")

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
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        ticket_id = request.data.get('ticket')
        ticket = get_object_or_404(Ticket, id=ticket_id)
        is_internal = request.data.get('is_internal', False)
        content = request.data.get('content', '')
        
        if is_internal and request.user.user_type == 'client':
            return Response({'error': 'Clients cannot create internal notes'}, status=403)
        
        message = Message.objects.create(
            ticket=ticket,
            sender=request.user,
            content=content,
            is_internal=is_internal,
            is_from_email=False
        )
        
        TicketLog.objects.create(
            ticket=ticket,
            user=request.user,
            action=f"{'Internal note' if is_internal else 'Reply'} sent by {request.user.username}",
            details=f"Message: {content[:100]}..."
        )
        
        if ticket.status == 'open' and request.user.user_type != 'client':
            ticket.status = 'in_progress'
            ticket.save()
        
        ticket.last_activity_at = timezone.now()
        ticket.save(update_fields=['last_activity_at'])
        
        if not is_internal and request.user.user_type != 'client' and ticket.client and ticket.client.email:
            try:
                from django.core.mail import send_mail
                from django.conf import settings
                
                ticket_url = f"{settings.FRONTEND_URL}/tickets/{ticket.id}"
                last_customer_message = Message.objects.filter(
                    ticket=ticket,
                    sender__user_type='client',
                    is_internal=False
                ).order_by('-timestamp').first()
                
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
                        .status {{ display: inline-block; padding: 5px 10px; border-radius: 5px; font-size: 12px; }}
                        .status-open {{ background: #4caf50; color: white; }}
                        .status-progress {{ background: #ff9800; color: white; }}
                        .status-resolved {{ background: #9e9e9e; color: white; }}
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
                                <p><strong>From:</strong> {request.user.username} ({request.user.user_type})</p>
                                <p><strong>Reply:</strong></p>
                                <p style="white-space: pre-wrap;">{content}</p>
                            </div>
                            
                            <div class="original-box">
                                <p><strong>Ticket Status:</strong> {ticket.get_status_display()}</p>
                                <p><strong>Priority:</strong> {ticket.get_priority_display()}</p>
                                <p><strong>Deadline:</strong> {ticket.deadline}</p>
                                <p><strong>Time Remaining:</strong> {ticket.get_time_remaining()} hours</p>
                            </div>
                            
                            <div style="text-align: center; margin: 20px 0;">
                                <a href="{ticket_url}" class="button">View Full Conversation</a>
                            </div>
                            
                            <hr>
                            <p style="font-size: 12px; color: #666;">
                                <strong>💡 Tip:</strong> Reply to this email to add more information to your ticket.
                            </p>
                        </div>
                    </div>
                </body>
                </html>
                """
                
                send_mail(
                    subject=subject,
                    message=f"New reply on ticket {ticket.ticket_number}\n\nFrom: {request.user.username}\n\n{content}",
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[ticket.client.email],
                    fail_silently=False,
                    html_message=html_message
                )
                
                logger.info(f"📧 Email sent to customer {ticket.client.email} for reply on ticket {ticket.ticket_number}")
                
            except Exception as e:
                logger.error(f"Failed to send customer email for ticket {ticket.ticket_number}: {e}")
        
        return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)
    
class TicketMessagesView(generics.ListAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        ticket_id = self.kwargs['ticket_id']
        
        if user.user_type == 'client':
            return Message.objects.filter(ticket_id=ticket_id, is_internal=False)
        else:
            return Message.objects.filter(ticket_id=ticket_id)

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
                'in_progress_tickets': tickets.filter(status='in_progress').count(),
                'resolved_tickets': tickets.filter(status='resolved').count(),
            }
        elif user.user_type == 'engineer':
            tickets = Ticket.objects.filter(assigned_engineers__engineer=user)
            stats = {
                'assigned_tickets': tickets.count(),
                'active_tickets': tickets.filter(status='in_progress').count(),
                'resolved_tickets': tickets.filter(status='resolved').count(),
            }
        else:
            stats = {
                'total_tickets': Ticket.objects.count(),
                'open_tickets': Ticket.objects.filter(status='open').count(),
                'in_progress_tickets': Ticket.objects.filter(status='in_progress').count(),
                'resolved_tickets': Ticket.objects.filter(status='resolved').count(),
                'high_priority': Ticket.objects.filter(priority__in=['high', 'critical']).count(),
            }
        return Response(stats)

class EngineerPerformanceView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk=None):
        target_user_id = pk if pk else request.user.id
        target_user = get_object_or_404(User, id=target_user_id)
        
        my_tickets = Ticket.objects.filter(assigned_engineers__engineer=target_user)
        resolved = my_tickets.filter(status__in=['resolved', 'closed'], updated_at__isnull=False)
        
        avg_time = resolved.annotate(
            duration=F('updated_at') - F('created_at')
        ).aggregate(Avg('duration'))['duration__avg']
        
        avg_hours = round(avg_time.total_seconds() / 3600, 1) if avg_time else 0
        total_count = my_tickets.count()
        success_rate = round((resolved.count() / total_count * 100), 1) if total_count > 0 else 0
        
        failed_count = EngineerFailedTicket.objects.filter(engineer=target_user).count()
        overdue_count = my_tickets.filter(is_overdue=True).count()

        return Response({
            'engineer_name': f"{target_user.first_name} {target_user.last_name}",
            'resolved_tickets': resolved.count(),
            'avg_resolution_time': f"{avg_hours}h",
            'success_rate': f"{success_rate}%",
            'total_assigned': total_count,
            'failed_tickets': failed_count,
            'overdue_tickets': overdue_count
        })

# --- NEW TICKET METRICS & ANALYTICS VIEWS ---

class TicketMetricsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        if request.user.user_type != 'admin':
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
        
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        priority = request.query_params.get('priority')
        status_filter = request.query_params.get('status')
        
        tickets = Ticket.objects.all()
        
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d')
                tickets = tickets.filter(created_at__gte=start_date_obj)
            except ValueError:
                pass
        
        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d')
                end_date_obj = end_date_obj + timedelta(days=1)
                tickets = tickets.filter(created_at__lte=end_date_obj)
            except ValueError:
                pass
        
        if priority and priority != 'all':
            tickets = tickets.filter(priority=priority)
        
        if status_filter and status_filter != 'all':
            tickets = tickets.filter(status=status_filter)
        
        resolved_tickets = tickets.filter(status__in=['resolved', 'closed'])
        resolution_times = []
        
        for ticket in resolved_tickets:
            if ticket.created_at and ticket.updated_at:
                resolution_time = (ticket.updated_at - ticket.created_at).total_seconds() / 3600
                resolution_times.append(resolution_time)
        
        resolution_stats = {
            'avg': round(sum(resolution_times) / len(resolution_times), 1) if resolution_times else 0,
            'min': round(min(resolution_times), 1) if resolution_times else 0,
            'max': round(max(resolution_times), 1) if resolution_times else 0,
        }
        
        avg_time_by_priority = {}
        for p in ['low', 'medium', 'high', 'critical']:
            p_tickets = resolved_tickets.filter(priority=p)
            p_times = []
            for ticket in p_tickets:
                if ticket.created_at and ticket.updated_at:
                    hours = (ticket.updated_at - ticket.created_at).total_seconds() / 3600
                    p_times.append(hours)
            avg_time_by_priority[p] = round(sum(p_times) / len(p_times), 1) if p_times else 0
        
        nature_of_cases = {
            'low': tickets.filter(priority='low').count(),
            'medium': tickets.filter(priority='medium').count(),
            'high': tickets.filter(priority='high').count(),
            'critical': tickets.filter(priority='critical').count(),
        }
        
        thirty_days_ago = timezone.now() - timedelta(days=30)
        recent_tickets = tickets.filter(created_at__gte=thirty_days_ago)
        daily_tickets = recent_tickets.annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            count=Count('id')
        ).order_by('date')
        
        daily_resolved = resolved_tickets.filter(updated_at__gte=thirty_days_ago).annotate(
            date=TruncDate('updated_at')
        ).values('date').annotate(
            count=Count('id')
        ).order_by('date')
        
        sla_limits = {
            'critical': 24,
            'high': 48,
            'medium': 72,
            'low': 120
        }
        
        sla_met = 0
        sla_breached = 0
        
        for ticket in resolved_tickets:
            if ticket.created_at and ticket.updated_at:
                hours = (ticket.updated_at - ticket.created_at).total_seconds() / 3600
                limit = sla_limits.get(ticket.priority, 72)
                if hours <= limit:
                    sla_met += 1
                else:
                    sla_breached += 1
        
        sla_percentage = round((sla_met / len(resolved_tickets) * 100), 1) if resolved_tickets else 0
        
        category_distribution = tickets.values('category').annotate(count=Count('id'))
        
        first_response_times = []
        for ticket in tickets:
            first_message = Message.objects.filter(
                ticket=ticket,
                is_internal=False
            ).exclude(sender=ticket.client).order_by('timestamp').first()
            
            if first_message and ticket.created_at:
                response_time = (first_message.timestamp - ticket.created_at).total_seconds() / 3600
                first_response_times.append(response_time)
        
        avg_first_response = round(sum(first_response_times) / len(first_response_times), 1) if first_response_times else 0
        
        overdue_tickets = tickets.filter(is_overdue=True).count()
        escalated_tickets = tickets.filter(is_escalated=True).count()
        
        return Response({
            'resolution_time': resolution_stats,
            'avg_time_by_priority': avg_time_by_priority,
            'nature_of_cases': nature_of_cases,
            'daily_tickets': list(daily_tickets),
            'daily_resolved': list(daily_resolved),
            'sla_compliance': {
                'met': sla_met,
                'breached': sla_breached,
                'percentage': sla_percentage
            },
            'category_distribution': list(category_distribution),
            'avg_first_response_time': avg_first_response,
            'total_tickets': tickets.count(),
            'open_tickets': tickets.filter(status='open').count(),
            'in_progress': tickets.filter(status='in_progress').count(),
            'resolved_count': resolved_tickets.count(),
            'overdue_tickets': overdue_tickets,
            'escalated_tickets': escalated_tickets,
        })

class EngineerPerformanceAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        if request.user.user_type != 'admin':
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
        
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        engineers = User.objects.filter(user_type='engineer', is_active=True)
        performance_data = []
        
        sla_limits = {
            'critical': 24,
            'high': 48,
            'medium': 72,
            'low': 120
        }
        
        for engineer in engineers:
            assigned_tickets = Ticket.objects.filter(assigned_engineers__engineer=engineer)
            
            if start_date:
                try:
                    start_date_obj = datetime.strptime(start_date, '%Y-%m-%d')
                    assigned_tickets = assigned_tickets.filter(created_at__gte=start_date_obj)
                except ValueError:
                    pass
            
            if end_date:
                try:
                    end_date_obj = datetime.strptime(end_date, '%Y-%m-%d')
                    end_date_obj = end_date_obj + timedelta(days=1)
                    assigned_tickets = assigned_tickets.filter(created_at__lte=end_date_obj)
                except ValueError:
                    pass
            
            resolved_tickets = assigned_tickets.filter(status__in=['resolved', 'closed'])
            
            resolution_times = []
            for ticket in resolved_tickets:
                if ticket.created_at and ticket.updated_at:
                    hours = (ticket.updated_at - ticket.created_at).total_seconds() / 3600
                    resolution_times.append(hours)
            
            avg_resolution_time = round(sum(resolution_times) / len(resolution_times), 1) if resolution_times else 0
            resolution_rate = round((resolved_tickets.count() / assigned_tickets.count() * 100), 1) if assigned_tickets.count() > 0 else 0
            
            sla_met = 0
            for ticket in resolved_tickets:
                if ticket.created_at and ticket.updated_at:
                    hours = (ticket.updated_at - ticket.created_at).total_seconds() / 3600
                    limit = sla_limits.get(ticket.priority, 72)
                    if hours <= limit:
                        sla_met += 1
            
            sla_compliance = round((sla_met / resolved_tickets.count() * 100), 1) if resolved_tickets.count() > 0 else 0
            
            priority_breakdown = {
                'low': assigned_tickets.filter(priority='low').count(),
                'medium': assigned_tickets.filter(priority='medium').count(),
                'high': assigned_tickets.filter(priority='high').count(),
                'critical': assigned_tickets.filter(priority='critical').count(),
            }
            
            response_times = []
            for ticket in assigned_tickets:
                first_message = Message.objects.filter(
                    ticket=ticket,
                    sender=engineer,
                    is_internal=False
                ).order_by('timestamp').first()
                
                if first_message and ticket.created_at:
                    response_time = (first_message.timestamp - ticket.created_at).total_seconds() / 3600
                    response_times.append(response_time)
            
            avg_response_time = round(sum(response_times) / len(response_times), 1) if response_times else 0
            
            failed_count = EngineerFailedTicket.objects.filter(engineer=engineer).count()
            overdue_count = assigned_tickets.filter(is_overdue=True).count()
            
            performance_data.append({
                'id': engineer.id,
                'name': f"{engineer.first_name} {engineer.last_name}".strip() or engineer.username,
                'email': engineer.email,
                'total_assigned': assigned_tickets.count(),
                'resolved_count': resolved_tickets.count(),
                'avg_resolution_time': avg_resolution_time,
                'resolution_rate': resolution_rate,
                'sla_compliance': sla_compliance,
                'avg_response_time': avg_response_time,
                'priority_breakdown': priority_breakdown,
                'open_tickets': assigned_tickets.filter(status='open').count(),
                'in_progress': assigned_tickets.filter(status='in_progress').count(),
                'failed_tickets': failed_count,
                'overdue_tickets': overdue_count,
            })
        
        performance_data.sort(key=lambda x: x['resolution_rate'], reverse=True)
        
        return Response(performance_data)

class ResolutionStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        if request.user.user_type != 'admin':
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
        
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        tickets = Ticket.objects.filter(status__in=['resolved', 'closed'])
        
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d')
                tickets = tickets.filter(created_at__gte=start_date_obj)
            except ValueError:
                pass
        
        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d')
                end_date_obj = end_date_obj + timedelta(days=1)
                tickets = tickets.filter(created_at__lte=end_date_obj)
            except ValueError:
                pass
        
        resolution_ranges = {
            '0-4h': 0,
            '4-8h': 0,
            '8-24h': 0,
            '24-48h': 0,
            '48-72h': 0,
            '72h+': 0
        }
        
        resolution_times = []
        for ticket in tickets:
            if ticket.created_at and ticket.updated_at:
                hours = (ticket.updated_at - ticket.created_at).total_seconds() / 3600
                resolution_times.append(hours)
                
                if hours <= 4:
                    resolution_ranges['0-4h'] += 1
                elif hours <= 8:
                    resolution_ranges['4-8h'] += 1
                elif hours <= 24:
                    resolution_ranges['8-24h'] += 1
                elif hours <= 48:
                    resolution_ranges['24-48h'] += 1
                elif hours <= 72:
                    resolution_ranges['48-72h'] += 1
                else:
                    resolution_ranges['72h+'] += 1
        
        resolution_times_sorted = sorted(resolution_times)
        total = len(resolution_times_sorted)
        
        percentiles = {
            'p50': resolution_times_sorted[int(total * 0.5)] if total > 0 else 0,
            'p75': resolution_times_sorted[int(total * 0.75)] if total > 0 else 0,
            'p90': resolution_times_sorted[int(total * 0.9)] if total > 0 else 0,
            'p95': resolution_times_sorted[int(total * 0.95)] if total > 0 else 0,
            'p99': resolution_times_sorted[int(total * 0.99)] if total > 0 else 0,
        }
        
        resolution_by_dow = {}
        for i in range(7):
            resolution_by_dow[i] = {'count': 0, 'total_hours': 0}
        
        for ticket in tickets:
            if ticket.created_at and ticket.updated_at:
                hours = (ticket.updated_at - ticket.created_at).total_seconds() / 3600
                day_of_week = ticket.created_at.weekday()
                resolution_by_dow[day_of_week]['count'] += 1
                resolution_by_dow[day_of_week]['total_hours'] += hours
        
        avg_by_dow = {}
        day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        for dow, data in resolution_by_dow.items():
            avg_by_dow[day_names[dow]] = round(data['total_hours'] / data['count'], 1) if data['count'] > 0 else 0
        
        return Response({
            'distribution': resolution_ranges,
            'percentiles': percentiles,
            'average': round(sum(resolution_times) / total, 1) if total > 0 else 0,
            'median': percentiles['p50'],
            'total_resolved': total,
            'avg_by_day_of_week': avg_by_dow
        })

class PriorityAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        if request.user.user_type != 'admin':
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
        
        priorities = ['low', 'medium', 'high', 'critical']
        analytics = {}
        
        for priority in priorities:
            tickets = Ticket.objects.filter(priority=priority)
            resolved = tickets.filter(status__in=['resolved', 'closed'])
            
            resolution_times = []
            for ticket in resolved:
                if ticket.created_at and ticket.updated_at:
                    hours = (ticket.updated_at - ticket.created_at).total_seconds() / 3600
                    resolution_times.append(hours)
            
            avg_resolution = round(sum(resolution_times) / len(resolution_times), 1) if resolution_times else 0
            resolution_rate = round((resolved.count() / tickets.count() * 100), 1) if tickets.count() > 0 else 0
            
            status_breakdown = {
                'open': tickets.filter(status='open').count(),
                'in_progress': tickets.filter(status='in_progress').count(),
                'resolved': tickets.filter(status='resolved').count(),
                'closed': tickets.filter(status='closed').count(),
                'escalated': tickets.filter(status='escalated').count(),
            }
            
            sla_limits = {'low': 120, 'medium': 72, 'high': 48, 'critical': 24}
            sla_limit = sla_limits.get(priority, 72)
            
            sla_met = 0
            for ticket in resolved:
                if ticket.created_at and ticket.updated_at:
                    hours = (ticket.updated_at - ticket.created_at).total_seconds() / 3600
                    if hours <= sla_limit:
                        sla_met += 1
            
            sla_compliance = round((sla_met / resolved.count() * 100), 1) if resolved.count() > 0 else 0
            
            overdue_count = tickets.filter(is_overdue=True).count()
            escalated_count = tickets.filter(is_escalated=True).count()
            
            analytics[priority] = {
                'total': tickets.count(),
                'resolved': resolved.count(),
                'avg_resolution_time': avg_resolution,
                'resolution_rate': resolution_rate,
                'status_breakdown': status_breakdown,
                'sla_limit_hours': sla_limit,
                'sla_compliance': sla_compliance,
                'overdue_count': overdue_count,
                'escalated_count': escalated_count,
            }
        
        return Response(analytics)

# --- NEW TIMELINE AND ESCALATION VIEWS ---

class TicketTimelineView(APIView):
    """Get timeline information for a ticket"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, pk):
        ticket = get_object_or_404(Ticket, pk=pk)
        
        if request.user.user_type == 'client' and ticket.client != request.user:
            return Response({'error': 'Unauthorized'}, status=403)
        if request.user.user_type == 'engineer' and not ticket.assigned_engineers.filter(engineer=request.user).exists():
            if not request.user.user_type == 'admin':
                return Response({'error': 'Unauthorized'}, status=403)
        
        ticket.save_deadline()
        
        timeline_data = {
            'ticket_id': ticket.id,
            'ticket_number': ticket.ticket_number,
            'priority': ticket.priority,
            'status': ticket.status,
            'created_at': ticket.created_at,
            'deadline': ticket.deadline,
            'custom_resolution_hours': ticket.custom_resolution_hours,
            'default_resolution_hours': ticket.get_resolution_deadline_hours(),
            'time_elapsed_hours': ticket.get_time_elapsed(),
            'time_remaining_hours': ticket.get_time_remaining(),
            'time_status': ticket.get_time_status(),
            'is_overdue': ticket.is_overdue,
            'is_escalated': ticket.is_escalated,
            'time_spent_hours': ticket.time_spent_hours,
            'progress_percentage': ticket.progress_percentage,
            'escalation_reason': ticket.escalation_reason,
            'escalated_at': ticket.escalated_at,
            'time_logs': list(ticket.logs.filter(action__icontains='time').values('action', 'details', 'timestamp')),
            'escalation_history': list(EscalationHistory.objects.filter(ticket=ticket).values('reason', 'escalated_at', 'escalated_by'))
        }
        
        return Response(timeline_data)


class UpdateTicketDeadlineView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        if request.user.user_type != 'admin':
            return Response({'error': 'Admin access required'}, status=403)
        
        ticket = get_object_or_404(Ticket, pk=pk)
        custom_hours = request.data.get('custom_resolution_hours')
        
        if custom_hours:
            try:
                hours = int(custom_hours)
                if hours < 1:
                    return Response({'error': 'Hours must be at least 1'}, status=400)
                
                ticket.custom_resolution_hours = hours
                ticket.deadline = ticket.calculate_deadline()
                ticket.save()
                
                TicketLog.objects.create(
                    ticket=ticket,
                    user=request.user,
                    action="Deadline Updated",
                    details=f"Resolution deadline set to {hours} hours. New deadline: {ticket.deadline}"
                )
                
                return Response({
                    'message': 'Deadline updated successfully',
                    'custom_resolution_hours': ticket.custom_resolution_hours,
                    'deadline': ticket.deadline,
                    'time_remaining_hours': ticket.get_time_remaining()
                })
            except ValueError:
                return Response({'error': 'Invalid hours value'}, status=400)
        
        return Response({'error': 'Please provide custom_resolution_hours'}, status=400)


class CheckAndEscalateTicketsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        if request.user.user_type != 'admin':
            return Response({'error': 'Admin access required'}, status=403)
        
        escalated_tickets = []
        tickets = Ticket.objects.filter(status__in=['open', 'in_progress', 'pending_client'], is_escalated=False)
        
        for ticket in tickets:
            if ticket.check_and_escalate():
                escalated_tickets.append({
                    'id': ticket.id,
                    'ticket_number': ticket.ticket_number,
                    'title': ticket.title
                })
        
        return Response({
            'message': f'Checked {tickets.count()} tickets',
            'escalated_count': len(escalated_tickets),
            'escalated_tickets': escalated_tickets
        })


class ClientEscalateTicketView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        ticket = get_object_or_404(Ticket, pk=pk)
        
        if request.user.user_type != 'client' or ticket.client != request.user:
            return Response({'error': 'You can only escalate your own tickets'}, status=403)
        
        if ticket.is_escalated:
            return Response({'error': 'Ticket is already escalated'}, status=400)
        
        reason = request.data.get('reason', 'Client requested escalation')
        
        ticket.escalate(reason=reason, escalated_by=request.user)
        
        return Response({
            'message': 'Ticket escalated successfully',
            'ticket_id': ticket.id,
            'escalated_at': ticket.escalated_at
        })


class EngineerFailedTicketsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, engineer_id=None):
        target_id = engineer_id if engineer_id else request.user.id
        
        if request.user.user_type != 'admin' and request.user.id != target_id:
            return Response({'error': 'Unauthorized'}, status=403)
        
        failed_tickets = EngineerFailedTicket.objects.filter(engineer_id=target_id)
        
        stats = {
            'total_failed': failed_tickets.count(),
            'unresolved_failed': failed_tickets.filter(resolved_by_admin=False).count(),
            'resolved_by_admin': failed_tickets.filter(resolved_by_admin=True).count(),
            'failed_tickets': [
                {
                    'ticket_id': ft.ticket.id,
                    'ticket_number': ft.ticket.ticket_number,
                    'title': ft.ticket.title,
                    'reason': ft.reason,
                    'failed_at': ft.failed_at,
                    'resolved': ft.resolved_by_admin
                }
                for ft in failed_tickets
            ]
        }
        
        return Response(stats)


class UpdateTicketTimeSpentView(APIView):
    """Update time spent on ticket (for engineers)"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        ticket = get_object_or_404(Ticket, pk=pk)
        
        if request.user.user_type == 'engineer':
            if not ticket.assigned_engineers.filter(engineer=request.user).exists():
                return Response({'error': 'You are not assigned to this ticket'}, status=403)
        elif request.user.user_type != 'admin':
            return Response({'error': 'Unauthorized'}, status=403)
        
        hours = request.data.get('hours')
        if hours:
            try:
                hours = float(hours)
                ticket.time_spent_hours += hours
                ticket.last_time_update = timezone.now()
                ticket.save()
                
                TicketLog.objects.create(
                    ticket=ticket,
                    user=request.user,
                    action="Time Updated",
                    details=f"Added {hours} hours of work. Total: {ticket.time_spent_hours} hours"
                )
                
                return Response({
                    'message': 'Time updated successfully',
                    'total_time_spent': ticket.time_spent_hours
                })
            except ValueError:
                return Response({'error': 'Invalid hours value'}, status=400)
        
        return Response({'error': 'Please provide hours'}, status=400)


class DashboardTimelineView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        if request.user.user_type != 'admin':
            return Response({'error': 'Admin access required'}, status=403)
        
        now = timezone.now()
        
        overdue_tickets = []
        critical_tickets = []
        warning_tickets = []
        
        tickets = Ticket.objects.filter(status__in=['open', 'in_progress', 'pending_client'])
        
        for ticket in tickets:
            ticket.save_deadline()
            time_status = ticket.get_time_status()
            
            if time_status == 'overdue':
                overdue_tickets.append({
                    'id': ticket.id,
                    'ticket_number': ticket.ticket_number,
                    'title': ticket.title,
                    'deadline': ticket.deadline,
                    'time_elapsed': ticket.get_time_elapsed()
                })
            elif time_status == 'critical_time':
                critical_tickets.append({
                    'id': ticket.id,
                    'ticket_number': ticket.ticket_number,
                    'title': ticket.title,
                    'deadline': ticket.deadline,
                    'time_remaining': ticket.get_time_remaining()
                })
            elif time_status == 'warning_time':
                warning_tickets.append({
                    'id': ticket.id,
                    'ticket_number': ticket.ticket_number,
                    'title': ticket.title,
                    'deadline': ticket.deadline,
                    'time_remaining': ticket.get_time_remaining()
                })
        
        return Response({
            'overdue_count': len(overdue_tickets),
            'critical_count': len(critical_tickets),
            'warning_count': len(warning_tickets),
            'overdue_tickets': overdue_tickets,
            'critical_tickets': critical_tickets,
            'warning_tickets': warning_tickets,
        })

# --- EGP SCRAPER ---

class TenderScrapeView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        cached_data = cache.get('praz_tenders_cache')
        
        if cached_data:
            threading.Thread(target=self.perform_background_scrape).start()
            return Response(cached_data)

        threading.Thread(target=self.perform_background_scrape).start()
        return Response([], status=200)

    def scrape_praz_portal(self):
        with sync_playwright() as p:
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
                    if len(cols) >= 8:
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
        fresh_data = self.scrape_praz_portal()
        if fresh_data:
            cache.set('praz_tenders_cache', fresh_data, 3600)

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
    serializer_class = SLASerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SLA.objects.all().order_by('expiry_date')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class SLADetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = SLA.objects.all()
    serializer_class = SLASerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_update(self, serializer):
        instance = serializer.save()
        print(f"SLA {instance.id} moved to stage {instance.current_stage}")

# --- SLA ASSIGNMENT VIEWS ---

class SLAAssignEngineerView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        if request.user.user_type != 'admin':
            return Response({'error': 'Admin access required'}, status=403)
        
        sla = get_object_or_404(SLA, pk=pk)
        engineer_id = request.data.get('engineer_id')
        
        if not engineer_id:
            return Response({'error': 'Engineer ID required'}, status=400)
        
        engineer = get_object_or_404(User, id=engineer_id, user_type='engineer')
        sla.assigned_engineers.add(engineer)
        
        from .serializers import SimpleUserSerializer
        assigned_engineers_data = SimpleUserSerializer(sla.assigned_engineers.all(), many=True).data
        
        return Response({
            'message': f'Engineer {engineer.username} assigned to SLA {sla.client_name}',
            'assigned_engineers': assigned_engineers_data
        })
    
    def delete(self, request, pk):
        if request.user.user_type != 'admin':
            return Response({'error': 'Admin access required'}, status=403)
        
        sla = get_object_or_404(SLA, pk=pk)
        engineer_id = request.data.get('engineer_id')
        
        if not engineer_id:
            return Response({'error': 'Engineer ID required'}, status=400)
        
        engineer = get_object_or_404(User, id=engineer_id)
        sla.assigned_engineers.remove(engineer)
        
        from .serializers import SimpleUserSerializer
        assigned_engineers_data = SimpleUserSerializer(sla.assigned_engineers.all(), many=True).data
        
        return Response({
            'message': f'Engineer {engineer.username} removed from SLA {sla.client_name}',
            'assigned_engineers': assigned_engineers_data
        })


class SLAJoinView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        if request.user.user_type != 'engineer':
            return Response({'error': 'Only engineers can join SLAs'}, status=403)
        
        sla = get_object_or_404(SLA, pk=pk)
        
        if sla.assigned_engineers.filter(id=request.user.id).exists():
            return Response({'error': 'You are already assigned to this SLA'}, status=400)
        
        sla.assigned_engineers.add(request.user)
        
        from .serializers import SimpleUserSerializer
        assigned_engineers_data = SimpleUserSerializer(sla.assigned_engineers.all(), many=True).data
        
        return Response({
            'message': f'You have joined SLA {sla.client_name}',
            'assigned_engineers': assigned_engineers_data
        })