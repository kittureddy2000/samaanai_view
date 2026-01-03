"""
Gunicorn configuration for Cloud Run deployment.
"""
import os

# Server socket
bind = f"0.0.0.0:{os.environ.get('PORT', '8080')}"

# Worker processes - use sync workers
workers = 4
worker_class = 'sync'
timeout = 300

# Logging
accesslog = '-'
errorlog = '-'
loglevel = 'info'

# Preload app to initialize Django before forking workers
# This ensures workers don't load Django on first request
preload_app = True


def on_starting(server):
    """Called before the server starts."""
    server.log.info("Preloading application...")


def post_fork(server, worker):
    """Called after a worker is forked. Close inherited DB connections."""
    try:
        from django.db import connections
        for conn in connections.all():
            conn.close()
        server.log.info(f"Worker {worker.pid}: Closed inherited DB connections")
    except Exception as e:
        server.log.warning(f"Worker {worker.pid}: {e}")
