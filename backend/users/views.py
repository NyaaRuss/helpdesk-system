# user/views.py
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import (
    UserSerializer, 
    RegisterSerializer, 
    LoginSerializer,
    PasswordResetRequestSerializer,
    VerifyResetCodeSerializer,
    ResetPasswordSerializer,
    UpdateProfileSerializer
)
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
import random
import string
import os

User = get_user_model()

# ========== EXISTING VIEWS ==========

class RegisterView(generics.CreateAPIView):
    """User registration view"""
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

class LoginView(generics.GenericAPIView):
    """User login view"""
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data
        })

class UserProfileView(generics.RetrieveUpdateAPIView):
    """Get and update user profile"""
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer
    
    def get_object(self):
        return self.request.user

class UpdateProfileView(generics.UpdateAPIView):
    """Update user profile including profile picture"""
    permission_classes = [IsAuthenticated]
    serializer_class = UpdateProfileSerializer
    
    def get_object(self):
        return self.request.user
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response({
            'message': 'Profile updated successfully',
            'user': UserSerializer(instance).data
        })

class DeleteProfilePictureView(generics.GenericAPIView):
    """Delete user's profile picture"""
    permission_classes = [IsAuthenticated]
    
    def delete(self, request):
        user = request.user
        if user.profile_picture:
            if os.path.isfile(user.profile_picture.path):
                os.remove(user.profile_picture.path)
            user.profile_picture = None
            user.save()
            return Response({'message': 'Profile picture removed successfully'}, status=status.HTTP_200_OK)
        return Response({'message': 'No profile picture to remove'}, status=status.HTTP_400_BAD_REQUEST)

class UserListView(generics.ListAPIView):
    """List all users (admin only)"""
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'admin':
            return User.objects.all()
        elif user.user_type == 'engineer':
            return User.objects.filter(user_type='client')
        else:
            return User.objects.filter(id=user.id)
    
    def list(self, request, *args, **kwargs):
        user_type = request.query_params.get('user_type')
        queryset = self.get_queryset()
        
        if user_type:
            queryset = queryset.filter(user_type=user_type)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

# ========== PASSWORD RESET VIEWS ==========

class PasswordResetRequestView(generics.GenericAPIView):
    """Request a password reset code"""
    permission_classes = [AllowAny]
    serializer_class = PasswordResetRequestSerializer
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        
        if serializer.is_valid():
            email = serializer.validated_data['email']
            
            try:
                user = User.objects.get(email__iexact=email)
                
                reset_code = ''.join(random.choices(string.digits, k=6))
                
                user.reset_code = reset_code
                user.reset_code_created_at = timezone.now()
                user.save()
                
                try:
                    send_mail(
                        subject='Password Reset Code - Help Desk System',
                        message=f'Your password reset code is: {reset_code}\n\nThis code will expire in 15 minutes.\n\nIf you did not request this, please ignore this email.',
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[user.email],
                        fail_silently=False,
                        html_message=f"""
                        <html>
                        <body>
                            <h2>Password Reset Request</h2>
                            <p>You requested to reset your password. Use the code below to reset your password:</p>
                            <h1 style="color: #1a73e8; font-size: 32px;">{reset_code}</h1>
                            <p>This code will expire in <strong>15 minutes</strong>.</p>
                            <p>If you did not request this, please ignore this email.</p>
                            <hr>
                            <p>Help Desk System</p>
                        </body>
                        </html>
                        """
                    )
                    
                    return Response({
                        'message': 'Password reset code sent to your email'
                    }, status=status.HTTP_200_OK)
                    
                except Exception as email_error:
                    print(f"Email sending failed: {email_error}")
                    return Response({
                        'message': 'Failed to send email. Please try again later.'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    
            except User.DoesNotExist:
                return Response({
                    'message': 'If an account exists with this email, a reset code has been sent.'
                }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class VerifyResetCodeView(generics.GenericAPIView):
    """Verify the password reset code"""
    permission_classes = [AllowAny]
    serializer_class = VerifyResetCodeSerializer
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        
        if serializer.is_valid():
            return Response({
                'message': 'Code verified successfully'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ResetPasswordView(generics.GenericAPIView):
    """Reset password using the verified code"""
    permission_classes = [AllowAny]
    serializer_class = ResetPasswordSerializer
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        
        if serializer.is_valid():
            user = serializer.validated_data['user']
            new_password = serializer.validated_data['new_password']
            
            user.set_password(new_password)
            user.reset_code = None
            user.reset_code_created_at = None
            user.save()
            
            return Response({
                'message': 'Password reset successfully. You can now login with your new password.'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ========== NEW: USER DELETE VIEW ==========

class UserDeleteView(generics.DestroyAPIView):
    """Delete a user and send notification email (admin only)"""
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Only admins can delete users
        if self.request.user.user_type == 'admin':
            return User.objects.all()
        return User.objects.none()
    
    def destroy(self, request, *args, **kwargs):
        user_to_delete = self.get_object()
        deletion_reason = request.data.get('reason', 'No reason provided')
        
        # Prevent admin from deleting themselves
        if request.user.id == user_to_delete.id:
            return Response(
                {'error': 'You cannot delete your own account'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Store user details before deletion for email
        user_email = user_to_delete.email
        user_name = f"{user_to_delete.first_name} {user_to_delete.last_name}".strip() or user_to_delete.username
        user_type = user_to_delete.get_user_type_display()
        
        # Send email notification to the user being deleted
        self.send_deletion_notification(user_email, user_name, user_type, deletion_reason)
        
        # Delete the user
        user_to_delete.delete()
        
        return Response({
            'message': f'User {user_name} has been deleted successfully',
            'deleted_user': user_name
        }, status=status.HTTP_200_OK)
    
    def send_deletion_notification(self, email, name, user_type, reason):
        """Send deletion notification to the user"""
        from django.core.mail import send_mail
        from django.conf import settings
        
        subject = f"Your {user_type} account has been deleted"
        
        html_message = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; }}
                .container {{ max-width: 600px; margin: 0 auto; }}
                .header {{ background: #d32f2f; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; }}
                .info-box {{ background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0; }}
                .footer {{ background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>🗑️ Account Deletion Notice</h2>
                </div>
                <div class="content">
                    <p>Dear <strong>{name}</strong>,</p>
                    <p>Your {user_type} account has been deleted from the Help Desk System.</p>
                    
                    <div class="info-box">
                        <h3>📋 Account Details</h3>
                        <p><strong>Account Type:</strong> {user_type}</p>
                        <p><strong>Email:</strong> {email}</p>
                        <p><strong>Deletion Reason:</strong> {reason}</p>
                    </div>
                    
                    <p>If you believe this was a mistake or have any questions, please contact the system administrator.</p>
                    
                    <hr>
                    <p>Help Desk System Administrator</p>
                </div>
                <div class="footer">
                    <p>© 2024 Help Desk System. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        try:
            send_mail(
                subject=subject,
                message=f"Your {user_type} account has been deleted.\n\nReason: {reason}",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
                html_message=html_message
            )
            print(f"Deletion email sent to {email}")
        except Exception as e:
            print(f"Failed to send deletion email to {email}: {e}")