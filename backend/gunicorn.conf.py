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

# Disable preload_app to avoid worker hanging issues on Cloud Run
# Each worker will load Django independently, which is more reliable
# for ephemeral Cloud Run instances
preload_app = False
