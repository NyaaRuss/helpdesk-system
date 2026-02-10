from rest_framework import generics, permissions, status, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import Ticket, TicketEngineer, TicketLog, Message, Assignment
from .serializers import TicketSerializer, TicketLogSerializer, MessageSerializer, AssignmentSerializer, SimpleTicketSerializer

User = get_user_model()

class TicketCreateView(generics.CreateAPIView):
    serializer_class = SimpleTicketSerializer  # Use SimpleTicketSerializer for create
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def perform_create(self, serializer):
        ticket = serializer.save()
        
        # Create log entry
        TicketLog.objects.create(
            ticket=ticket,
            user=self.request.user,
            action="Ticket created",
            details=f"Title: {ticket.title}, Priority: {ticket.get_priority_display()}, Category: {ticket.get_category_display()}"
        )

# Rest of the views remain the same...
class TicketListView(generics.ListAPIView):
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'priority', 'category']
    search_fields = ['title', 'description', 'ticket_number']
    ordering_fields = ['created_at', 'updated_at', 'priority']
    
    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'client':
            return Ticket.objects.filter(client=user)
        elif user.user_type == 'engineer':
            return Ticket.objects.filter(engineer=user)
        elif user.user_type == 'admin':
            return Ticket.objects.all()
        return Ticket.objects.none()

class TicketDetailView(generics.RetrieveUpdateAPIView):
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'client':
            return Ticket.objects.filter(client=user)
        elif user.user_type == 'engineer':
            return Ticket.objects.filter(engineer=user)
        elif user.user_type == 'admin':
            return Ticket.objects.all()
        return Ticket.objects.none()

class TicketAssignView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        try:
            ticket = Ticket.objects.get(pk=pk)
            engineer_id = request.data.get('engineer_id')
            
            if not engineer_id:
                return Response({'error': 'Engineer ID required'}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
            try:
                engineer = User.objects.get(pk=engineer_id, user_type='engineer')
            except User.DoesNotExist:
                return Response({'error': 'Engineer not found'}, 
                              status=status.HTTP_404_NOT_FOUND)
            
            # Create assignment
            assignment = Assignment.objects.create(
                ticket=ticket,
                engineer=engineer,
                assigned_by=request.user,
                note=request.data.get('note', '')
            )
            
            # Update ticket
            ticket.engineer = engineer
            ticket.status = 'in_progress'
            ticket.save()
            
            # Create log
            TicketLog.objects.create(
                ticket=ticket,
                user=request.user,
                action=f"Ticket assigned to {engineer.username}",
                details=f"Assigned by {request.user.username}"
            )
            
            return Response({
                'message': 'Ticket assigned successfully',
                'assignment': AssignmentSerializer(assignment).data
            })
            
        except Ticket.DoesNotExist:
            return Response({'error': 'Ticket not found'}, 
                          status=status.HTTP_404_NOT_FOUND)

class MessageCreateView(generics.CreateAPIView):
    queryset = Message.objects.all()
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def perform_create(self, serializer):
        message = serializer.save()
        
        # Create log entry
        TicketLog.objects.create(
            ticket=message.ticket,
            user=self.request.user,
            action=f"Message sent by {self.request.user.username}",
            details=f"Message: {message.content[:100]}..."
        )

class TicketMessagesView(generics.ListAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        ticket_id = self.kwargs['ticket_id']
        return Message.objects.filter(ticket_id=ticket_id)

class TicketLogsView(generics.ListAPIView):
    serializer_class = TicketLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        ticket_id = self.kwargs['ticket_id']
        return TicketLog.objects.filter(ticket_id=ticket_id)

class DashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        stats = {}
        
        if user.user_type == 'client':
            stats = {
                'total_tickets': Ticket.objects.filter(client=user).count(),
                'open_tickets': Ticket.objects.filter(client=user, status='open').count(),
                'in_progress_tickets': Ticket.objects.filter(client=user, status='in_progress').count(),
                'resolved_tickets': Ticket.objects.filter(client=user, status='resolved').count(),
            }
        elif user.user_type == 'engineer':
            stats = {
                'assigned_tickets': Ticket.objects.filter(engineer=user).count(),
                'active_tickets': Ticket.objects.filter(engineer=user, status='in_progress').count(),
                'pending_tickets': Ticket.objects.filter(engineer=user, status='pending_client').count(),
                'resolved_tickets': Ticket.objects.filter(engineer=user, status='resolved').count(),
            }
        elif user.user_type == 'admin':
            stats = {
                'total_tickets': Ticket.objects.count(),
                'open_tickets': Ticket.objects.filter(status='open').count(),
                'unassigned_tickets': Ticket.objects.filter(engineer__isnull=True).count(),
                'high_priority_tickets': Ticket.objects.filter(priority__in=['high', 'critical']).count(),
            }
        
        return Response(stats)
    
# Update TicketAssignView to support multiple engineers
class TicketAssignView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        try:
            ticket = Ticket.objects.get(pk=pk)
            engineer_ids = request.data.get('engineer_ids', [])
            
            if not engineer_ids:
                return Response({'error': 'Engineer IDs required'}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
            # Clear existing assignments if specified
            if request.data.get('clear_existing', False):
                TicketEngineer.objects.filter(ticket=ticket).delete()
            
            assigned_engineers = []
            for engineer_id in engineer_ids:
                try:
                    engineer = User.objects.get(pk=engineer_id, user_type='engineer')
                except User.DoesNotExist:
                    continue
                
                # Create or update assignment
                assignment, created = TicketEngineer.objects.get_or_create(
                    ticket=ticket,
                    engineer=engineer,
                    defaults={'is_primary': len(assigned_engineers) == 0}
                )
                assigned_engineers.append(engineer)
            
            # Update ticket status if not already in progress
            if ticket.status == 'open' and assigned_engineers:
                ticket.status = 'in_progress'
                ticket.save()
            
            # Create log entry
            engineer_names = ', '.join([eng.username for eng in assigned_engineers])
            TicketLog.objects.create(
                ticket=ticket,
                user=request.user,
                action=f"Ticket assigned to {engineer_names}",
                details=f"Assigned by {request.user.username}. Note: {request.data.get('note', '')}"
            )
            
            return Response({
                'message': f'Ticket assigned to {len(assigned_engineers)} engineer(s)',
                'assigned_engineers': [eng.username for eng in assigned_engineers]
            })
            
        except Ticket.DoesNotExist:
            return Response({'error': 'Ticket not found'}, 
                          status=status.HTTP_404_NOT_FOUND)