"""
Gunicorn configuration for Cloud Run deployment.
"""
import os

# Server socket
bind = f"0.0.0.0:{os.environ.get('PORT', '8080')}"

# Worker processes - use sync workers (simpler than threaded)
workers = 4
worker_class = 'sync'
timeout = 300

# Logging
accesslog = '-'
errorlog = '-'
loglevel = 'info'

# Don't preload app
preload_app = False
