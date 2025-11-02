# Railway Quick Setup Guide

## Current Issue: Healthcheck Failing

Your healthcheck is failing because you need to configure **TWO separate services** - one for backend and one for frontend.

## Step-by-Step Fix

### 1. Backend Service Configuration

You currently have a service configured with Root Directory `/backend`. Update these settings:

**Settings Tab:**
- ✅ **Root Directory:** `/backend` (keep this)
- ✅ **Build Command:** Leave empty (Railway auto-detects)
- ✅ **Start Command:** `npm start`
- ✅ **Healthcheck Path:** `/api/health` (CHANGE THIS from `/`)
- ✅ **Healthcheck Timeout:** `300`

**Variables Tab:**
Add these environment variables:
```
MONGODB_URI=your_mongodb_connection_string
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-frontend-service.railway.app
JWT_SECRET=your_secret_key
```

### 2. Create Frontend Service

1. In your Railway project, click **"+ New"** → **"GitHub Repo"**
2. Select the same repository
3. Configure settings:

**Settings Tab:**
- **Root Directory:** `/frontend`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Healthcheck Path:** `/`
- **Healthcheck Timeout:** `300`

**Variables Tab:**
Add these environment variables:
```
PORT=5173
NODE_ENV=production
VITE_BACKEND_URL=https://your-backend-service.railway.app
```

### 3. Get Public Domains

1. **Backend Service:**
   - Go to **Settings** → **Networking**
   - Click **"Generate Domain"**
   - Copy the domain (e.g., `backend-production.up.railway.app`)

2. **Frontend Service:**
   - Go to **Settings** → **Networking**
   - Click **"Generate Domain"**
   - Copy the domain (e.g., `frontend-production.up.railway.app`)

### 4. Update Environment Variables

**Backend Variables:**
- Set `FRONTEND_URL` to your frontend Railway domain

**Frontend Variables:**
- Set `VITE_BACKEND_URL` to your backend Railway domain (MUST use https://)

### 5. Redeploy

After updating environment variables, Railway will automatically redeploy. Check the **Deployments** tab to monitor the build.

## Common Issues & Solutions

### ❌ Healthcheck fails with "service unavailable"

**Solution:**
- Verify the healthcheck path is correct:
  - Backend: `/api/health`
  - Frontend: `/`
- Check deployment logs for startup errors
- Ensure PORT environment variable is set correctly

### ❌ Build fails

**Solution:**
- Check **Deployments** → **View Logs** for specific errors
- Verify all dependencies are in `package.json`
- Ensure Node.js version is compatible (Railway uses Node 20 by default)

### ❌ Frontend can't connect to backend

**Solution:**
- Verify `VITE_BACKEND_URL` is set correctly (must start with `https://`)
- Check CORS settings in backend (should allow frontend domain)
- Ensure backend is running and healthy

### ❌ Socket.IO not connecting

**Solution:**
- Verify `VITE_BACKEND_URL` points to backend domain
- Check backend Socket.IO configuration allows frontend origin
- Look for connection errors in browser console

## Verification Checklist

- [ ] Backend service has Root Directory `/backend`
- [ ] Backend healthcheck path is `/api/health`
- [ ] Frontend service created with Root Directory `/frontend`
- [ ] Frontend build command includes `npm run build`
- [ ] Both services have public domains generated
- [ ] Environment variables are set correctly
- [ ] Backend shows "Healthy" status
- [ ] Frontend shows "Healthy" status
- [ ] Frontend can access backend API
- [ ] Socket.IO connection works

## Testing Your Deployment

1. **Test Backend:**
   ```
   curl https://your-backend.railway.app/api/health
   ```
   Should return: `{"status":"OK",...}`

2. **Test Frontend:**
   Open `https://your-frontend.railway.app` in browser
   Should show your React app

3. **Test Socket.IO:**
   Open browser console on frontend
   Should see: `Socket connecting to: https://your-backend.railway.app`

## Need Help?

Check the detailed guide in `RAILWAY_DEPLOYMENT.md` for more information.

