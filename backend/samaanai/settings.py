"""
Django settings for samaanai project.
Adapted for Cloud Run deployment.
"""

import os
from pathlib import Path
import environ
import google.auth
import json
from google.oauth2 import service_account
import google.cloud.logging
from google.cloud.logging.handlers import CloudLoggingHandler
import logging
from datetime import timedelta
import dj_database_url
from urllib.parse import urlparse
from decouple import config
import base64
import hashlib

# --- Setup logger ---
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO) 

# Console handler (for local dev mainly)
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.DEBUG) 

# Formatter
formatter = logging.Formatter('[%(asctime)s] %(levelname)s %(name)s: %(message)s')
console_handler.setFormatter(formatter)

# Add the console handler to the logger
logger.addHandler(console_handler)

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Initialize the environment object
env = environ.Env(
    # set casting, default value
    DEBUG=(bool, False)
)

# Load the .env file if it exists (primarily for development)
env_file = os.path.join(BASE_DIR.parent, '.env')  # Check for .env in project root
if os.path.exists(env_file):
    try:
        environ.Env.read_env(env_file)
    except Exception as e:
        logger.error(f"Error reading .env file: {str(e)}")
else:
    # Try other locations
    env_file = os.path.join(BASE_DIR, '.env')  # Check in app directory
    if os.path.exists(env_file):
        try:
            environ.Env.read_env(env_file)
        except Exception as e:
            logger.error(f"Error reading .env file: {str(e)}")
    else:
        # Try /app directory (for Docker)
        env_file = '/app/.env'
        if os.path.exists(env_file):
            try:
                environ.Env.read_env(env_file)
            except Exception as e:
                logger.error(f"Error reading .env file: {str(e)}")

# Environment variable
ENVIRONMENT = env('ENVIRONMENT', default='development')

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = env('SECRET_KEY', default=None)
DB_PASSWORD = env('DB_PASSWORD', default=None)
GS_CREDENTIALS = None

if ENVIRONMENT.lower() in ['development', 'test']:
    DEBUG = env.bool('DEBUG', default=True)
    PROJECT_ID = env('PROJECT_ID', default='samaanai-dev')
    FRONTEND_URL = env('FRONTEND_URL', default='http://localhost:3000')
    
    # CORS configuration for development
    CORS_ALLOWED_ORIGINS = [
        FRONTEND_URL,
        "http://localhost:3000",
        "https://localhost",
        "https://localhost:3000",
    ]
    
