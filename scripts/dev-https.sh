#!/bin/bash

# Convenience script for HTTPS development

set -e

echo "🔧 Starting HTTPS Development Environment..."

# Check if SSL certificates exist
if [ ! -f "ssl/localhost.crt" ] || [ ! -f "ssl/localhost.key" ]; then
    echo "⚠️  SSL certificates not found. Generating them now..."
    ./scripts/generate-ssl-certs.sh
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down 2>/dev/null || true

# Start with HTTPS configuration
echo "🚀 Starting services with HTTPS..."
docker-compose -f docker-compose.yml -f docker-compose.https.yml up --build

echo "✅ HTTPS Development environment started!"
echo "🌐 Access your app at: https://localhost"
echo "🔧 Backend API at: https://localhost/api"
echo "🛠️  Django Admin at: https://localhost/admin" 