#!/bin/bash

set -e # Exit immediately if a command exits with a non-zero status.

# Check for .env file
echo "===== CHECKING FOR .ENV FILE ====="
if [ -f /app/.env ]; then
    echo ".env file exists in /app directory"
    ls -la /app/.env
else
    echo "WARNING: .env file NOT found in /app directory"
fi
echo "===== END ENV FILE CHECK ====="

# Diagnostic: Print environment variables related to database
echo "===== DATABASE CONNECTION DIAGNOSTICS ====="
echo "DB_HOST: $DB_HOST"
echo "DB_PORT: $DB_PORT"
echo "POSTGRES_DB: $POSTGRES_DB"
echo "POSTGRES_USER: $POSTGRES_USER"
echo "DATABASE_URL: $DATABASE_URL"
echo "ENVIRONMENT: $ENVIRONMENT"

# Wait for the database service to be ready
if [[ "$DB_HOST" == /cloudsql/* ]]; then
    echo "Using Cloud SQL proxy connection..."
    # For Cloud SQL proxy, we wait for the socket file to exist
    echo "Waiting for Cloud SQL proxy socket at $DB_HOST..."
    while [ ! -S "$DB_HOST/.s.PGSQL.5432" ]; do
        echo "Waiting for Cloud SQL proxy socket..."
        sleep 1
    done
    echo "Cloud SQL proxy socket is ready"
    
    # Test connection with psql
    echo "Testing database connection with psql..."
    export PGPASSWORD=$DB_PASSWORD
    psql -h $DB_HOST -p $DB_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT 'Connected successfully to database $POSTGRES_DB as user $POSTGRES_USER'" || echo "Could not connect with psql"
else
    # For regular TCP connections (development)
    echo "Using TCP connection to database..."
    echo "Waiting for database at host $DB_HOST..."
    while ! nc -z $DB_HOST $DB_PORT; do
        echo "Waiting..."
        sleep 0.5
    done
    echo "Database started"
    
    # Test connection with psql
    echo "Testing database connection with psql..."
    export PGPASSWORD=$DB_PASSWORD
    psql -h $DB_HOST -p $DB_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT 'Connected successfully to database $POSTGRES_DB as user $POSTGRES_USER'" || echo "Could not connect with psql"
fi

echo "===== END DIAGNOSTICS ====="

# Create superuser if needed (non-blocking)
# Optional: remove if you handle superuser creation differently
echo "Checking/creating superuser..."
DJANGO_SUPERUSER_PASSWORD=${DJANGO_SUPERUSER_PASSWORD:-admin123} \
DJANGO_SUPERUSER_USERNAME=${DJANGO_SUPERUSER_USERNAME:-admin} \
DJANGO_SUPERUSER_EMAIL=${DJANGO_SUPERUSER_EMAIL:-admin@example.com} \
python manage.py createsuperuser --noinput || echo "Superuser already exists or creation failed."

# Apply migrations (common for both environments)
echo "Applying database migrations..."
python manage.py makemigrations users finance
python manage.py migrate

# Environment-specific execution
if [ "$ENVIRONMENT" = "development" ]; then
  echo "Starting in DEVELOPMENT mode..."
  # Start the Django development server
  python manage.py runserver 0.0.0.0:8000
else
  echo "Starting in PRODUCTION mode..."
  # Collect static files
  echo "Collecting static files..."
  python manage.py collectstatic --noinput
  
  # Start Gunicorn server
  echo "Starting Gunicorn server on port $PORT..."
  # Comments moved to separate lines or removed
  # Adjust worker count based on Cloud Run instance size (e.g., 2-4 for basic instances)
  # Adjust threads based on workload (e.g., 2-4)
  gunicorn samaanai.wsgi:application --bind 0.0.0.0:8080
fi