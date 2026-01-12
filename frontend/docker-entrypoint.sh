#!/bin/sh
# Docker entrypoint script for FlowForge frontend
# Replaces the default port 80 with Railway's dynamic PORT

# Default to port 80 if PORT is not set
PORT=${PORT:-80}

# Replace port 80 with the actual PORT in nginx config
sed -i "s/listen 80;/listen ${PORT};/g" /etc/nginx/conf.d/default.conf

# Start nginx
exec nginx -g 'daemon off;'
