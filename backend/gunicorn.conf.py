"""
Gunicorn configuration for Cloud Run deployment.
Optimized for Django applications with Cloud SQL and external APIs.
"""
import os
import multiprocessing

# Server socket
bind = f"0.0.0.0:{os.environ.get('PORT', '8080')}"

# Worker processes
# For Cloud Run: use 2 workers for predictable memory usage
# Formula: (2 x CPU) + 1, but Cloud Run typically allocates 1 CPU
workers = 2
worker_class = 'sync'  # Sync workers are most reliable for Django

# Timeouts
timeout = 300  # 5 minutes for long-running requests (Plaid API, etc.)
graceful_timeout = 120  # 2 minutes for graceful shutdown
keepalive = 5  # Keep connections alive for 5 seconds

# Worker lifecycle
max_requests = 1000  # Restart workers after 1000 requests to prevent memory leaks
max_requests_jitter = 50  # Add randomness to prevent all workers restarting at once

# Logging
accesslog = '-'  # stdout
errorlog = '-'   # stderr
loglevel = 'info'

# Disable preload_app - each worker loads app independently
# This prevents issues with database connections and signal handlers
preload_app = False

# Worker tmp directory - use /tmp for Cloud Run
worker_tmp_dir = '/tmp'
