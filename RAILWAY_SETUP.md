# Railway Deployment Setup Guide

## Overview

Your Chef's Kiss backend is deployed at:
**https://chefs-kiss-production.up.railway.app**

## Required Environment Variables

Configure these in Railway Dashboard → Your Service → Variables:

### 1. Supabase Configuration
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
```

Get these from: Supabase Dashboard → Project Settings → API

⚠️ **Important**: Use the `service_role` key, NOT the `anon` key!

### 2. JWT Configuration
```
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=43200
```

Generate a secure JWT secret:
```bash
openssl rand -hex 32
```

### 3. CORS Origins
```
CORS_ORIGINS=https://your-frontend-domain.com,https://another-domain.com
```

**Update this** to include your frontend domain(s). If frontend is also on Railway, add that URL here.

Examples:
- Production: `https://chefs-kiss.netlify.app`
- Railway Frontend: `https://chefs-kiss-frontend.up.railway.app`
- Multiple: `https://domain1.com,https://domain2.com`

### 4. Redis (Automatic)
```
REDIS_URL=redis://...
```

✅ **No action needed** - Railway automatically provides this when you add Redis service.

Just make sure:
1. Redis service is added to your project
2. Redis service is linked to your backend service

### 5. Environment
```
ENVIRONMENT=production
```

Set to `production` for Railway deployment.

## Health Check

Test your deployment:
```
https://chefs-kiss-production.up.railway.app/health
```

Should return:
```json
{
  "status": "healthy",
  "version": "5.0.0",
  "supabase": "connected",
  "redis": "connected"
}
```

## Troubleshooting

### Redis not connecting
- Error: `⚠️ Redis not available - caching disabled`
- Solution: Make sure Redis service is linked to backend service in Railway

### CORS errors from frontend
- Error: `Access-Control-Allow-Origin` error in browser console
- Solution: Add your frontend domain to `CORS_ORIGINS` environment variable

### Supabase connection errors
- Error: `supabase: "error: ..."`
- Solution:
  1. Verify `SUPABASE_URL` is correct
  2. Verify `SUPABASE_SERVICE_KEY` is the service_role key, not anon key
  3. Check Supabase project is active

### Port issues
- Railway automatically sets the `PORT` environment variable
- The app reads it with: `port = int(os.getenv("PORT", 8000))`
- No configuration needed

## Frontend Configuration

Update `frontend-new/config.js`:
```javascript
const BACKEND_URL = 'https://chefs-kiss-production.up.railway.app';
```

✅ **Already configured!**

## Deployment Process

Railway automatically deploys when you push to your main branch:

1. Push code: `git push origin main`
2. Railway detects changes
3. Builds Docker container
4. Deploys with zero downtime
5. Health check at `/health`

## Monitoring

Check logs in Railway Dashboard → Your Service → Deployments → View Logs

Look for:
- ✅ `Redis connected successfully` - Redis working
- ✅ `Started server process` - App started
- ✅ `Uvicorn running on http://0.0.0.0:8080` - Server listening

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- GitHub Issues: [Your repo]/issues
