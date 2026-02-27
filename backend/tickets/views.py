from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import Ticket, TicketEngineer, TicketLog, Message, Assignment
from .serializers import TicketSerializer, TicketLogSerializer, MessageSerializer, AssignmentSerializer, SimpleTicketSerializer
from rest_framework import generics, permissions, status, filters, viewsets
from django.shortcuts import get_object_or_404


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
            # Admins and Engineers see everything in this specific setup
            if user.user_type in ['admin', 'engineer']:
                return Ticket.objects.all()
            # Clients only see what they created
            return Ticket.objects.filter(client=user)




class TicketDetailView(generics.RetrieveUpdateAPIView):
    """
    Handles retrieving and updating a single ticket.
    Includes logic for logging changes and setting resolution timestamps.
    """
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Determines which tickets a user is allowed to see or edit.
        - Admins and Engineers can access all tickets.
        - Clients can only access tickets they created.
        """
        user = self.request.user
        # Logic to ensure the dashboard can fetch all relevant tickets for engineers
        if user.user_type in ['admin', 'engineer']:
            return Ticket.objects.all()
        return Ticket.objects.filter(client=user)

    def perform_update(self, serializer):
        """
        Custom update logic to track changes in status and priority.
        Fixes the 'Failed to update ticket status' error by ensuring the serializer 
        permits status updates.
        """
        # 1. Capture the existing instance before applying changes
        old_instance = self.get_object()
        old_priority = old_instance.priority
        old_status = old_instance.status
        
        # 2. Save the validated data from the request
        # This resolves the 'Ensure serializer permits status updates' error seen in logs
        instance = serializer.save()
        
        # 3. Handle Priority Changes
        if old_priority != instance.priority:
            TicketLog.objects.create(
                ticket=instance,
                user=self.request.user,
                action="Priority Updated",
                details=f"Changed from {old_priority} to {instance.priority}"
            )
        
        # 4. Handle Status Changes (Crucial for 'Mark as Resolved')
        if old_status != instance.status:
            TicketLog.objects.create(
                ticket=instance,
                user=self.request.user,
                action="Status Updated",
                details=f"Ticket moved from {old_status} to {instance.status}"
            )
            
            # Auto-set the resolution timestamp if the status becomes 'resolved'
            # This ensures 'resolved' tickets are counted correctly in performance reports
            if instance.status == 'resolved':
                instance.resolved_at = timezone.now()
                instance.save()
        
        # 5. General Update Log (if neither status nor priority changed)
        elif old_priority == instance.priority and old_status == instance.status:
            TicketLog.objects.create(
                ticket=instance,
                user=self.request.user,
                action="Ticket Updated",
                details="General information updated."
            )

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
            
            # --- REPLACE YOUR OLD ASSIGNMENT LOGIC WITH THIS ---
            # This creates the link in the TicketEngineer table
            TicketEngineer.objects.get_or_create(
                ticket=ticket,
                engineer=engineer,
                defaults={'is_primary': True}
            )
            
            # Update ticket status and save
            # NOTE: We do NOT do "ticket.engineer = engineer" anymore
            ticket.status = 'in_progress'
            ticket.save()
            # ---------------------------------------------------
            
            # Create log
            TicketLog.objects.create(
                ticket=ticket,
                user=request.user,
                action=f"Ticket assigned to {engineer.username}",
                details=f"Assigned by {request.user.username}"
            )
            
            return Response({
                'message': 'Ticket assigned successfully',
                # We return the engineer name instead of the old assignment serializer
                'engineer': engineer.username 
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
            client_tickets = Ticket.objects.filter(client=user)
            stats = {
                'total_tickets': client_tickets.count(),
                'open_tickets': client_tickets.filter(status='open').count(),
                'in_progress_tickets': client_tickets.filter(status='in_progress').count(),
                'resolved_tickets': client_tickets.filter(status='resolved').count(),
            }
        
        elif user.user_type == 'engineer':
            # Use assigned_engineers__engineer to look through the ManyToMany/Bridge table
            stats = {
                'assigned_tickets': Ticket.objects.filter(assigned_engineers__engineer=user).count(),
                'active_tickets': Ticket.objects.filter(assigned_engineers__engineer=user, status='in_progress').count(),
                'pending_tickets': Ticket.objects.filter(assigned_engineers__engineer=user, status='pending_client').count(),
                'resolved_tickets': Ticket.objects.filter(assigned_engineers__engineer=user, status='resolved').count(),
            }
            
        elif user.user_type == 'admin':
            stats = {
                'total_tickets': Ticket.objects.count(),
                'open_tickets': Ticket.objects.filter(status='open').count(),
                'unassigned_tickets': Ticket.objects.filter(assigned_engineers__isnull=True).count(),
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
        


from rest_framework import status, permissions
from django.shortcuts import get_object_or_404



class AssignTicketView(APIView):
    def post(self, request, pk):
        ticket = get_object_or_404(Ticket, pk=pk)
        
        # This matches the 'engineer_ids' key from your api.js
        engineer_ids = request.data.get('engineer_ids', [])
        
        if engineer_ids:
            # 1. Find the actual User objects
            engineers = User.objects.filter(id__in=engineer_ids)
            
            # 2. Use .set() to update the ManyToMany field
            ticket.assigned_engineers.set(engineers)
            
            # 3. Update status to 'in_progress'
            ticket.status = 'in_progress'
            ticket.save()
            
            return Response({"status": "success", "message": "Engineers assigned"})
        
        return Response({"status": "error", "message": "No engineers selected"}, status=400)

# backend/tickets/views.py

class TicketViewSet(viewsets.ModelViewSet):
    # ... other code ...
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        # If Admin, show everything
        if user.user_type == 'admin':
            return Ticket.objects.all()
        
        # OLD LOGIC (The reason for the empty list):
        # if user.user_type == 'engineer':
        #     return Ticket.objects.filter(assigned_engineers__engineer=user)

        # NEW LOGIC: Allow engineers to see all tickets
        if user.user_type == 'engineer':
            return Ticket.objects.all()

        # Clients still only see their own
        return Ticket.objects.filter(client=user)
    
from django.db.models import Count, Avg, F
from datetime import timedelta
from django.utils import timezone

class EngineerPerformanceView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        # Filter tickets assigned to this specific engineer
        my_tickets = Ticket.objects.filter(assigned_engineers__engineer=user)
        
        # 1. Total Resolved
        resolved_count = my_tickets.filter(status='resolved').count()
        
        # 2. Average Resolution Time (in hours)
        resolved_tickets = my_tickets.filter(status='resolved', updated_at__isnull=False)
        avg_time = resolved_tickets.annotate(
            duration=F('updated_at') - F('created_at')
        ).aggregate(Avg('duration'))['duration__avg']
        
        avg_hours = round(avg_time.total_seconds() / 3600, 1) if avg_time else 0

        # 3. Success Rate (Resolved / Total Assigned)
        total_assigned = my_tickets.count()
        success_rate = round((resolved_count / total_assigned * 100), 1) if total_assigned > 0 else 0

        return Response({
            'resolved_tickets': resolved_count,
            'avg_resolution_time': f"{avg_hours}h",
            'success_rate': f"{success_rate}%",
            'total_assigned': total_assigned
        })