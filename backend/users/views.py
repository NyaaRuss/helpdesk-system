from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.models import update_last_login
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone  # This is correct
from datetime import timedelta  # Remove datetime import, only keep timedelta
import random
from .models import User
from .serializers import (
    UserSerializer, RegisterSerializer, LoginSerializer,
    PasswordResetRequestSerializer, VerifyResetCodeSerializer, ResetPasswordSerializer
)
from rest_framework.permissions import AllowAny

class RegisterView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user, context=self.get_serializer_context()).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'message': 'User registered successfully'
        }, status=status.HTTP_201_CREATED)

class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        
        if serializer.is_valid():
            user = serializer.validated_data['user']
            update_last_login(None, user)
            
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'user': UserSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'message': 'Login successful'
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user

class UserListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user_type = self.request.query_params.get('user_type', None)
        if user_type and user_type != '':
            return User.objects.filter(user_type=user_type)
        return User.objects.all()

# PASSWORD RESET VIEWS - FIXED WITH TIMEZONE
class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        print("\n" + "="*50)
        print("PASSWORD RESET REQUEST")
        print("="*50)
        
        email = request.data.get('email')
        print(f"Email received: {email}")
        
        if not email:
            return Response({"email": ["Email is required"]}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email=email)
            print(f"User found: {user.username} (ID: {user.id})")
            
            # Generate 6-digit reset code
            reset_code = str(random.randint(100000, 999999))
            print(f"Generated reset code: {reset_code}")
            
            # Save to user object - USE timezone.now() NOT datetime.now()
            user.reset_code = reset_code
            user.reset_code_created_at = timezone.now()  # CHANGED HERE
            user.save()
            print("Reset code saved to user object")
            
            # For development, just print the code
            print(f"\n*** RESET CODE FOR {email}: {reset_code} ***\n")
            
            # Try to send email
            email_sent = False
            try:
                subject = 'Password Reset Code - Help Desk System'
                message = f"""
Hello {user.first_name or user.username},

You requested to reset your password. Your password reset code is:

{reset_code}

This code is valid for 15 minutes.

If you didn't request this, please ignore this email.

Best regards,
Help Desk System Team
"""
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [email],
                    fail_silently=False,
                )
                email_sent = True
                print("Email sent successfully!")
            except Exception as e:
                print(f"Email failed: {e}")
            
            return Response({
                "message": "Password reset code has been sent to your email." if email_sent else f"Reset code generated. Use code: {reset_code}",
                "email": email
            }, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            print(f"No user found with email: {email}")
            return Response({"email": ["No user found with this email address"]}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()
            return Response({"message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class VerifyResetCodeView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        print("\n" + "="*50)
        print("VERIFY RESET CODE")
        print("="*50)
        
        email = request.data.get('email')
        code = request.data.get('code')
        
        print(f"Email: {email}, Code: {code}")
        
        if not email or not code:
            return Response({"message": "Email and code are required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email=email)
            print(f"User found: {user.username}")
            print(f"Stored code: {user.reset_code}")
            print(f"Code created at: {user.reset_code_created_at}")
            
            if not user.reset_code:
                return Response({"code": ["No reset code found. Please request a new one."]}, status=status.HTTP_400_BAD_REQUEST)
            
            if user.reset_code != code:
                print(f"Code mismatch: {user.reset_code} vs {code}")
                return Response({"code": ["Invalid reset code"]}, status=status.HTTP_400_BAD_REQUEST)
            
            # Check expiration (15 minutes) - USE timezone.now()
            if user.reset_code_created_at:
                expiration_time = user.reset_code_created_at + timedelta(minutes=15)
                if timezone.now() > expiration_time:  # CHANGED HERE
                    print(f"Code expired. Created at: {user.reset_code_created_at}, Now: {timezone.now()}")
                    return Response({"code": ["Reset code has expired. Please request a new one."]}, status=status.HTTP_400_BAD_REQUEST)
            
            print("Code verified successfully!")
            return Response({
                "message": "Code verified successfully.",
                "email": email
            }, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            return Response({"email": ["No user found with this email address"]}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print(f"Error: {e}")
            return Response({"message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ResetPasswordView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        print("\n" + "="*50)
        print("RESET PASSWORD")
        print("="*50)
        
        email = request.data.get('email')
        code = request.data.get('code')
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')
        
        print(f"Email: {email}")
        
        if not email or not code or not new_password or not confirm_password:
            return Response({"message": "All fields are required"}, status=status.HTTP_400_BAD_REQUEST)
        
        if new_password != confirm_password:
            return Response({"confirm_password": ["Passwords do not match"]}, status=status.HTTP_400_BAD_REQUEST)
        
        if len(new_password) < 6:
            return Response({"new_password": ["Password must be at least 6 characters"]}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email=email)
            
            if not user.reset_code or user.reset_code != code:
                return Response({"code": ["Invalid reset code"]}, status=status.HTTP_400_BAD_REQUEST)
            
            if user.reset_code_created_at:
                expiration_time = user.reset_code_created_at + timedelta(minutes=15)
                if timezone.now() > expiration_time:  # CHANGED HERE
                    return Response({"code": ["Reset code has expired. Please request a new one."]}, status=status.HTTP_400_BAD_REQUEST)
            
            # Reset password
            user.set_password(new_password)
            user.reset_code = None
            user.reset_code_created_at = None
            user.save()
            
            print(f"Password reset successfully for {user.username}")
            
            # Try to send confirmation email
            try:
                subject = 'Password Reset Successful - Help Desk System'
                message = f"""
Hello {user.first_name or user.username},

Your password has been successfully reset.

If you did not perform this action, please contact support immediately.

Best regards,
Help Desk System Team
"""
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [email],
                    fail_silently=True,
                )
            except:
                pass
            
            return Response({
                "message": "Password has been reset successfully. You can now login with your new password."
            }, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            return Response({"email": ["No user found with this email address"]}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print(f"Error: {e}")
            return Response({"message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)