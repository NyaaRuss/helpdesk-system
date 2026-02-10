import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from users.models import User

# Create test users
users = [
    {
        'username': 'client1',
        'email': 'client1@example.com',
        'password': 'password123',
        'user_type': 'client',
        'first_name': 'John',
        'last_name': 'Client'
    },
    {
        'username': 'engineer1',
        'email': 'engineer1@example.com',
        'password': 'password123',
        'user_type': 'engineer',
        'first_name': 'Jane',
        'last_name': 'Engineer'
    },
    {
        'username': 'admin',
        'email': 'admin@example.com',
        'password': 'admin123',
        'user_type': 'admin',
        'first_name': 'Admin',
        'last_name': 'User'
    }
]

for user_data in users:
    if not User.objects.filter(username=user_data['username']).exists():
        user = User.objects.create_user(
            username=user_data['username'],
            email=user_data['email'],
            password=user_data['password'],
            user_type=user_data['user_type'],
            first_name=user_data['first_name'],
            last_name=user_data['last_name']
        )
        print(f"Created user: {user.username} ({user.user_type})")
    else:
        print(f"User {user_data['username']} already exists")