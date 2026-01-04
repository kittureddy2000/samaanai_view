"""
WSGI config for samaanai project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/wsgi/
"""

import os
import sys

print("WSGI: Starting WSGI initialization", file=sys.stderr, flush=True)

from django.core.wsgi import get_wsgi_application

print("WSGI: Imported get_wsgi_application", file=sys.stderr, flush=True)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'samaanai.settings')

print("WSGI: Set DJANGO_SETTINGS_MODULE", file=sys.stderr, flush=True)

print("WSGI: About to call get_wsgi_application()", file=sys.stderr, flush=True)
application = get_wsgi_application()
print("WSGI: Successfully created WSGI application", file=sys.stderr, flush=True)