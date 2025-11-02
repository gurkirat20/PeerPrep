// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
// no fs needed in HTTP mode

// Import database connection
import connectDB from './config/database.js';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import interviewRoutes from './routes/interviews.js';
import matchmakingRoutes from './routes/matchmaking.js';
        import aiInterviewRoutes from './routes/aiInterview.js';
        import dashboardRoutes from './routes/dashboard.js';
import peerAnalysisRoutes from './routes/peerAnalysis.js';
import notificationRoutes from './routes/notifications.js';

// Import services
import MatchmakingService from './services/MatchmakingService.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { authenticateToken } from './middleware/auth.js';

// Import socket handlers
import { setupMatchmaking } from './socket/matchmaking.js';

// Connect to MongoDB
connectDB();

const app = express();
const server = createServer(app);

// When behind a reverse proxy (Render, Railway, etc.), trust proxy so req.ip is correct
if (process.env.NODE_ENV !== 'development') {
  app.set('trust proxy', 1);
}

// Support multiple frontend origins (comma-separated)
const rawOrigins = process.env.FRONTEND_URLS || process.env.FRONTEND_URL || "FRONTEND_URL";
const allowedOrigins = rawOrigins.split(',').map(o => o.trim()).filter(Boolean);
console.log('Allowed Origins:', allowedOrigins);

const io = new Server(server, {
  cors: {
    // origin: allowedOrigins,
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  // Additional options for better WebSocket support on Render.com
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

// Security middleware - configure helmet to allow Socket.IO WebSocket upgrades
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false // Disable CSP for Socket.IO compatibility
}));
app.use(cors({
  // origin: allowedOrigins,
  origin: "*",
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/matchmaking', matchmakingRoutes);
        app.use('/api/ai-interview', aiInterviewRoutes);
        app.use('/api/dashboard', dashboardRoutes);
app.use('/api/peer-analysis', peerAnalysisRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'Connected'
  });
});

// Socket.IO authentication middleware (optional auth)
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      // Allow unauthenticated connections (e.g., public interview room links)
      return next();
    }

    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET);
    const User = (await import('./models/User.js')).default;
    const user = await User.findById(decoded.userId).select('-password');
    if (user) {
      socket.userId = user._id.toString();
      socket.user = user;
    }
    return next();
  } catch (error) {
    // If token is invalid, still allow basic connection but without user context
    return next();
  }
});

// Initialize matchmaking service
const matchmakingService = new MatchmakingService(io);
matchmakingService.startCleanupInterval();

// Setup socket handlers (async to clean up stale entries)
(async () => {
  await setupMatchmaking();
  console.log('✅ Socket handlers initialized');
})();

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Server running on HTTP port ${PORT}`);
  console.log(`📱 Allowed Frontends: ${allowedOrigins.join(', ')}`);
  console.log(`🔓 Running over HTTP for local development`);
});

export { io };
