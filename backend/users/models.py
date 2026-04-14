from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    USER_TYPES = (
        ('client', 'Client'),
        ('engineer', 'Engineer'),
        ('admin', 'Administrator'),
    )
    
    user_type = models.CharField(max_length=20, choices=USER_TYPES, default='client')
    phone = models.CharField(max_length=15, blank=True, null=True)
    department = models.CharField(max_length=100, blank=True, null=True)
    profile_picture = models.ImageField(upload_to='profile_pics/', null=True, blank=True)
    
    # Password reset fields
    reset_code = models.CharField(max_length=6, blank=True, null=True)
    reset_code_created_at = models.DateTimeField(blank=True, null=True)
    
    # Make email unique
    email = models.EmailField(unique=True)  # Add unique=True
    
    def __str__(self):
        return f"{self.username} ({self.get_user_type_display()})"

class EngineerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    specialization = models.CharField(max_length=100)
    years_of_experience = models.IntegerField(default=0)
    is_available = models.BooleanField(default=True)
    current_tickets_count = models.IntegerField(default=0)
    
    def __str__(self):
        return f"{self.user.username} - {self.specialization}"