elif ENVIRONMENT.lower() == 'production':
    DEBUG = env.bool('DEBUG', default=False)
    
    # Get project ID from environment or Google Cloud metadata
    try:
        _, PROJECT_ID = google.auth.default()
    except Exception as e:
        logger.error(f"Could not get default credentials: {str(e)}")
        PROJECT_ID = env('PROJECT_ID', default=None)
        if not PROJECT_ID:
            logger.error("PROJECT_ID not found in environment or default credentials.")
            raise ValueError("PROJECT_ID must be set for production deployment")
    
    # Production secrets
    SECRET_KEY = env('SECRET_KEY', default=None)
    DB_PASSWORD = env('DB_PASSWORD', default=None)
    
    # Cloud Storage configuration
    try:
        GS_CREDENTIALS = service_account.Credentials.from_service_account_info(
            json.loads(env('GOOGLE_APPLICATION_CREDENTIALS'))
        )
    except (KeyError, json.JSONDecodeError, ValueError) as e:
        logger.warning("GOOGLE_APPLICATION_CREDENTIALS not found. Using default ADC for GCS.")
        GS_CREDENTIALS = None
    except Exception as e:
        logger.error(f"Failed to load GCS service account credentials: {e}")
        GS_CREDENTIALS = None
    
    # Static files (Google Cloud Storage)
    if GS_CREDENTIALS:
        DEFAULT_FILE_STORAGE = 'storages.backends.gcloud.GoogleCloudStorage'
        STATICFILES_STORAGE = 'storages.backends.gcloud.GoogleCloudStorage'
        GS_BUCKET_NAME = env('GS_BUCKET_NAME', default=f'{PROJECT_ID}-static')
        GS_CREDENTIALS = GS_CREDENTIALS
    
    # Production security settings
    ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['*'])
    
    FRONTEND_URL = env('FRONTEND_URL', default='https://your-frontend-domain.com')
    
    # CORS and CSRF settings
    CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[FRONTEND_URL])
    CSRF_TRUSTED_ORIGINS = env.list('CSRF_TRUSTED_ORIGINS', default=[FRONTEND_URL])

    EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
    EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')

    # --- Google Cloud Logging (with timeout to prevent blocking) ---
    import signal
    
    def timeout_handler(signum, frame):
        raise TimeoutError("Cloud Logging client initialization timed out")
    
    try:
        # Set a 5 second timeout for Cloud Logging initialization
        old_handler = signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(5)
        
        log_client = google.cloud.logging.Client()
        gcp_logging_handler = CloudLoggingHandler(log_client, name="django_app_logs")
        gcp_logging_handler.setLevel(logging.INFO) 

        root_logger = logging.getLogger()
        root_logger.addHandler(gcp_logging_handler)
        logger.info("Successfully set up Google Cloud Logging.")
        
        signal.alarm(0)  # Cancel the alarm
        signal.signal(signal.SIGALRM, old_handler)  # Restore old handler

    except TimeoutError:
        logger.warning("Google Cloud Logging client timed out, using console logging only.")
    except Exception as e:
        logger.error(f"Failed to set up Google Cloud Logging: {e}")


if not SECRET_KEY:
    logger.error("SECRET_KEY is not set. Check .env file or Secret Manager.")
    raise ValueError("SECRET_KEY is not set. Check .env file or Secret Manager.")
if not DB_PASSWORD:
     logger.warning("DB_PASSWORD is not set. Database connection might fail.")


# --- Plaid security configuration ---
PLAID_ENCRYPTION_KEY = env('PLAID_ENCRYPTION_KEY', default=None)
if not PLAID_ENCRYPTION_KEY:
    if ENVIRONMENT.lower() in ['development', 'test']:
        derived_key = base64.urlsafe_b64encode(
            hashlib.sha256((SECRET_KEY or 'samaanai-dev').encode()).digest()
        ).decode()
        PLAID_ENCRYPTION_KEY = derived_key
        logger.warning(
            "PLAID_ENCRYPTION_KEY not set; deriving a development-only key from SECRET_KEY."
        )
    else:
        logger.error("PLAID_ENCRYPTION_KEY must be configured in production.")
        raise ValueError("PLAID_ENCRYPTION_KEY must be configured in production.")

PLAID_WEBHOOK_SECRET = env('PLAID_WEBHOOK_SECRET', default=None)


# --- General Django Settings ---

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
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'storages', # For GCS
    # Local apps (Calorie Tracker)
    'apps.users.apps.UsersConfig',
    'apps.finance.apps.FinanceConfig',
    'apps.notifications',  # Add notifications app
    'social_django',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware', # Add Whitenoise
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware', 
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'samaanai.urls'

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

WSGI_APPLICATION = 'samaanai.wsgi.application'


# Database configuration
# Supports DATABASE_URL (TCP or Cloud SQL socket) or individual env vars (docker-compose)
DATABASE_URL = os.environ.get('DATABASE_URL')

