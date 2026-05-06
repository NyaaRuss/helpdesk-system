# tickets/urls.py
from django.urls import path
from .views import (
    TicketListView, TicketCreateView, TicketDetailView, 
    TicketAssignView, TicketMessagesView, TicketLogsView, 
    MessageCreateView, DashboardStatsView, EngineerPerformanceView,
    TenderScrapeView, SLAListCreateView, SLADetailView,
    TicketMetricsView, EngineerPerformanceAnalyticsView,
    ResolutionStatsView, PriorityAnalyticsView,
    TicketTimelineView, UpdateTicketDeadlineView, CheckAndEscalateTicketsView,
    ClientEscalateTicketView, EngineerFailedTicketsView, UpdateTicketTimeSpentView,
    DashboardTimelineView,
    SLAAssignEngineerView, SLAJoinView  # ADD THESE IMPORTS
)
from .email_views import (
    ProcessIncomingEmailsView, TestEmailToTicketView,
    EscalateTicketView, TicketProgressView, TicketEscalationStatusView,
    TicketCommentViaEmailView
)
from . import views

urlpatterns = [
    # Existing URLs
    path('', views.TicketListView.as_view(), name='ticket-list'),
    path('create/', views.TicketCreateView.as_view(), name='ticket-create'),
    path('<int:pk>/', views.TicketDetailView.as_view(), name='ticket-detail'),
    path('<int:pk>/assign/', views.TicketAssignView.as_view(), name='ticket-assign'),
    path('<int:ticket_id>/messages/', views.TicketMessagesView.as_view(), name='ticket-messages'),
    path('<int:ticket_id>/logs/', views.TicketLogsView.as_view(), name='ticket-logs'),
    path('messages/create/', views.MessageCreateView.as_view(), name='message-create'),
    path('dashboard/stats/', views.DashboardStatsView.as_view(), name='dashboard-stats'),
    path('performance/', EngineerPerformanceView.as_view(), name='my_performance'),
    path('performance/<int:pk>/', EngineerPerformanceView.as_view(), name='engineer_performance_detail'),
    path('tenders/', TenderScrapeView.as_view(), name='tender-scrape'),
    path('slas/', SLAListCreateView.as_view(), name='sla-list'),
    path('slas/<int:pk>/', SLADetailView.as_view(), name='sla-detail'),
    
    # Analytics Endpoints
    path('metrics/', TicketMetricsView.as_view(), name='ticket-metrics'),
    path('engineer-analytics/', EngineerPerformanceAnalyticsView.as_view(), name='engineer-analytics'),
    path('resolution-stats/', ResolutionStatsView.as_view(), name='resolution-stats'),
    path('priority-analytics/', PriorityAnalyticsView.as_view(), name='priority-analytics'),
    
    # Timeline and Deadline Management
    path('<int:pk>/timeline/', TicketTimelineView.as_view(), name='ticket-timeline'),
    path('<int:pk>/update-deadline/', UpdateTicketDeadlineView.as_view(), name='update-deadline'),
    path('<int:pk>/update-time/', UpdateTicketTimeSpentView.as_view(), name='update-time'),
    path('<int:pk>/client-escalate/', ClientEscalateTicketView.as_view(), name='client-escalate'),
    
    # Escalation Management
    path('check-escalate/', CheckAndEscalateTicketsView.as_view(), name='check-escalate'),
    path('engineer-failed/<int:engineer_id>/', EngineerFailedTicketsView.as_view(), name='engineer-failed'),
    path('engineer-failed/', EngineerFailedTicketsView.as_view(), name='my-failed-tickets'),
    path('dashboard-timeline/', DashboardTimelineView.as_view(), name='dashboard-timeline'),
    
    # ========== SLA ASSIGNMENT ENDPOINTS ==========
    path('slas/<int:pk>/assign/', SLAAssignEngineerView.as_view(), name='sla-assign'),
    path('slas/<int:pk>/join/', SLAJoinView.as_view(), name='sla-join'),
    
    # Email handling endpoints
    path('emails/process/', ProcessIncomingEmailsView.as_view(), name='process-emails'),
    path('emails/test/', TestEmailToTicketView.as_view(), name='test-email-ticket'),
    
    # Escalation endpoints
    path('<int:ticket_id>/escalate/', EscalateTicketView.as_view(), name='escalate-ticket'),
    path('escalations/status/', TicketEscalationStatusView.as_view(), name='escalation-status'),
    
    # Progress tracking endpoints
    path('<int:ticket_id>/progress/', TicketProgressView.as_view(), name='ticket-progress'),
    
    # Email comment endpoint
    path('<int:ticket_id>/email-comment/', TicketCommentViaEmailView.as_view(), name='email-comment'),

    path('<int:pk>/update-time/', UpdateTicketTimeSpentView.as_view(), name='update-time'),
    path('<int:pk>/timeline/', TicketTimelineView.as_view(), name='ticket-timeline'),
]