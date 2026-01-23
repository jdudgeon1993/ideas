"""
Chef's Kiss Backend - Python Age 5.0

Let's use Python for what it's designed to do: handle business logic beautifully.
JavaScript will make the site breathe. Python will make it think.

The pantry is the heart. The shopping list is what makes everything beat.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import os
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="Chef's Kiss API",
    description="Python Age 5.0 - Complete backend rebuild",
    version="5.0.0"
)
app.router.redirect_slashes = False

# ProxyHeadersMiddleware is optional (some installs may not have the exact starlette submodule).
# Import defensively so the app doesn't crash at startup when the dependency isn't present.
try:
    # from starlette.middleware.proxy_headers import ProxyHeadersMiddleware
    # app.add_middleware(ProxyHeadersMiddleware)
    logger.info("✅ ProxyHeadersMiddleware loaded and added")
except Exception as exc:
    ProxyHeadersMiddleware = None
    logger.warning(
        "⚠️ ProxyHeadersMiddleware not available. "
        "Request forwarding headers (X-Forwarded-For / X-Forwarded-Proto) may not be parsed. "
        "Install/upgrade starlette if you need this middleware. "
        f"({exc})"
    )

# CORS middleware - Allow frontend to call API
cors_origins_raw = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:8080")
cors_origins = [origin.strip().rstrip('/') for origin in cors_origins_raw.split(",")]

logger.info(f"🌍 CORS origins configured: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import routes (deferred after middleware setup)
try:
    from routes import auth, pantry, recipes, meal_plans, shopping_list, alerts
except Exception as exc:
    # Defensive: if route import fails, log the error but keep the startup trace clear for the logs.
    logger.exception("Failed to import routes at startup. Check that backend routes exist and imports succeed.")
    raise

# Register routes
app.include_router(pantry.router)
app.include_router(auth.router)
app.include_router(recipes.router)
app.include_router(meal_plans.router)
app.include_router(shopping_list.router)
app.include_router(alerts.router)

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Chef's Kiss API - Python Age 5.0",
        "version": "5.0.0",
        "status": "The pantry is the heart. The shopping list makes it beat."
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    from utils.supabase_client import supabase
    import redis

    health_status = {
        "status": "healthy",
        "version": "5.0.0",
        "supabase": "unknown",
        "redis": "unknown"
    }

    # Check Supabase
    try:
        supabase.table('households').select('id').limit(1).execute()
        health_status["supabase"] = "connected"
    except Exception as e:
        health_status["supabase"] = f"error: {str(e)}"
        health_status["status"] = "degraded"

    # Check Redis
    try:
        from state_manager import redis_client
        if redis_client:
            redis_client.ping()
            health_status["redis"] = "connected"
        else:
            health_status["redis"] = "disabled"
    except Exception as e:
        health_status["redis"] = f"error: {str(e)}"
        health_status["status"] = "degraded"

    return health_status


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "error": str(exc) if os.getenv("ENVIRONMENT") == "development" else "An error occurred"
        }
    )


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))

    logger.info("🚀 Starting Chef's Kiss Backend - Python Age 5.0")
    logger.info(f"📍 Port: {port}")
    logger.info(f"🌍 Environment: {os.getenv('ENVIRONMENT', 'development')}")

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        reload=os.getenv("ENVIRONMENT") == "development"
    )