if DATABASE_URL:
    # Parse DATABASE_URL
    # TCP format: postgresql://user:pass@hostname:port/dbname
    # Socket format: postgresql://user:pass@/dbname?host=/cloudsql/project:region:instance
    import urllib.parse
    url = urllib.parse.urlparse(DATABASE_URL)
    
    # Check if using TCP (hostname present) or Unix socket (host in query params)
    query_params = urllib.parse.parse_qs(url.query)
    socket_host = query_params.get('host', [None])[0]
    
    if url.hostname:
        # TCP connection (preferred for Cloud Run)
        db_host = url.hostname
        db_port = url.port or 5432
        logger.info(f"Using TCP DATABASE_URL, connecting to: {db_host}:{db_port}")
    elif socket_host:
        # Unix socket connection (Cloud SQL proxy)
        db_host = socket_host
        db_port = ''
        logger.info(f"Using socket DATABASE_URL, connecting via: {db_host}")
    else:
        db_host = 'localhost'
        db_port = 5432
        logger.warning("Could not parse DATABASE_URL host, using localhost")
    
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': url.path[1:] if url.path else 'samaanai_finance',  # Remove leading /
            'USER': url.username or 'finance_user',
            'PASSWORD': url.password or '',
            'HOST': db_host,
            'PORT': db_port,
            'CONN_MAX_AGE': 0,  # Disable persistent connections for Cloud Run
            'CONN_HEALTH_CHECKS': True,
            'OPTIONS': {
                'connect_timeout': 10,
            },
        }
    }
else:
    # Fallback for docker-compose / local development
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': env('POSTGRES_DB', default='samaanai_dev'),
            'USER': env('POSTGRES_USER', default='testuser'),
            'PASSWORD': DB_PASSWORD if ENVIRONMENT == 'production' else env('POSTGRES_PASSWORD', default='testpass123'),
            'HOST': env('DB_HOST', default='db'),
            'PORT': env('DB_PORT', default='5432'),
            'CONN_MAX_AGE': 600,
            'CONN_HEALTH_CHECKS': True,
        }
    }
    logger.info(f"Using individual DB env vars, connecting to host: {DATABASES['default']['HOST']}")


# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# REST Framework Settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50
}

# Simple JWT settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=14),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
}

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Media files (user uploads)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Static files finders
STATICFILES_FINDERS = [
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
]

# Additional static files directories
STATICFILES_DIRS = [
    BASE_DIR / 'static',
]
# Whitenoise storage for static files
if not GS_CREDENTIALS:
    STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'


