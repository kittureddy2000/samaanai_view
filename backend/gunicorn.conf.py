"""
Gunicorn configuration for Cloud Run deployment.
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

# Don't preload app - let each worker initialize Django properly
preload_app = False
