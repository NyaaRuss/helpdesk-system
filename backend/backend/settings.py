import os
from datetime import timedelta
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-your-secret-key-change-in-production'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

# Allow all hosts - for development only
ALLOWED_HOSTS = ['*', '192.168.56.1', 'localhost', '172.21.208.1', '127.0.0.1', '192.168.1.82', '192.168.1.*', '10.0.0.*', '8873-197-155-233-246.ngrok-free.app','7d93-197-155-233-246.ngrok-free.app',]


# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third-party apps
    'rest_framework',
    'corsheaders',
    'channels',
    'rest_framework_simplejwt',
    'django_filters',
    'django_celery_beat',
    'django_celery_results',
    
    # Local apps
    'users',
    'tickets',
    'notifications',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Must be at the top
    'django.middleware.common.CommonMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'backend.middleware.RequestLoggingMiddleware',
]

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'
ASGI_APPLICATION = 'backend.asgi.application'

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom User Model
AUTH_USER_MODEL = 'users.User'

# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': [ 
        'rest_framework.permissions.AllowAny'
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
    ],
}

# JWT Settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}

# ========== CORS SETTINGS - Allow all origins ==========
# Allow all origins (for development)
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_PRIVATE_NETWORK = True

# Specific allowed origins (for production-like setup)
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://192.168.56.1:3000",
    "http://192.168.56.1:8000",
    "http://192.168.1.82:3000",
    "http://192.168.1.82:8000",
    "http://192.168.1.100:3000",
    "http://192.168.1.101:3000",
    "http://172.21.208.1:3000",
    "http://192.168.1.102:3000",
    "http://10.0.0.1:3000",
    "http://10.0.0.2:3000",
    "http://8873-197-155-233-246.ngrok-free.app",
    "http://7d93-197-155-233-246.ngrok-free.app",
]

# Allow all methods
CORS_ALLOW_METHODS = [
    "DELETE",
    "GET",
    "OPTIONS",
    "PATCH",
    "POST",
    "PUT",
]

# Allow all headers
CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
    "x-custom-header",
]

# Also allow these for preflight requests
CORS_PREFLIGHT_MAX_AGE = 86400  # 24 hours

# ========== EMAIL SETTINGS ==========
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'chirimuutarufaro889@gmail.com'
EMAIL_HOST_PASSWORD = 'jfrs rsyy wgcl oflg'  # Remove spaces when using: 'jfrsrsyywgcloflg'
DEFAULT_FROM_EMAIL = 'chirimuutarufaro889@gmail.com'

# Email IMAP Settings for inbound email processing
EMAIL_IMAP_HOST = 'imap.gmail.com'
EMAIL_IMAP_PORT = 993
EMAIL_IMAP_USER = 'chirimuutarufaro889@gmail.com'
EMAIL_IMAP_PASSWORD = 'jfrs rsyy wgcl oflg'  # Remove spaces when using
HELPDESK_EMAIL = 'chirimuutarufaro889@gmail.com'

# Frontend URL - Change this to your network IP
FRONTEND_URL = 'http://192.168.56.1:3000'  # Use your network IP

# Celery Configuration
CELERY_BROKER_URL = 'redis://localhost:6379/0'
CELERY_RESULT_BACKEND = 'django-db'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

# Escalation settings
ESCALATION_MINUTES = 5
ESCALATION_CHECK_INTERVAL = 1

# Additional security settings for network access
SECURE_CROSS_ORIGIN_OPENER_POLICY = None
SECURE_CROSS_ORIGIN_EMBEDDER_POLICY = None

# Disable CSRF for API in development (optional, for testing)
# For production, keep CSRF enabled
if DEBUG:
    CSRF_TRUSTED_ORIGINS = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://192.168.56.1:3000",
        "http://192.168.1.83:3000",
        "http://192.168.1.79:3000",
        "http://172.21.208.1:3000",
        "http://10.0.0.1:3000",
        "http://8873-197-155-233-246.ngrok-free.app",
        "http://7d93-197-155-233-246.ngrok-free.app",

    ]
    CSRF_COOKIE_SAMESITE = 'Lax'
    CSRF_COOKIE_HTTPONLY = False
    SESSION_COOKIE_SAMESITE = 'Lax'