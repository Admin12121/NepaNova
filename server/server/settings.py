import os
from datetime import timedelta
from pathlib import Path
from urllib.parse import urlparse

import pymysql
from decouple import config

pymysql.install_as_MySQLdb()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config("SECRET_KEY")
FRONTEND_URL = config("FRONTEND_URL", default="http://localhost:3000")
BACKEND_URL = config("BACKEND_URL", default="http://127.0.0.1:8000")


def host_from_url(value, default):
    parsed = urlparse(value or "")
    host = parsed.hostname or value
    return host or default


FRONTEND = config("FRONTEND", default=host_from_url(FRONTEND_URL, "localhost"))
BACKEND = config("BACKEND", default=host_from_url(BACKEND_URL, "127.0.0.1"))
FRONTEND_SCHEME = urlparse(FRONTEND_URL).scheme
IS_LOCAL_HTTP = FRONTEND_SCHEME == "http" and FRONTEND in {"localhost", "127.0.0.1"}
DEBUG = str(config("DEBUG", default="false")).strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
    "debug",
}

ALLOWED_HOSTS = list(
    {
        host
        for host in [FRONTEND, BACKEND, "localhost", "127.0.0.1"]
        if host
    }
)

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party apps
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt",
    # Local apps
    "account.apps.AccountConfig",
    "product",
    "sales",
    "layout",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "server.middleware.security.TamperDetectionMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "server.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "server.wsgi.application"

AUTH_USER_MODEL = "account.User"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# DATABASES = {
#     "default": {
#         "ENGINE": "django.db.backends.mysql",
#         "NAME": config("DB_NAME"),
#         "USER": config("DB_USER"),
#         "PASSWORD": config("DB_PASSWORD"),
#         "HOST": config("DB_HOST"),
#         "PORT": "3306",
#         "OPTIONS": {"init_command": "SET sql_mode='STRICT_TRANS_TABLES'"},
#     }
# }

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, "static")

MEDIA_URL = "/media/"
MEDIA_ROOT = os.path.join(BASE_DIR, "media")

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {"anon": "50/minute", "user": "150/minute"},
}


DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

RESEND_API_KEY = config("RESEND_API_KEY", default="")
RESEND_AUDIENCE_ID = config("RESEND_AUDIENCE_ID", default="")
RESEND_FROM_EMAIL = config(
    "RESEND_FROM_EMAIL",
    default="NepaNova Impact <onboarding@resend.dev>",
) or "NepaNova Impact <onboarding@resend.dev>"
DEFAULT_FROM_EMAIL = RESEND_FROM_EMAIL

SEED_ADMIN_EMAIL = config("SEED_ADMIN_EMAIL", default="admin@gmail.com")
SEED_ADMIN_PASSWORD = config("SEED_ADMIN_PASSWORD", default="admin@#12")
SEED_ADMIN_FIRST_NAME = config("SEED_ADMIN_FIRST_NAME", default="Admin")
SEED_ADMIN_LAST_NAME = config("SEED_ADMIN_LAST_NAME", default="User")
SEED_ADMIN_USERNAME = config("SEED_ADMIN_USERNAME", default="@admin")

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(days=7),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "SIGNING_KEY": config("JWT_SECRET"),
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "LEAK_PROOF": True,
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
    "JTI_CLAIM": "jti",
}

CORS_ALLOWED_ORIGINS = list(
    {
        FRONTEND_URL.rstrip("/"),
        BACKEND_URL.rstrip("/"),
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    }
)
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS
SECURE_SSL_REDIRECT = config("SECURE_SSL_REDIRECT", default=False, cast=bool)
CSRF_COOKIE_SECURE = config(
    "CSRF_COOKIE_SECURE", default=not DEBUG and not IS_LOCAL_HTTP, cast=bool
)
SESSION_COOKIE_SECURE = config(
    "SESSION_COOKIE_SECURE", default=not DEBUG and not IS_LOCAL_HTTP, cast=bool
)

# --- OWASP Security Headers ---
# SECURE_HSTS_SECONDS = 31536000  # 1 year
# SECURE_HSTS_INCLUDE_SUBDOMAINS = True
# SECURE_HSTS_PRELOAD = True
# SECURE_CONTENT_TYPE_NOSNIFF = True
# SECURE_BROWSER_XSS_FILTER = True
# X_FRAME_OPTIONS = "DENY"
# SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"

# --- Request Size Limits (prevent DoS via large payloads) ---
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10 MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10 MB
DATA_UPLOAD_MAX_NUMBER_FIELDS = 100

PASSWORD_RESET_TIMEOUT = 300

FILE_UPLOAD_HANDLERS = [
    "django.core.files.uploadhandler.TemporaryFileUploadHandler",
]
