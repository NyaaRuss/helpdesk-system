from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.views.generic import TemplateView

def welcome_view(request):
    return JsonResponse({
        'message': 'Welcome to Help Desk System API',
        'endpoints': {
            'admin': '/admin/',
            'api_auth': '/api/auth/',
            'api_tickets': '/api/tickets/',
            'password_reset': {
                'request': '/api/auth/password-reset-request/',
                'verify': '/api/auth/verify-reset-code/',
                'reset': '/api/auth/reset-password/'
            }
        },
        'documentation': 'Use the API endpoints to interact with the system'
    })

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/tickets/', include('tickets.urls')),
    path('', welcome_view, name='welcome'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)