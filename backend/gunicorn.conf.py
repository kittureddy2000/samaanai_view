"""
Gunicorn configuration for Cloud Run deployment.
Handles database connection issues with worker forking.
"""
import os

# Server socket
bind = f"0.0.0.0:{os.environ.get('PORT', '8080')}"

# Worker processes
workers = 2
threads = 4
worker_class = 'gthread'
timeout = 300

# Logging
accesslog = '-'
errorlog = '-'
loglevel = 'info'

# Pre-load app to reduce cold start time, but we need to handle DB connections
preload_app = False  # Don't preload to avoid DB connection sharing issues


def post_fork(server, worker):
    """
    Called just after a worker has been forked.
    Close any open database connections to prevent sharing across fork boundary.
    """
    try:
        # Configure Django settings first
        import django
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'samaanai.settings')
        django.setup()
        
        from django.db import connections
        for conn in connections.all():
            conn.close()
        server.log.info(f"Worker {worker.pid}: Closed inherited database connections")
    except Exception as e:
        server.log.warning(f"Worker {worker.pid}: Note - {e}")


def worker_exit(server, worker):
    """
    Called just after a worker has been killed.
    """
    try:
        from django.db import connections
        for conn in connections.all():
            conn.close()
    except Exception:
        pass
