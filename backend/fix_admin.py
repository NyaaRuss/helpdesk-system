import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

print("=== ADMIN ACCOUNT FIX ===\n")

# Check if admin exists
admin_users = User.objects.filter(user_type='admin')
print(f"Found {admin_users.count()} admin users:")

for admin in admin_users:
    print(f"\nAdmin: {admin.username}")
    print(f"  Email: {admin.email}")
    print(f"  Active: {admin.is_active}")
    print(f"  Last login: {admin.last_login}")
    
    # Test password
    print("  Password checks:")
    for pwd in ['password123', 'nyasha123', 'admin123', 'Nyasha123']:
        if admin.check_password(pwd):
            print(f"    ✓ Password matches: {pwd}")

# Create a fresh admin if none exists
if not User.objects.filter(username='admin').exists():
    print("\nCreating fresh admin account...")
    admin = User.objects.create_user(
        username='admin',
        email='admin@helpdesk.com',
        password='admin123',
        user_type='admin',
        first_name='System',
        last_name='Administrator',
        is_active=True,
        is_staff=True,
        is_superuser=True
    )
    print(f"✓ Created admin: admin / admin123")

print("\n=== TEST CREDENTIALS ===")
print("Try logging in with:")
print("1. admin / admin123")
print("2. client1 / password123")
print("3. engineer1 / password123")

# Also reset client1 password
try:
    client1 = User.objects.get(username='client1')
    client1.set_password('password123')
    client1.save()
    print(f"\n✓ Reset password for client1")
except User.DoesNotExist:
    pass

# Create test admin if 'Nyasha' doesn't exist
if not User.objects.filter(username='Nyasha').exists():
    print("\nCreating Nyasha admin account...")
    nyasha = User.objects.create_user(
        username='Nyasha',
        email='nyasharusenazhou@gmail.com',
        password='nyasha123',
        user_type='admin',
        first_name='Nyasha',
        last_name='Rusena',
        is_active=True,
        is_staff=True,
        is_superuser=True
    )
    print(f"✓ Created Nyasha: Nyasha / nyasha123")