# Logging Configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
            'level': 'DEBUG' if DEBUG else 'INFO',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'nutrition': {
            'handlers': ['console'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
        'users': {
            'handlers': ['console'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
        'notifications': {
            'handlers': ['console'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
    }
}

# CORS settings
CORS_ALLOW_ALL_ORIGINS = False  # Cannot use wildcard with credentials
CORS_ALLOW_CREDENTIALS = True  # Allow cookies and authentication headers

# Google OAuth Configuration
AUTHENTICATION_BACKENDS = [
    'social_core.backends.google.GoogleOAuth2',
    'django.contrib.auth.backends.ModelBackend',
]

# Session configuration for OAuth
SESSION_ENGINE = 'django.contrib.sessions.backends.db'
SESSION_COOKIE_AGE = 1209600  # 2 weeks
SESSION_COOKIE_SECURE = not DEBUG  # Use secure cookies in production
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_SAVE_EVERY_REQUEST = True

SOCIAL_AUTH_GOOGLE_OAUTH2_KEY = env('GOOGLE_CLIENT_ID', default='')
SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET = env('GOOGLE_CLIENT_SECRET', default='')
SOCIAL_AUTH_GOOGLE_OAUTH2_SCOPE = ['email', 'profile']
SOCIAL_AUTH_URL_NAMESPACE = 'social'

# Add session storage configuration for OAuth state
SOCIAL_AUTH_STORAGE = 'social_django.models.DjangoStorage'
SOCIAL_AUTH_STRATEGY = 'social_django.strategy.DjangoStrategy'

# OAuth security settings
SOCIAL_AUTH_RAISE_EXCEPTIONS = False
SOCIAL_AUTH_LOGIN_ERROR_URL = '/login?error=oauth_error'
SOCIAL_AUTH_SANITIZE_REDIRECTS = False
SOCIAL_AUTH_ALLOWED_REDIRECT_URIS = [
    f'{FRONTEND_URL}/social-login-callback',
    f'{FRONTEND_URL}/login',
    f'{FRONTEND_URL}/',
]

# Add state handling configuration
SOCIAL_AUTH_STATE_PARAMETER = True
SOCIAL_AUTH_GOOGLE_OAUTH2_STATE_PARAMETER = True
SOCIAL_AUTH_GOOGLE_OAUTH2_IGNORE_DEFAULT_SCOPE = True
SOCIAL_AUTH_GOOGLE_OAUTH2_USE_UNIQUE_USER_ID = True

# Validate Google OAuth credentials
if not SOCIAL_AUTH_GOOGLE_OAUTH2_KEY:
    logger.warning("GOOGLE_CLIENT_ID is not set. Google OAuth will not work.")
if not SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET:
    logger.warning("GOOGLE_CLIENT_SECRET is not set. Google OAuth will not work.")

if ENVIRONMENT == 'development':
    # Use HTTPS redirect URI if FRONTEND_URL is HTTPS, otherwise use HTTP
    if FRONTEND_URL.startswith('https://'):
        SOCIAL_AUTH_GOOGLE_OAUTH2_REDIRECT_URI = 'https://localhost/api/auth/social/complete/google-oauth2/'
        SOCIAL_AUTH_REDIRECT_IS_HTTPS = True
        logger.info("Using HTTPS OAuth redirect for development")
    else:
        SOCIAL_AUTH_GOOGLE_OAUTH2_REDIRECT_URI = 'http://localhost:8000/api/auth/social/complete/google-oauth2/'
        SOCIAL_AUTH_REDIRECT_IS_HTTPS = False
        logger.info("Using HTTP OAuth redirect for development")
else:
    # Production Google OAuth configuration - construct from environment variable or use a default
    cloudrun_url = env("CLOUDRUN_SERVICE_URL", default=None)
    if cloudrun_url:
        SOCIAL_AUTH_GOOGLE_OAUTH2_REDIRECT_URI = f'{cloudrun_url}/api/auth/social/complete/google-oauth2/'
        logger.info(f"Using CLOUDRUN_SERVICE_URL for OAuth redirect: {SOCIAL_AUTH_GOOGLE_OAUTH2_REDIRECT_URI}")
    else:
        # Fallback: use the actual Cloud Run URL - UPDATE THIS if your service name/region changes
        SOCIAL_AUTH_GOOGLE_OAUTH2_REDIRECT_URI = 'https://samaanai-finance-backend-fdra3qcqxq-uc.a.run.app/api/auth/social/complete/google-oauth2/'
        logger.warning(f"CLOUDRUN_SERVICE_URL not set, using fallback OAuth redirect: {SOCIAL_AUTH_GOOGLE_OAUTH2_REDIRECT_URI}")
    SOCIAL_AUTH_REDIRECT_IS_HTTPS = True

# SOCIAL_AUTH_LOGIN_REDIRECT_URL = '/api/auth/social/token/' # Commented out

SOCIAL_AUTH_PIPELINE = (
    'social_core.pipeline.social_auth.social_details',
    'social_core.pipeline.social_auth.social_uid',
    'social_core.pipeline.social_auth.auth_allowed',
    'social_core.pipeline.social_auth.social_user',
    'social_core.pipeline.user.get_username',
    # Ensure 'apps.users.pipeline.generate_tokens_and_redirect_to_frontend' 
    # is AFTER user creation and association.
    'social_core.pipeline.user.create_user', # Creates user if new
    'social_core.pipeline.social_auth.associate_user', # Associates social account with user
    'social_core.pipeline.social_auth.load_extra_data',
    'social_core.pipeline.user.user_details',
    'apps.users.pipeline.generate_tokens_and_redirect_to_frontend',
)

# --- Plaid Configuration ---
PLAID_CLIENT_ID = os.environ.get('PLAID_CLIENT_ID')
PLAID_SECRET_SANDBOX = os.environ.get('PLAID_SECRET_SANDBOX') # For Sandbox environment
PLAID_SECRET_PRODUCTION = os.environ.get('PLAID_SECRET_PRODUCTION')   # For Production
PLAID_ENV = os.environ.get('PLAID_ENV', 'sandbox') # e.g., 'sandbox', 'development', 'production'
PLAID_API_VERSION = '2020-09-14' # Specify your desired Plaid API version

# Add some simple logging to debug Plaid configuration
logger.info(f"PLAID_CLIENT_ID loaded in settings: {PLAID_CLIENT_ID}")
logger.info(f"PLAID_SECRET_SANDBOX loaded in settings: {'SET' if PLAID_SECRET_SANDBOX else 'NOT SET'}")
logger.info(f"PLAID_SECRET_PRODUCTION loaded in settings: {'SET' if PLAID_SECRET_PRODUCTION else 'NOT SET'}")
logger.info(f"PLAID_ENV loaded in settings: {PLAID_ENV}")
logger.info(f"PLAID_API_VERSION loaded in settings: {PLAID_API_VERSION}")

# You might also want to define your webhook URL if you're using webhooks
PLAID_WEBHOOK_URL = os.environ.get('PLAID_WEBHOOK_URL')

# --- Email Configuration (SendGrid) ---
SENDGRID_API_KEY = env('SENDGRID_API_KEY', default='')
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default='noreply@financeapp.com')

if SENDGRID_API_KEY:
    # Use SendGrid as email backend
    EMAIL_BACKEND = 'sendgrid_backend.SendgridBackend'
    SENDGRID_API_KEY = SENDGRID_API_KEY
    logger.info("SendGrid email backend configured")
else:
    # Fallback to console backend for development
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
    logger.warning("SendGrid API key not configured. Using console email backend.")

# Email configuration for SMTP fallback (if needed)
EMAIL_HOST = env('EMAIL_HOST', default='smtp.sendgrid.net')
EMAIL_PORT = env.int('EMAIL_PORT', default=587)
EMAIL_USE_TLS = env.bool('EMAIL_USE_TLS', default=True)
EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='apikey')  # For SendGrid, this is always 'apikey'
EMAIL_HOST_PASSWORD = SENDGRID_API_KEY  # Use SendGrid API key as password

# --- Notification Settings ---
# Template directories
TEMPLATES[0]['DIRS'] = [
    BASE_DIR / 'templates',  # Add templates directory
]

# Add notifications to loggers
LOGGING['loggers']['notifications'] = {
    'handlers': ['console'],
    'level': 'DEBUG' if DEBUG else 'INFO',
    'propagate': False,
}

# HTTPS/SSL Settings for reverse proxy
# Enable these when running behind NGINX with HTTPS
SECURE_PROXY_SSL_HEADER = None
SECURE_SSL_REDIRECT = False

# Check if we're behind a reverse proxy with HTTPS
if config('SECURE_PROXY_SSL_HEADER_NAME', default=''):
    SECURE_PROXY_SSL_HEADER = (
        config('SECURE_PROXY_SSL_HEADER_NAME'),
        config('SECURE_PROXY_SSL_HEADER_VALUE', default='https')
    )

# Only enable SSL redirect in production or when explicitly set
if config('SECURE_SSL_REDIRECT', default=False, cast=bool):
    SECURE_SSL_REDIRECT = True
    SECURE_REDIRECT_EXEMPT = []

# Additional security settings for HTTPS (only in production)
if not DEBUG and FRONTEND_URL.startswith('https://'):
    # CSRF settings for HTTPS
    CSRF_COOKIE_SECURE = True
    CSRF_COOKIE_HTTPONLY = True
    CSRF_TRUSTED_ORIGINS = [FRONTEND_URL]
    
    # Session cookie settings
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    
    # Additional security headers
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
