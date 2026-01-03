"""
Gunicorn configuration for Cloud Run deployment.
"""
import os

# Server socket
bind = f"0.0.0.0:{os.environ.get('PORT', '8080')}"

# Worker processes - use fewer workers for faster startup on Cloud Run
# Cloud Run instances are ephemeral, so we optimize for fast startup
workers = 2
worker_class = 'sync'
timeout = 300

# Logging
accesslog = '-'
errorlog = '-'
loglevel = 'info'

# Disable preload_app to avoid worker hanging issues on Cloud Run
# Each worker will load Django independently, which is more reliable
# for ephemeral Cloud Run instances
preload_app = False
