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
logger.info(f"Looking for .env file at: {env_file}")
logger.info(f"BASE_DIR is: {BASE_DIR}")
logger.info(f"BASE_DIR.parent is: {BASE_DIR.parent}")
logger.info(f"Current working directory: {os.getcwd()}")

# Check if file exists
if os.path.isfile(env_file):
    logger.info(f".env file found at {env_file}")
    try:
        env.read_env(env_file)
        logger.info(".env file loaded from project root")
    except Exception as e:
        logger.error(f"Error reading .env file: {str(e)}")
else:
    logger.warning(f".env file not found at {env_file}")
    # Try in current directory as fallback
    env_file = os.path.join(BASE_DIR, '.env')
    logger.info(f"Looking for .env file at: {env_file}")
    if os.path.isfile(env_file):
        logger.info(f".env file found at {env_file}")
        try:
            env.read_env(env_file)
            logger.info(".env file loaded from app directory")
        except Exception as e:
            logger.error(f"Error reading .env file: {str(e)}")
    else:
        logger.warning(f".env file not found at {env_file}")
        
        # Last resort: check in /app directly
        env_file = '/app/.env'
        logger.info(f"Looking for .env file at: {env_file}")
        if os.path.isfile(env_file):
            logger.info(f".env file found at {env_file}")
            try:
                env.read_env(env_file)
                logger.info(".env file loaded from /app directory")
            except Exception as e:
                logger.error(f"Error reading .env file: {str(e)}")
        else:
            logger.warning(f".env file not found at {env_file}")
            logger.warning("No .env file found in any of the checked locations")

# Determine the environment ('development' or 'production')
ENVIRONMENT = env('ENVIRONMENT', default='development')
logger.info(f"Environment: {ENVIRONMENT}")

# --- Environment-Specific Settings ---
SECRET_KEY = None
DB_PASSWORD = None
GS_CREDENTIALS = None # For GCS Storage

if ENVIRONMENT in ['development', 'test']:
    logger.info('Configuring for Development/Test Environment')
    ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'backend'] 
    DEBUG = env.bool('DEBUG', default=True) 

    SECRET_KEY = env('SECRET_KEY', default='django-insecure-dev-key-calorie-tracker')
    logger.info(f"SECRET_KEY loaded: {'set' if SECRET_KEY else 'not set'}")
    DB_PASSWORD = env('DB_PASSWORD', default='testpass123') 
    logger.info(f"DB_PASSWORD loaded: {'set' if DB_PASSWORD else 'not set'}")
    PROJECT_ID = env('PROJECT_ID', default=None) 
    logger.info(f"PROJECT_ID: {PROJECT_ID}")

    EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
    EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')

    STATIC_URL = '/static/'
    STATIC_ROOT = BASE_DIR.parent / 'staticfiles' 
    MEDIA_URL = '/media/'
    MEDIA_ROOT = BASE_DIR.parent / 'media'

    CORS_ALLOWED_ORIGINS = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    logger.info(f"CORS_ALLOWED_ORIGINS: {CORS_ALLOWED_ORIGINS}")
    
else: # Production (Cloud Run)
    logger.info('Configuring for PRODUCTION Environment (Cloud Run)')
    DEBUG = env.bool('DEBUG', default=False)

    # --- Google Cloud Secret Manager ---
    try:
        _, PROJECT_ID = google.auth.default()
        logger.info(f"Google Cloud project: {PROJECT_ID}")
    except google.auth.exceptions.DefaultCredentialsError as e:
        logger.error(f"Could not get default credentials: {str(e)}")
        PROJECT_ID = env('PROJECT_ID', default=None) 

    if not PROJECT_ID:
         logger.error("PROJECT_ID not found in environment or default credentials.")
         raise Exception("PROJECT_ID not found in environment or default credentials.")

    EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
    EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')

    def get_secret(secret_name, project_id=PROJECT_ID):
        """Retrieves the value of a secret from Google Secret Manager."""
        try:
            from google.cloud import secretmanager
            client = secretmanager.SecretManagerServiceClient()
            name = f"projects/{project_id}/secrets/{secret_name}/versions/latest"
            response = client.access_secret_version(request={"name": name})
            secret_value = response.payload.data.decode('UTF-8')
            logger.info(f"Successfully retrieved secret: {secret_name}")
            return secret_value
        except Exception as e:
            logger.error(f"Failed to retrieve secret {secret_name}: {e}")
            return None 

    # Fetch secrets
    SECRET_KEY = get_secret('SECRET_KEY')
    logger.info(f"SECRET_KEY loaded: {'set' if SECRET_KEY else 'not set'}")
    DB_PASSWORD = get_secret('DB_PASSWORD')
    logger.info(f"DB_PASSWORD loaded: {'set' if DB_PASSWORD else 'not set'}")
    
    try:
        gcs_sa_key_content = get_secret('GOOGLE_APPLICATION_CREDENTIALS') 
        if gcs_sa_key_content:
            service_account_info = json.loads(gcs_sa_key_content)
            GS_CREDENTIALS = service_account.Credentials.from_service_account_info(service_account_info)
            logger.info("Successfully loaded GCS service account credentials from Secret Manager.")
        else:
            logger.warning("GOOGLE_APPLICATION_CREDENTIALS secret not found or empty. Using default ADC for GCS.")
            GS_CREDENTIALS = None
    except Exception as e:
        logger.error(f"Failed to load GCS service account credentials: {e}")
        GS_CREDENTIALS = None 

    # --- Static/Media Storage: Google Cloud Storage ---
    logger.info("Static/Media Storage: Google Cloud Storage")
    DEFAULT_FILE_STORAGE = 'storages.backends.gcloud.GoogleCloudStorage'
    STATICFILES_STORAGE = 'storages.backends.gcloud.GoogleCloudStorage'
    GS_BUCKET_NAME = env('GS_BUCKET_NAME') 
    logger.info(f"GS_BUCKET_NAME: {GS_BUCKET_NAME}")
    STATIC_URL = f'https://storage.googleapis.com/{GS_BUCKET_NAME}/static/'
    MEDIA_URL = f'https://storage.googleapis.com/{GS_BUCKET_NAME}/media/'

    # --- Cloud Run Specific Settings ---
    CLOUDRUN_SERVICE_URL = env("CLOUDRUN_SERVICE_URL", default=None)
    if CLOUDRUN_SERVICE_URL:
         ALLOWED_HOSTS = [urlparse(CLOUDRUN_SERVICE_URL).netloc, '.samaanai.com'] 
    else:
         ALLOWED_HOSTS = env.list('DJANGO_ALLOWED_HOSTS', default=[])
    logger.info(f"ALLOWED_HOSTS: {ALLOWED_HOSTS}")

    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

    # Trust the Cloud Run URL and potentially the custom domain
    CSRF_TRUSTED_ORIGINS = []
    if CLOUDRUN_SERVICE_URL:
        CSRF_TRUSTED_ORIGINS.append(CLOUDRUN_SERVICE_URL)
    logger.info(f"CSRF_TRUSTED_ORIGINS: {CSRF_TRUSTED_ORIGINS}")

    CORS_ALLOWED_ORIGINS = CSRF_TRUSTED_ORIGINS 

    # --- Google Cloud Logging ---
    try:
        log_client = google.cloud.logging.Client()
        gcp_logging_handler = CloudLoggingHandler(log_client, name="django_app_logs")
        gcp_logging_handler.setLevel(logging.INFO) 

        root_logger = logging.getLogger()
        root_logger.addHandler(gcp_logging_handler)
        logger.info("Successfully set up Google Cloud Logging.")

    except Exception as e:
        logger.error(f"Failed to set up Google Cloud Logging: {e}")


