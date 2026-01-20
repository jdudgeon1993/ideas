#!/bin/sh
# Startup script for Railway deployment

# Use Railway's PORT environment variable, or default to 8000
PORT=${PORT:-8000}

echo "Starting uvicorn on port $PORT..."
exec uvicorn app:app --host 0.0.0.0 --port $PORT
