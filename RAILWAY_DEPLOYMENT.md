# Railway Deployment Guide for PeerPrep

This guide will help you deploy both the backend and frontend services on Railway.

## Prerequisites

1. A Railway account (sign up at [railway.app](https://railway.app))
2. MongoDB database (MongoDB Atlas recommended)
3. Environment variables ready

## Step 1: Create Two Separate Services

You need to create **TWO separate services** in Railway:

### Service 1: Backend API

1. Click **"New Project"** → **"Empty Project"**
2. Click **"New Service"** → **"GitHub Repo"**
3. Connect your repository
4. Click on the service → **Settings** → Configure:

   **Root Directory:** `/backend`
   
   **Build Command:** Leave empty (Railway auto-detects)
   
   **Start Command:** `npm start`
   
   **Healthcheck Path:** `/api/health`
   
   **Healthcheck Timeout:** `300`

### Service 2: Frontend

1. In the same project, click **"New Service"** → **"GitHub Repo"**
2. Select the same repository
3. Click on the service → **Settings** → Configure:

   **Root Directory:** `/frontend`
   
   **Build Command:** `npm install && npm run build`
   
   **Start Command:** `npm start`
   
   **Healthcheck Path:** `/`
   
   **Healthcheck Timeout:** `300`

## Step 2: Configure Environment Variables

### Backend Environment Variables

Go to **Backend Service** → **Variables** tab:

```env
# Database
MONGODB_URI=your_mongodb_connection_string

# Server
PORT=3001
NODE_ENV=production

# Frontend URLs (use Railway's public domain)
FRONTEND_URL=https://your-frontend-service.railway.app

# JWT Secret
JWT_SECRET=your_jwt_secret_key

# AI Service Keys (if using)
OPENAI_API_KEY=your_openai_key
GOOGLE_AI_API_KEY=your_google_ai_key

# TURN Server (for WebRTC, optional)
TURN_URL=your_turn_server_url
TURN_USERNAME=your_turn_username
TURN_CREDENTIAL=your_turn_credential
```

### Frontend Environment Variables

Go to **Frontend Service** → **Variables** tab:

```env
# Server Port
PORT=5173
NODE_ENV=production

# Backend API URL (use Railway's public domain - MUST start with https://)
VITE_BACKEND_URL=https://your-backend-service.railway.app

# TURN Server (for WebRTC, optional but recommended for production)
VITE_TURN_URL=your_turn_server_url
VITE_TURN_USERNAME=your_turn_username
VITE_TURN_CREDENTIAL=your_turn_credential
```

**Important:** The frontend uses `VITE_BACKEND_URL` for both API calls and Socket.IO connections. Make sure this points to your backend Railway domain.

## Step 3: Get Public Domains

1. Go to each service → **Settings** → **Networking**
2. Click **"Generate Domain"** for both services
3. Copy the generated domains (e.g., `backend-production.up.railway.app`)
4. Update your environment variables with these domains:
   - In **Backend**: Set `FRONTEND_URL` to your frontend domain
   - In **Frontend**: Set `VITE_API_URL` and `VITE_SOCKET_URL` to your backend domain

## Step 4: Deploy

1. **Push your code** to the connected GitHub branch
2. Railway will automatically build and deploy both services
3. Check the **Deployments** tab to see build logs
4. Once deployed, both services should show as "Healthy"

## Step 5: Verify Deployment

1. **Backend Health Check:**
   ```
   https://your-backend-service.railway.app/api/health
   ```
   Should return: `{"status":"OK",...}`

2. **Frontend:**
   ```
   https://your-frontend-service.railway.app
   ```
   Should show your React app

## Troubleshooting

### Healthcheck Failing

1. **Backend healthcheck fails:**
   - Check if MongoDB connection is working
   - Verify `PORT` environment variable is set
   - Check deployment logs for errors

2. **Frontend healthcheck fails:**
   - Ensure `npm run build` completed successfully
   - Check if `dist` folder exists after build
   - Verify `PORT` is set to 5173

### Build Failures

- Check **Deployments** → **View Logs** for specific errors
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

### Connection Issues

- Make sure frontend can reach backend:
  - Backend `FRONTEND_URL` includes frontend domain
  - Frontend `VITE_API_URL` points to backend domain
  - CORS is properly configured in backend

### WebRTC Not Working

- Ensure TURN server credentials are set (if using)
- Check browser console for WebRTC errors
- Verify Socket.IO connection is established

## Railway Configuration Summary

### Backend Service
- **Root Directory:** `/backend`
- **Build Command:** (auto-detected)
- **Start Command:** `npm start`
- **Healthcheck:** `/api/health`
- **Port:** Railway assigns automatically (use `PORT` env var)

### Frontend Service
- **Root Directory:** `/frontend`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Healthcheck:** `/`
- **Port:** Railway assigns automatically (use `PORT` env var)

## Additional Notes

- Railway automatically provides `PORT` environment variable - your code should use `process.env.PORT`
- Use Railway's private networking for internal service communication if needed
- Set up custom domains in Railway settings if you have your own domain
- Monitor usage in Railway dashboard to avoid exceeding free tier limits