if not SECRET_KEY:
    logger.error("SECRET_KEY is not set. Check .env file or Secret Manager.")
    raise ValueError("SECRET_KEY is not set. Check .env file or Secret Manager.")
if not DB_PASSWORD:
     logger.warning("DB_PASSWORD is not set. Database connection might fail.")


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
    'apps.nutrition.apps.NutritionConfig',
    'social_django',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
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


DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': env('POSTGRES_DB', default='samaanai_dev'),
        'USER': env('POSTGRES_USER', default='testuser'),
        'PASSWORD': DB_PASSWORD if ENVIRONMENT == 'production' else env('POSTGRES_PASSWORD', default='testpass123'),
        'HOST': env('DB_HOST', default='db'),
        'PORT': env('DB_PORT', default='5432'),
    }
}

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
    }
}

# CORS settings
CORS_ALLOW_ALL_ORIGINS = DEBUG  # Allow all origins in development

# Google OAuth Configuration
AUTHENTICATION_BACKENDS = [
    'social_core.backends.google.GoogleOAuth2',
    'django.contrib.auth.backends.ModelBackend',
]

SOCIAL_AUTH_GOOGLE_OAUTH2_KEY = env('GOOGLE_CLIENT_ID', default='')
SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET = env('GOOGLE_CLIENT_SECRET', default='')
SOCIAL_AUTH_GOOGLE_OAUTH2_SCOPE = ['email', 'profile']
SOCIAL_AUTH_URL_NAMESPACE = 'social'

if ENVIRONMENT == 'development':
    SOCIAL_AUTH_GOOGLE_OAUTH2_REDIRECT_URI = 'http://localhost:8000/api/auth/social/complete/google-oauth2/'
    SOCIAL_AUTH_REDIRECT_IS_HTTPS = False
else:
    # Production Google OAuth configuration - construct from CLOUDRUN_SERVICE_URL or use a default
    if CLOUDRUN_SERVICE_URL:
        SOCIAL_AUTH_GOOGLE_OAUTH2_REDIRECT_URI = f'{CLOUDRUN_SERVICE_URL}/api/auth/social/complete/google-oauth2/'
    else:
        # Fallback: you can update this with your actual Cloud Run URL after deployment
        SOCIAL_AUTH_GOOGLE_OAUTH2_REDIRECT_URI = 'https://samaanai-backend-SERVICE_HASH.a.run.app/api/auth/social/complete/google-oauth2/'
    SOCIAL_AUTH_REDIRECT_IS_HTTPS = True

SOCIAL_AUTH_LOGIN_REDIRECT_URL = '/api/auth/social/token/'

SOCIAL_AUTH_PIPELINE = (
    'social_core.pipeline.social_auth.social_details',
    'social_core.pipeline.social_auth.social_uid',
    'social_core.pipeline.social_auth.auth_allowed',
    'social_core.pipeline.social_auth.social_user',
    'social_core.pipeline.user.get_username',
    'social_core.pipeline.user.create_user',
    'social_core.pipeline.social_auth.associate_user',
    'social_core.pipeline.social_auth.load_extra_data',
    'social_core.pipeline.user.user_details',
)
# Add the FRONTEND_URL setting
FRONTEND_URL = env('FRONTEND_URL', default='http://localhost:3000')
