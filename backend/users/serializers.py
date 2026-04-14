from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone  # Add this import
import random
from datetime import timedelta

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'user_type', 'first_name', 'last_name', 'phone']
        read_only_fields = ['id']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2', 'user_type', 'first_name', 'last_name', 'phone']
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
            'email': {'required': True}
        }
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        
        # Check if username already exists
        if User.objects.filter(username=attrs['username']).exists():
            raise serializers.ValidationError({"username": "Username already exists."})
        
        # Check if email already exists (case-insensitive)
        if User.objects.filter(email__iexact=attrs['email']).exists():
            raise serializers.ValidationError({"email": "A user with this email already exists."})
        
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password2')
        
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'].lower(),
            password=validated_data['password'],
            user_type=validated_data.get('user_type', 'client'),
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            phone=validated_data.get('phone', ''),
            is_active=True
        )
        return user

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)
    
    def validate(self, data):
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            raise serializers.ValidationError("Must include 'username' and 'password'.")
        
        user = authenticate(username=username, password=password)
        
        if user is None:
            try:
                user_obj = User.objects.get(email__iexact=username)
                user = authenticate(username=user_obj.username, password=password)
            except User.DoesNotExist:
                user = None
        
        if user:
            if not user.is_active:
                raise serializers.ValidationError("User account is disabled.")
            data['user'] = user
        else:
            raise serializers.ValidationError("Unable to log in with provided credentials.")
        
        return data

# Password Reset Serializers - FIXED TIMEZONE ISSUE
class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()
    
    def validate_email(self, value):
        try:
            user = User.objects.get(email__iexact=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("No user found with this email address")
        except User.MultipleObjectsReturned:
            raise serializers.ValidationError("Multiple users found. Please contact support.")
        return value

class VerifyResetCodeSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)
    
    def validate(self, data):
        try:
            user = User.objects.get(email__iexact=data['email'])
        except User.DoesNotExist:
            raise serializers.ValidationError({"email": "No user found with this email address"})
        except User.MultipleObjectsReturned:
            raise serializers.ValidationError({"email": "Multiple users found. Please contact support."})
        
        if not user.reset_code or user.reset_code != data['code']:
            raise serializers.ValidationError({"code": "Invalid reset code"})
        
        if user.reset_code_created_at:
            # Make both datetimes timezone-aware
            expiration_time = user.reset_code_created_at + timedelta(minutes=15)
            now = timezone.now()  # Use timezone.now() instead of datetime.now()
            
            if now > expiration_time:
                raise serializers.ValidationError({"code": "Reset code has expired. Please request a new one."})
        
        data['user'] = user
        return data

class ResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)
    new_password = serializers.CharField(min_length=6, write_only=True)
    confirm_password = serializers.CharField(min_length=6, write_only=True)
    
    def validate(self, data):
        try:
            user = User.objects.get(email__iexact=data['email'])
        except User.DoesNotExist:
            raise serializers.ValidationError({"email": "No user found with this email address"})
        except User.MultipleObjectsReturned:
            raise serializers.ValidationError({"email": "Multiple users found. Please contact support."})
        
        if not user.reset_code or user.reset_code != data['code']:
            raise serializers.ValidationError({"code": "Invalid reset code"})
        
        if user.reset_code_created_at:
            # Make both datetimes timezone-aware
            expiration_time = user.reset_code_created_at + timedelta(minutes=15)
            now = timezone.now()  # Use timezone.now() instead of datetime.now()
            
            if now > expiration_time:
                raise serializers.ValidationError({"code": "Reset code has expired. Please request a new one."})
        
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match"})
        
        data['user'] = user
        return data