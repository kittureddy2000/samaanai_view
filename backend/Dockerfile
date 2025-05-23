# backend/Dockerfile
# Use the official Python image from Docker Hub
FROM python:3.10-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE 1

# Set build-time variables
ARG ENVIRONMENT=production
ENV ENVIRONMENT=${ENVIRONMENT}

# Set the working directory in the container
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev \
    build-essential \
    netcat-openbsd \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements.txt first to leverage Docker cache
COPY requirements.txt /app/

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code into the container
# Ensure this Dockerfile is in the 'backend' directory
# and '.' refers to the 'backend' directory content
COPY . /app/

# Create a non-root user (recommended for security)
RUN adduser --disabled-password --gecos '' appuser
RUN chown -R appuser:appuser /app
USER appuser

# Expose port 8080 (standard for Cloud Run)
EXPOSE 8080
ENV PORT 8080

# Copy the entrypoint script and make it executable
# Assumes entrypoint.sh is in the same directory as Dockerfile (backend/)
COPY --chown=appuser:appuser entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Set the entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]

# CMD is intentionally omitted - entrypoint will exec gunicorn