#!/bin/sh
# Railway startup script for Chef's Kiss backend

# Set Python path to include current directory
export PYTHONPATH="${PYTHONPATH}:."

# Start uvicorn with backend module
exec uvicorn backend.app:app --host 0.0.0.0 --port ${PORT:-8080}
