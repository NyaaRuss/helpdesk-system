from django.urls import path
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
]