from django.contrib.auth import get_user_model
User = get_user_model()

# 1. Create Proper Admin Account
if not User.objects.filter(username='nyashaz').exists():
    admin = User.objects.create_superuser(
        username='nyashaz',
        email='nyashaz@froltech.co.zw',
        password='admin123',
        first_name='Nyasha',
        last_name='Admin'
    )
    admin.user_type = 'admin'
    admin.save()
    print("✅ Admin user created successfully!")
    print("   Username: nyashaz")
    print("   Email: nyashaz@froltech.co.zw")
else:
    print("Admin user 'nyashaz' already exists")

# 2. Create Engineer Account
if not User.objects.filter(username='nyasha_eng').exists():
    engineer = User.objects.create_user(
        username='nyasha_eng',
        email='nyasha@students.uz.ac.zw',
        password='password123',
        first_name='Nyasha',
        last_name='Engineer',
        user_type='engineer'
    )
    engineer.save()
    print("✅ Engineer user created successfully!")
    print("   Username: nyasha_eng")
    print("   Email: nyasha@students.uz.ac.zw")
else:
    print("Engineer user 'nyasha_eng' already exists")

# Note: Client account creation has been removed.

print("\n" + "="*40)
print("System Users Initialized")
print("="*40)
print("Admin:    nyashaz / admin123")
print("Engineer: nyasha_eng / password123")
print("="*40)