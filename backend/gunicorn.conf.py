"""
Gunicorn configuration for Cloud Run deployment.
"""
import os

# Server socket
bind = f"0.0.0.0:{os.environ.get('PORT', '8080')}"

# Worker processes - use gthread for better concurrency
# Each worker will have multiple threads to handle requests
workers = 1
worker_class = 'gthread'
threads = 4
timeout = 300

# Logging
accesslog = '-'
errorlog = '-'
loglevel = 'info'

# Enable preload_app since Django loads successfully during migrations
# This loads the application once in the main process, workers just fork
# Avoids duplicate Django initialization which seems to hang
preload_app = True

def post_fork(server, worker):
    """Called after a worker has been forked."""
    # Close database connections in the forked worker
    # They will be recreated on first use
    from django.db import connections
    for conn in connections.all():
        conn.close()
