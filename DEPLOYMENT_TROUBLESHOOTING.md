# Chef's Kiss - Deployment Troubleshooting Guide

## Common Authentication Issues

### Symptom: "Invalid authentication token: The specified alg value is not allowed"

This error occurs when the JWT token uses a different signing algorithm than expected.

**Root Cause:**
- The backend expects tokens signed with HS256
- The token in localStorage might be from an old deployment or misconfigured

**Solutions:**

1. **Clear your browser's localStorage:**
   ```javascript
   // In browser console:
   localStorage.clear();
   location.reload();
   ```

2. **Verify Environment Variables in Railway:**
   - `SUPABASE_JWT_SECRET` must be set to your Supabase project's JWT secret
   - Find it in: Supabase Dashboard → Settings → API → JWT Settings → JWT Secret
   - It should be a long string starting with something like `your-super-secret-jwt-token-with...`

3. **Check that all required environment variables are set:**
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=eyJhbGc...  (service_role key)
   SUPABASE_JWT_SECRET=your-jwt-secret  (JWT secret from API settings)
   CORS_ORIGINS=https://your-frontend-url.com
   ```

### Symptom: Authentication works but API calls return 401

**Root Cause:**
- The `/auth/me` endpoint uses Supabase's API to validate tokens
- Other endpoints use local JWT decoding with the JWT secret
- If these don't match, auth appears to work but data fetching fails

**Solution:**
1. Ensure `SUPABASE_JWT_SECRET` exactly matches your Supabase project's JWT secret
2. Sign out and sign in again to get a fresh token
3. Check Railway logs for JWT validation errors

### Symptom: 404 errors on API endpoints

**Root Cause:**
- Backend might not be deployed or is crashing
- URL mismatch between frontend config and actual backend

**Solutions:**

1. **Check backend is running:**
   - Visit: `https://your-backend.railway.app/health`
   - Should return: `{"status": "healthy", ...}`

2. **Verify `config.js` has correct backend URL:**
   ```javascript
   window.CONFIG = {
     API_BASE: 'https://your-backend.railway.app/api'
   };
   ```

3. **Check Railway logs:**
   - Look for startup errors
   - Ensure all dependencies installed correctly
   - Check for missing environment variables

## Testing Without Authentication

Use the **"Try Demo"** button on the landing page to test the site with sample data without requiring authentication. This helps isolate whether issues are authentication-related or application logic-related.

## Environment Variable Checklist

### Required for Backend (Railway):
- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_SERVICE_KEY` (service_role key)
- ✅ `SUPABASE_JWT_SECRET` (JWT secret)
- ✅ `CORS_ORIGINS` (comma-separated list of allowed origins)
- ⚠️ Optional: `PORT` (Railway sets this automatically)

### Required for Frontend:
- ✅ `config.js` with correct `API_BASE` URL pointing to Railway backend

## Quick Diagnostic Steps

1. **Check backend health:**
   ```
   curl https://your-backend.railway.app/health
   ```

2. **Test auth endpoint:**
   ```
   curl https://your-backend.railway.app/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"email":"test@test.com","password":"testpass123"}'
   ```

3. **Check browser console:**
   - Look for CORS errors
   - Check network tab for failed requests
   - Verify JWT token format in localStorage

4. **Check Railway logs:**
   - Look for Python errors
   - Check for JWT validation failures
   - Verify all environment variables loaded

## Fresh Start Procedure

If all else fails, here's how to start fresh:

1. **Clear frontend state:**
   ```javascript
   localStorage.clear();
   location.reload();
   ```

2. **Verify backend environment variables in Railway:**
   - Go to your Railway project
   - Check all variables are set correctly
   - Redeploy if you made changes

3. **Create a new test account:**
   - Use a new email address
   - Sign up through the UI
   - This ensures you get a fresh token with current configuration

4. **Check Supabase:**
   - Verify your Supabase project is active
   - Check that Auth is enabled
   - Ensure database tables exist (run migrations if needed)

## Getting Help

If issues persist:
1. Check Railway logs for specific error messages
2. Verify Supabase dashboard shows your tables and auth settings
3. Test the backend health endpoint
4. Try the demo mode to isolate authentication issues
5. Check browser console for detailed error messages
