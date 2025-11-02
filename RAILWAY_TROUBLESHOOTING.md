# Railway Healthcheck Troubleshooting Guide

## Current Issue: Healthcheck Failing at `/`

The healthcheck is trying to reach `/` but getting "service unavailable". This means either:
1. The server isn't starting
2. The server is starting but not responding
3. Wrong healthcheck path configured

## Step 1: Check Which Service is Failing

### If this is your BACKEND service:
- **Healthcheck Path should be:** `/api/health` (NOT `/`)
- Go to Settings → Change Healthcheck Path to `/api/health`

### If this is your FRONTEND service:
- **Healthcheck Path should be:** `/`
- But the frontend needs to build first (check build logs)

## Step 2: Check Deployment Logs

1. Go to your Railway project
2. Click on the failing service
3. Go to **"Deployments"** tab
4. Click on the latest deployment
5. Click **"View Logs"**

Look for these issues:

### Issue A: Build Failed
```
Error: Cannot find module...
npm ERR! code ELIFECYCLE
```
**Solution:** Check if all dependencies are in `package.json`

### Issue B: Server Not Starting
```
Error: listen EADDRINUSE: address already in use
```
**Solution:** Ensure `PORT` environment variable is set

### Issue C: Database Connection Failed
```
MongooseError: connect ECONNREFUSED
```
**Solution:** Check `MONGODB_URI` environment variable

### Issue D: Module Not Found
```
Error: Cannot find module 'express'
```
**Solution:** Run `npm ci` in build command

## Step 3: Fix Common Issues

### For BACKEND Service:

**Settings:**
- Root Directory: `/backend`
- Build Command: (leave empty OR `cd backend && npm ci`)
- Start Command: `cd backend && npm start` OR `npm start` (if root is `/backend`)
- Healthcheck Path: `/api/health` ⚠️ **IMPORTANT**
- Healthcheck Timeout: `300`

**Environment Variables:**
```env
MONGODB_URI=your_mongodb_connection_string
PORT=3001
NODE_ENV=production
```

**Test if backend is running:**
After deployment, manually test:
```
curl https://your-backend.railway.app/api/health
```

### For FRONTEND Service:

**Settings:**
- Root Directory: `/frontend`
- Build Command: `cd frontend && npm install && npm run build`
- Start Command: `cd frontend && npm start` OR `npm start` (if root is `/frontend`)
- Healthcheck Path: `/`
- Healthcheck Timeout: `300`

**Environment Variables:**
```env
PORT=5173
NODE_ENV=production
VITE_BACKEND_URL=https://your-backend.railway.app
```

**Check if build succeeded:**
Look for this in logs:
```
✓ built in Xs
dist/index.html created
```

## Step 4: Verify Server is Listening

Check logs for these messages:

### Backend should show:
```
🚀 Server running on HTTP port 3001
✅ Socket handlers initialized
```

### Frontend should show:
```
Server is running on port 5173
```

If you don't see these, the server isn't starting.

## Step 5: Common Fixes

### Fix 1: Wrong Root Directory
**Symptom:** Build can't find `package.json`

**Solution:**
- Backend: Root Directory = `/backend`
- Frontend: Root Directory = `/frontend`

### Fix 2: Build Command Missing
**Symptom:** Frontend not building, no `dist` folder

**Solution:**
Add Build Command: `cd frontend && npm install && npm run build`

### Fix 3: Start Command Wrong
**Symptom:** Server not starting

**Solution:**
- If Root Directory is `/backend`: Start Command = `npm start`
- If Root Directory is `.`: Start Command = `cd backend && npm start`

### Fix 4: Port Not Set
**Symptom:** Server crashes or can't bind to port

**Solution:**
Add environment variable: `PORT=3001` (backend) or `PORT=5173` (frontend)

### Fix 5: Missing Environment Variables
**Symptom:** Server starts but crashes immediately

**Solution:**
Check if required env vars are set:
- Backend: `MONGODB_URI`, `PORT`, `NODE_ENV`
- Frontend: `PORT`, `NODE_ENV`, `VITE_BACKEND_URL`

## Step 6: Debugging Steps

1. **Check Build Logs:**
   - Did `npm install` succeed?
   - Did `npm run build` succeed (for frontend)?
   - Any errors or warnings?

2. **Check Runtime Logs:**
   - Is the server starting?
   - Any error messages?
   - Is it listening on the correct port?

3. **Test Manually:**
   - Get your Railway domain
   - Test healthcheck endpoint directly:
     - Backend: `curl https://your-backend.railway.app/api/health`
     - Frontend: `curl https://your-frontend.railway.app/`

4. **Check Port Binding:**
   - Ensure your code uses `process.env.PORT` (Railway provides this)
   - Don't hardcode port numbers

## Quick Fix Checklist

- [ ] Root Directory is correct (`/backend` or `/frontend`)
- [ ] Build Command includes `npm install` and `npm run build` (frontend)
- [ ] Start Command is correct (`npm start`)
- [ ] Healthcheck Path is correct (`/api/health` for backend, `/` for frontend)
- [ ] `PORT` environment variable is set
- [ ] `MONGODB_URI` is set (backend only)
- [ ] `NODE_ENV=production` is set
- [ ] Build completed successfully (check logs)
- [ ] Server started successfully (check logs)

## Still Not Working?

1. **Check Railway Status:** https://status.railway.app
2. **Review Logs:** Look for specific error messages
3. **Test Locally:** Run `npm start` locally to verify it works
4. **Check Railway Docs:** https://docs.railway.app

## Example Working Configuration

### Backend Service:
```
Root Directory: /backend
Build Command: (empty - auto-detected)
Start Command: npm start
Healthcheck Path: /api/health
Port: (auto-assigned, use PORT env var)
```

### Frontend Service:
```
Root Directory: /frontend
Build Command: npm install && npm run build
Start Command: npm start
Healthcheck Path: /
Port: (auto-assigned, use PORT env var)
```

