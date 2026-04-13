from django.urls import path
from .views import (
    TicketListView, TicketCreateView, TicketDetailView, 
    TicketAssignView, TicketMessagesView, TicketLogsView, 
    MessageCreateView, DashboardStatsView, EngineerPerformanceView,
    TenderScrapeView
)
from . import views

urlpatterns = [
    path('', views.TicketListView.as_view(), name='ticket-list'),
    path('create/', views.TicketCreateView.as_view(), name='ticket-create'),
    path('<int:pk>/', views.TicketDetailView.as_view(), name='ticket-detail'),
    path('<int:pk>/assign/', views.TicketAssignView.as_view(), name='ticket-assign'),
    path('<int:ticket_id>/messages/', views.TicketMessagesView.as_view(), name='ticket-messages'),
    path('<int:ticket_id>/logs/', views.TicketLogsView.as_view(), name='ticket-logs'),
    path('messages/create/', views.MessageCreateView.as_view(), name='message-create'),
    path('dashboard/stats/', views.DashboardStatsView.as_view(), name='dashboard-stats'),
    #path('performance/', views.EngineerPerformanceView.as_view(), name='engineer-performance'),
    path('performance/', EngineerPerformanceView.as_view(), name='my_performance'),
    path('performance/<int:pk>/', EngineerPerformanceView.as_view(), name='engineer_performance_detail'),
    # Corrected: This will now be accessible at /api/tickets/tenders/
    path('tenders/', TenderScrapeView.as_view(), name='tender-scrape'),
    path('slas/', views.SLAListCreateView.as_view(), name='sla-list-create'),
]