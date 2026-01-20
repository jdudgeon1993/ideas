# 🔗 Connect Frontend to Python Backend

## ✅ Prerequisites

- ✅ Railway deployed successfully
- ✅ Supabase migration complete
- ✅ You have your Railway backend URL

---

## 🚀 Quick Connection Steps (5 minutes)

### **STEP 1: Get Your Railway URL**

1. Go to Railway dashboard
2. Click on your Python service
3. Go to **Settings** → **Domains**
4. Copy the URL (looks like: `https://your-app.up.railway.app`)

### **STEP 2: Update Configuration**

Edit `frontend-new/config.js` and replace the placeholder:

```javascript
// Change this line:
const BACKEND_URL = 'REPLACE_WITH_YOUR_RAILWAY_URL';

// To your actual Railway URL (example):
const BACKEND_URL = 'https://chefs-kiss-production.up.railway.app';
```

### **STEP 3: Copy Files to Root**

Move the new frontend files to the root directory:

```bash
# From your repo root
cp frontend-new/config.js .
cp frontend-new/api.js .
cp frontend-new/shopping-focus-mode.js .
cp frontend-new/shopping-focus-mode.css .
```

### **STEP 4: Update index.html**

Add these lines to `index.html` in the `<head>` section (before closing `</head>`):

```html
<!-- Python Age 5.0 -->
<script src="config.js"></script>
<script src="api.js"></script>
<script src="shopping-focus-mode.js"></script>
<link rel="stylesheet" href="shopping-focus-mode.css">
```

### **STEP 5: Test Locally**

Open `index.html` in your browser and:

1. Open browser console (F12)
2. Check for errors
3. Try to sign in

### **STEP 6: Commit and Push**

```bash
git add .
git commit -m "Connect frontend to Python backend"
git push origin claude/js-to-python-migration-MvYjc
```

### **STEP 7: Deploy Frontend**

If using GitHub Pages:
```bash
git checkout main
git merge claude/js-to-python-migration-MvYjc
git push origin main
```

---

## ✅ Verify Everything Works

### **Test 1: Backend Health**

Visit: `https://your-railway-url.up.railway.app/health`

Should show:
```json
{
  "status": "healthy",
  "supabase": "connected",
  "redis": "connected"
}
```

### **Test 2: Frontend Loads**

Visit your site and check console for:
```
✅ No CORS errors
✅ No 404 errors
✅ API calls go to Railway URL
```

### **Test 3: Sign In**

1. Create new account
2. Should create household automatically
3. No errors in console

### **Test 4: Add Pantry Item**

1. Add an item (e.g., "Eggs")
2. Check shopping list updates automatically ✅
3. Check network tab shows calls to Railway

### **Test 5: Shopping List Focus Mode**

1. Go to shopping list
2. Click "Focus Mode" button
3. Full-screen mode should activate
4. Check off items
5. Add manual item
6. Exit focus mode

---

## 🐛 Troubleshooting

### **Error: CORS Issue**

```
Access to fetch at 'https://your-railway-url...' has been blocked by CORS
```

**Fix:** Add your frontend URL to Railway environment variables:

```
CORS_ORIGINS=https://your-frontend-domain.com,http://localhost:8080
```

### **Error: 401 Unauthorized**

**Fix:** Sign out and sign in again to get a fresh token.

### **Error: Backend not responding**

**Check Railway logs:**
1. Go to Railway → Your service
2. Click "Deployments"
3. View logs for errors

---

## 🎉 You're Done!

Once all tests pass, you're fully on Python Age 5.0!

**The pantry is the heart. The shopping list makes it beat.** ❤️
