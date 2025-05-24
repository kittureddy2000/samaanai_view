#!/bin/sh

# Set default port if not provided
export PORT=${PORT:-8080}

# Substitute the PORT variable in nginx config and start nginx
envsubst '${PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Start nginx
nginx -g "daemon off;" 