#!/bin/bash

set -e # Exit immediately if a command exits with a non-zero status.

echo "===== ENVIRONMENT DIAGNOSTICS ====="
echo "ENVIRONMENT: $ENVIRONMENT"
echo "PORT: $PORT"
echo "DATABASE_URL set: $([ -n "$DATABASE_URL" ] && echo 'Yes' || echo 'No')"
echo "DB_HOST: ${DB_HOST:-'not set'}"
echo "===== END DIAGNOSTICS ====="

# Determine if we're using Cloud SQL (DATABASE_URL contains /cloudsql/)
if [[ "$DATABASE_URL" == *"/cloudsql/"* ]]; then
    echo "Detected Cloud SQL connection via DATABASE_URL"
    # Cloud SQL connections via socket don't need a wait check
    # The Cloud SQL proxy is managed by Cloud Run
    echo "Skipping connection wait (Cloud SQL socket)"
elif [[ -n "$DB_HOST" && -n "$DB_PORT" ]]; then
    # For regular TCP connections (development with docker-compose)
    echo "Using TCP connection to database..."
    echo "Waiting for database at host $DB_HOST:$DB_PORT..."
    
    # Wait for database with timeout
    COUNTER=0
    MAX_TRIES=30
    while ! nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; do
        COUNTER=$((COUNTER + 1))
        if [ $COUNTER -ge $MAX_TRIES ]; then
            echo "ERROR: Could not connect to database after $MAX_TRIES attempts"
            exit 1
        fi
        echo "Waiting for database... ($COUNTER/$MAX_TRIES)"
        sleep 1
    done
    echo "Database is ready!"
else
    echo "No database connection method detected, proceeding..."
fi

# Run database migrations
echo "Applying database migrations..."
python manage.py migrate --noinput || {
    echo "Migration failed, but continuing..."
}

# Environment-specific execution
if [ "$ENVIRONMENT" = "development" ]; then
    echo "Starting in DEVELOPMENT mode on port 8000..."
    python manage.py runserver 0.0.0.0:8000
else
    echo "Starting in PRODUCTION mode..."

    # Collect static files
    echo "Collecting static files..."
    python manage.py collectstatic --noinput || true

    # Use Gunicorn WSGI server
    # Google Cloud Logging has been disabled in settings.py to fix worker startup issues
    PORT=${PORT:-8080}
    echo "Starting Gunicorn on 0.0.0.0:$PORT..."
    exec gunicorn samaanai.wsgi:application --config gunicorn.conf.py
fi