"""
Gunicorn configuration for Cloud Run deployment.
"""
import os

# Server socket
bind = f"0.0.0.0:{os.environ.get('PORT', '8080')}"

# Worker processes - use sync workers to avoid threading issues
# Sync workers are more reliable for Django on Cloud Run
workers = 2
worker_class = 'sync'
timeout = 300

# Logging
accesslog = '-'
errorlog = '-'
loglevel = 'info'

# Disable preload_app for Cloud Run ephemeral instances
preload_app = False
