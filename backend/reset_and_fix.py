import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.db import transaction

User = get_user_model()

print("=== FIXING AUTHENTICATION ===")

# Delete all existing users except superuser
with transaction.atomic():
    users_to_delete = User.objects.filter(is_superuser=False)
    print(f"Deleting {users_to_delete.count()} non-admin users...")
    users_to_delete.delete()

# Create fresh test users
test_users = [
    {
        'username': 'client1',
        'email': 'client1@example.com',
        'password': 'password123',
        'user_type': 'client',
        'first_name': 'John',
        'last_name': 'Client',
        'is_active': True
    },
    {
        'username': 'engineer1',
        'email': 'engineer1@example.com',
        'password': 'password123',
        'user_type': 'engineer',
        'first_name': 'Jane',
        'last_name': 'Engineer',
        'is_active': True
    },
    {
        'username': 'admin',
        'email': 'admin@example.com',
        'password': 'admin123',
        'user_type': 'admin',
        'first_name': 'Admin',
        'last_name': 'User',
        'is_active': True
    }
]

print("\nCreating test users...")
for user_data in test_users:
    if not User.objects.filter(username=user_data['username']).exists():
        user = User.objects.create_user(
            username=user_data['username'],
            email=user_data['email'],
            password=user_data['password'],
            user_type=user_data['user_type'],
            first_name=user_data['first_name'],
            last_name=user_data['last_name'],
            is_active=user_data['is_active']
        )
        print(f"✓ Created: {user.username} ({user.user_type})")
    else:
        print(f"✓ Already exists: {user_data['username']}")

print("\n=== TESTING LOGIN ===")
# Test login for each user
for user_data in test_users:
    user = User.objects.get(username=user_data['username'])
    print(f"\nTesting {user.username}:")
    print(f"  Username: {user.username}")
    print(f"  Email: {user.email}")
    print(f"  User Type: {user.user_type}")
    print(f"  Is Active: {user.is_active}")
    print(f"  Check password: {user.check_password(user_data['password'])}")

print("\n=== READY FOR USE ===")
print("Test Credentials:")
print("Client: client1 / password123")
print("Engineer: engineer1 / password123")
print("Admin: admin / admin123")
print("\nRestart server and test login!")