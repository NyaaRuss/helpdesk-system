# user/urls.py
from django.urls import path
from . import views
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('profile/', views.UserProfileView.as_view(), name='profile'),
    path('update-profile/', views.UpdateProfileView.as_view(), name='update-profile'),
    path('delete-profile-picture/', views.DeleteProfilePictureView.as_view(), name='delete-profile-picture'),
    path('users/', views.UserListView.as_view(), name='user-list'),
    path('users/<int:pk>/', views.UserDeleteView.as_view(), name='user-delete'),  # ADD THIS LINE
    
    # Password Reset URLs
    path('password-reset-request/', views.PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('verify-reset-code/', views.VerifyResetCodeView.as_view(), name='verify-reset-code'),
    path('reset-password/', views.ResetPasswordView.as_view(), name='reset-password'),
]

# Add media URL serving for development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)