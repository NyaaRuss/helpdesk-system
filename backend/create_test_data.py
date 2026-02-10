import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from users.models import User
from tickets.models import Ticket
from datetime import datetime, timedelta

# Create test users
users_data = [
    {
        'username': 'client1',
        'email': 'client1@example.com',
        'password': 'password123',
        'user_type': 'client',
        'first_name': 'John',
        'last_name': 'Doe'
    },
    {
        'username': 'client2',
        'email': 'client2@example.com',
        'password': 'password123',
        'user_type': 'client',
        'first_name': 'Jane',
        'last_name': 'Smith'
    },
    {
        'username': 'engineer1',
        'email': 'engineer1@example.com',
        'password': 'password123',
        'user_type': 'engineer',
        'first_name': 'Mike',
        'last_name': 'Johnson'
    },
    {
        'username': 'engineer2',
        'email': 'engineer2@example.com',
        'password': 'password123',
        'user_type': 'engineer',
        'first_name': 'Sarah',
        'last_name': 'Williams'
    },
]

print("Creating test users...")
for user_data in users_data:
    if not User.objects.filter(username=user_data['username']).exists():
        user = User.objects.create_user(**user_data)
        print(f"✓ Created user: {user.username} ({user.user_type})")
    else:
        print(f"✓ User already exists: {user_data['username']}")

print("\nTest users created successfully!")
print("\nYou can login with:")
print("Client: client1 / password123")
print("Engineer: engineer1 / password123")
print("Admin: Nyasha / nyasha123")