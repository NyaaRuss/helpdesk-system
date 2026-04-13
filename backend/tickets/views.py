from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db.models import Avg, F, Count
from django.core.cache import cache
from datetime import timedelta
import threading

from rest_framework import generics, permissions, status, filters, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from playwright.sync_api import sync_playwright
from rest_framework.permissions import AllowAny

from .models import Ticket, TicketEngineer, TicketLog, Message, SLA
from .serializers import (
    TicketSerializer, TicketLogSerializer, MessageSerializer, 
    SimpleTicketSerializer,SLASerializer
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
        TicketLog.objects.create(
            ticket=ticket,
            user=self.request.user,
            action="Ticket created",
            details=f"Title: {ticket.title}, Priority: {ticket.get_priority_display()}, Category: {ticket.get_category_display()}"
        )

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

    def get(self, request):
        user = request.user
        my_tickets = Ticket.objects.filter(assigned_engineers__engineer=user)
        resolved = my_tickets.filter(status='resolved', updated_at__isnull=False)
        
        avg_time = resolved.annotate(
            duration=F('updated_at') - F('created_at')
        ).aggregate(Avg('duration'))['duration__avg']
        
        avg_hours = round(avg_time.total_seconds() / 3600, 1) if avg_time else 0
        success_rate = round((resolved.count() / my_tickets.count() * 100), 1) if my_tickets.exists() else 0

        return Response({
            'resolved_tickets': resolved.count(),
            'avg_resolution_time': f"{avg_hours}h",
            'success_rate': f"{success_rate}%",
            'total_assigned': my_tickets.count()
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
    

from rest_framework import permissions

# views.py

class SLAListCreateView(generics.ListCreateAPIView):
    serializer_class = SLASerializer
    # Allowing any logged-in user to save, bypassing the role check
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SLA.objects.all().order_by('expiry_date')

    def get_serializer_context(self):
        """
        Passes the request to the serializer so it can access the user.
        Without this, 'created_by' will fail to save.
        """
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        # This line actually saves the record and sets you as the creator.
        serializer.save(created_by=self.request.user)