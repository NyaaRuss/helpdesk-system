"""
API endpoints for email handling
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from django.core.management import call_command
from .email_handler import email_handler
from .models import Ticket, TicketLog
from .serializers import TicketSerializer
import logging

logger = logging.getLogger(__name__)

class ProcessIncomingEmailsView(APIView):
    """Process all unread emails from helpdesk inbox"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        # Only admin can trigger this manually
        if request.user.user_type != 'admin':
            return Response(
                {"error": "Only admins can process emails manually"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        result = email_handler.process_incoming_emails()
        
        if result.get('error'):
            return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({
            "message": "Emails processed successfully",
            "processed": result.get('processed', 0),
            "tickets_created": result.get('tickets_created', 0),
            "comments_added": result.get('comments_added', 0)
        })

class TestEmailToTicketView(APIView):
    """Test endpoint to simulate email to ticket creation"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        from_email = request.data.get('from_email')
        subject = request.data.get('subject', 'Test Ticket')
        body = request.data.get('body', 'This is a test ticket from email.')
        
        if not from_email:
            return Response({"error": "from_email required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create a mock email message
        import email
        from email.mime.text import MIMEText
        
        msg = MIMEText(body)
        msg['Subject'] = subject
        msg['From'] = from_email
        msg['Message-ID'] = f"test-{from_email}-{subject}"
        
        result = email_handler.process_single_email(msg)
        
        return Response(result)

class EscalateTicketView(APIView):
    """Manually escalate a ticket"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, ticket_id):
        try:
            ticket = Ticket.objects.get(id=ticket_id)
        except Ticket.DoesNotExist:
            return Response({"error": "Ticket not found"}, status=status.HTTP_404_NOT_FOUND)
        
        reason = request.data.get('reason', 'Manually escalated by user')
        
        if ticket.escalate(reason):
            return Response({
                "message": "Ticket escalated successfully",
                "ticket_id": ticket.id,
                "ticket_number": ticket.ticket_number
            })
        else:
            return Response({"error": "Failed to escalate ticket"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TicketProgressView(APIView):
    """Get progress information for a ticket"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, ticket_id):
        try:
            ticket = Ticket.objects.get(id=ticket_id)
        except Ticket.DoesNotExist:
            return Response({"error": "Ticket not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user has permission
        if request.user.user_type not in ['admin', 'engineer'] and ticket.client.id != request.user.id:
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
        
        # Update progress
        ticket.update_progress()
        
        # Calculate estimated completion
        created_time = ticket.created_at
        now = timezone.now()
        
        progress_data = {
            "ticket_id": ticket.id,
            "ticket_number": ticket.ticket_number,
            "title": ticket.title,
            "status": ticket.status,
            "priority": ticket.priority,
            "progress_percentage": ticket.progress_percentage,
            "current_stage": ticket.current_stage,
            "is_escalated": ticket.is_escalated,
            "escalation_reason": ticket.escalation_reason,
            "created_at": ticket.created_at,
            "last_activity_at": ticket.last_activity_at,
            "client_requested_timeline": ticket.client_requested_timeline,
        }
        
        if ticket.deadline:
            progress_data["deadline"] = ticket.deadline
            progress_data["days_until_deadline"] = (ticket.deadline - timezone.now()).days
        
        return Response(progress_data)

class TicketEscalationStatusView(APIView):
    """Get escalation status for all tickets (admin only)"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        if request.user.user_type != 'admin':
            return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        escalated_tickets = Ticket.objects.filter(is_escalated=True)
        pending_escalation = Ticket.objects.filter(
            status__in=['open', 'in_progress'],
            is_escalated=False,
            last_activity_at__lt=timezone.now() - timezone.timedelta(minutes=5)
        )
        
        serializer = TicketSerializer(escalated_tickets, many=True)
        
        return Response({
            "escalated_tickets": serializer.data,
            "escalated_count": escalated_tickets.count(),
            "pending_escalation_count": pending_escalation.count(),
            "pending_escalation": TicketSerializer(pending_escalation, many=True).data
        })

class TicketCommentViaEmailView(APIView):
    """Send a comment that will be emailed to the client"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, ticket_id):
        try:
            ticket = Ticket.objects.get(id=ticket_id)
        except Ticket.DoesNotExist:
            return Response({"error": "Ticket not found"}, status=status.HTTP_404_NOT_FOUND)
        
        content = request.data.get('content')
        if not content:
            return Response({"error": "Content required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create message
        message = Message.objects.create(
            ticket=ticket,
            sender=request.user,
            content=content,
            is_from_email=False
        )
        
        # Send email to client
        from django.core.mail import send_mail
        from django.conf import settings
        
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        ticket_url = f"{frontend_url}/tickets/{ticket.id}"
        
        subject = f"Update on Ticket {ticket.ticket_number}"
        
        html_message = f"""
        <html>
        <body>
            <h2>New Comment on Your Ticket</h2>
            <p><strong>Ticket:</strong> {ticket.ticket_number} - {ticket.title}</p>
            <p><strong>From:</strong> {request.user.username} ({request.user.user_type})</p>
            <p><strong>Comment:</strong></p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
                {content.replace(chr(10), '<br>')}
            </div>
            <p><a href="{ticket_url}">View Ticket Online</a></p>
            <p><em>Reply to this email to add your response.</em></p>
        </body>
        </html>
        """
        
        try:
            send_mail(
                subject,
                f"New comment on ticket {ticket.ticket_number}",
                settings.DEFAULT_FROM_EMAIL,
                [ticket.client.email],
                fail_silently=False,
                html_message=html_message
            )
        except Exception as e:
            logger.error(f"Failed to send comment email: {e}")
        
        return Response({
            "message": "Comment added and email sent to client",
            "comment_id": message.id
        })