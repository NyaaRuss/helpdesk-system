import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.test import RequestFactory
from rest_framework.test import APIClient
from users.models import User
from tickets.models import Ticket

# Create test client
client = APIClient()

# Login
print("1. Testing login...")
response = client.post('/api/auth/login/', {
    'username': 'client1',
    'password': 'password123'
})
print(f"   Login status: {response.status_code}")
print(f"   Login response: {response.json()}")

if response.status_code == 200:
    token = response.json()['access']
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    
    print("\n2. Testing ticket creation...")
    ticket_data = {
        'title': 'Test Ticket from Fix',
        'description': 'Testing the fix',
        'category': 'technical',
        'priority': 'medium'
    }
    
    response = client.post('/api/tickets/create/', ticket_data, format='json')
    print(f"   Ticket creation status: {response.status_code}")
    print(f"   Ticket response: {response.json()}")
    
    print("\n3. Checking database...")
    tickets = Ticket.objects.all()
    print(f"   Total tickets in DB: {tickets.count()}")
    for ticket in tickets:
        print(f"   - {ticket.ticket_number}: {ticket.title}")
else:
    print("Login failed!")