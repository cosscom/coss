"""Minimal settings for the test suite: no database, no apps."""

import django

SECRET_KEY = "coss-django-tests"
INSTALLED_APPS: list[str] = []
DATABASES: dict[str, dict[str, str]] = {}
USE_TZ = True
TIME_ZONE = "Europe/Berlin"

EMAIL_BACKEND = "coss_django.EmailBackend"
DEFAULT_FROM_EMAIL = "hello@acme.test"
SERVER_EMAIL = "server@acme.test"
EMAIL_SUBJECT_PREFIX = "[Acme] "
# Django 6.0 takes address strings; 5.2 takes (name, address) pairs.
ADMINS = ["Ops <ops@acme.test>"] if django.VERSION >= (6, 0) else [("Ops", "ops@acme.test")]

COSS_BASE_URL = "https://api.coss.test"
