import MatchmakingQueue from '../models/MatchmakingQueue.js';
import InterviewSession from '../models/InterviewSession.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { v4 as uuidv4 } from 'uuid';

class MatchmakingService {
  constructor(io) {
    this.io = io;
    this.activeMatches = new Map(); // Track active matching attempts
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.id}`);

      // Join matchmaking queue
      socket.on('joinMatchmaking', async (data) => {
        try {
          await this.joinMatchmaking(socket, data);
        } catch (error) {
          socket.emit('matchmakingError', { message: error.message });
        }
      });

      // Leave matchmaking queue
      socket.on('leaveMatchmaking', async () => {
        try {
          await this.leaveMatchmaking(socket);
        } catch (error) {
          socket.emit('matchmakingError', { message: error.message });
        }
      });

      // Accept match
      socket.on('acceptMatch', async (data) => {
        try {
          await this.acceptMatch(socket, data);
        } catch (error) {
          socket.emit('matchmakingError', { message: error.message });
        }
      });

      // Reject match
      socket.on('rejectMatch', async (data) => {
        try {
          await this.rejectMatch(socket, data);
        } catch (error) {
          socket.emit('matchmakingError', { message: error.message });
        }
      });

      // Ping for connection health
      socket.on('ping', async () => {
        await this.updatePing(socket);
      });

      // Disconnect handler
      socket.on('disconnect', async () => {
        try {
          await this.handleDisconnect(socket);
        } catch (error) {
          console.error('Error handling disconnect:', error);
        }
      });
    });
  }

  async joinMatchmaking(socket, data) {
    const { userId, preferences, userProfile } = data;

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Remove any existing queue entry
    await MatchmakingQueue.findOneAndDelete({ userId });

    // Create new queue entry
    const queueEntry = await MatchmakingQueue.create({
      userId,
      preferences,
      userProfile,
      socketId: socket.id,
      status: 'waiting'
    });

    // Join socket room for user
    socket.join(`user_${userId}`);
    socket.userId = userId;

    // Start matching process
    await this.findMatches(queueEntry);

    socket.emit('matchmakingJoined', {
      success: true,
      message: 'Joined matchmaking queue',
      queueId: queueEntry._id
    });

    console.log(`User ${userId} joined matchmaking queue`);
  }

  async leaveMatchmaking(socket) {
    if (!socket.userId) return;

    const queueEntry = await MatchmakingQueue.findOneAndDelete({ userId: socket.userId });
    
    if (queueEntry) {
      socket.leave(`user_${socket.userId}`);
      socket.emit('matchmakingLeft', { success: true, message: 'Left matchmaking queue' });
      console.log(`User ${socket.userId} left matchmaking queue`);
    }
  }

  async findMatches(queueEntry) {
    try {
      const compatibleMatches = await MatchmakingQueue.findCompatibleMatches(
        queueEntry.userId,
        queueEntry.preferences
      );

      if (compatibleMatches.length === 0) {
        // No matches found, wait and try again
        setTimeout(() => this.findMatches(queueEntry), 5000);
        return;
      }

      // Find best match
      let bestMatch = null;
      let bestScore = 0;

      for (const match of compatibleMatches) {
        const compatibilityScore = MatchmakingQueue.calculateCompatibility(queueEntry, match);
        
        if (compatibilityScore > bestScore) {
          bestScore = compatibilityScore;
          bestMatch = match;
        }
      }

      if (bestMatch && bestScore >= 60) { // Minimum compatibility threshold
        await this.proposeMatch(queueEntry, bestMatch, bestScore);
      } else {
        // No suitable match found, wait and try again
        setTimeout(() => this.findMatches(queueEntry), 10000);
      }
    } catch (error) {
      console.error('Error finding matches:', error);
    }
  }

  async proposeMatch(queueEntry1, queueEntry2, compatibilityScore) {
    try {
      // Create session ID
      const sessionId = uuidv4();

      // Create interview session
      const interviewSession = await InterviewSession.create({
        sessionId,
        interviewerId: queueEntry1.preferences.role === 'interviewer' ? queueEntry1.userId : queueEntry2.userId,
        intervieweeId: queueEntry1.preferences.role === 'interviewee' ? queueEntry1.userId : queueEntry2.userId,
        type: 'peer',
        interviewType: queueEntry1.preferences.interviewType,
        duration: queueEntry1.preferences.duration,
        difficulty: queueEntry1.preferences.difficulty,
        topics: queueEntry1.preferences.topics,
        status: 'scheduled',
        matchmakingData: {
          matchedAt: new Date(),
          preferences: queueEntry1.preferences,
          compatibilityScore
        }
      });

      // Update queue entries
      await queueEntry1.matchWith(queueEntry2.userId, interviewSession._id, compatibilityScore);
      await queueEntry2.matchWith(queueEntry1.userId, interviewSession._id, compatibilityScore);

      // Get user details for notifications
      const user1 = await User.findById(queueEntry1.userId).select('name');
      const user2 = await User.findById(queueEntry2.userId).select('name');

      // Emit match found to both users
      this.io.to(`user_${queueEntry1.userId}`).emit('matchFound', {
        success: true,
        match: {
          userId: queueEntry2.userId,
          name: user2.name,
          compatibilityScore,
          sessionId: interviewSession.sessionId,
          interviewType: queueEntry1.preferences.interviewType,
          duration: queueEntry1.preferences.duration,
          difficulty: queueEntry1.preferences.difficulty
        }
      });

      this.io.to(`user_${queueEntry2.userId}`).emit('matchFound', {
        success: true,
        match: {
          userId: queueEntry1.userId,
          name: user1.name,
          compatibilityScore,
          sessionId: interviewSession.sessionId,
          interviewType: queueEntry1.preferences.interviewType,
          duration: queueEntry1.preferences.duration,
          difficulty: queueEntry1.preferences.difficulty
        }
      });

      // Create notifications
      await Notification.createMatchFoundNotification(
        queueEntry1.userId,
        queueEntry2.userId,
        user2.name,
        interviewSession.sessionId
      );

      await Notification.createMatchFoundNotification(
        queueEntry2.userId,
        queueEntry1.userId,
        user1.name,
        interviewSession.sessionId
      );

      console.log(`Match found: ${user1.name} <-> ${user2.name} (Score: ${compatibilityScore})`);

    } catch (error) {
      console.error('Error proposing match:', error);
    }
  }

  async acceptMatch(socket, data) {
    const { sessionId, userId } = data;

    // Find the interview session
    const session = await InterviewSession.findOne({ sessionId });
    if (!session) {
      throw new Error('Interview session not found');
    }

    // Check if user is part of this session
    if (session.interviewerId.toString() !== userId && session.intervieweeId.toString() !== userId) {
      throw new Error('Unauthorized access to session');
    }

    // Update session status
    session.status = 'in-progress';
    session.startedAt = new Date();
    await session.save();

    // Update queue entries
    await MatchmakingQueue.updateMany(
      { sessionId: session._id },
      { status: 'interviewing' }
    );

    // Notify both users
    const interviewerSocket = this.io.sockets.sockets.get(
      Array.from(this.io.sockets.sockets.values())
        .find(s => s.userId === session.interviewerId.toString())?.id
    );

    const intervieweeSocket = this.io.sockets.sockets.get(
      Array.from(this.io.sockets.sockets.values())
        .find(s => s.userId === session.intervieweeId.toString())?.id
    );

    if (interviewerSocket) {
      interviewerSocket.emit('interviewStarted', {
        success: true,
        sessionId,
        role: 'interviewer'
      });
    }

    if (intervieweeSocket) {
      intervieweeSocket.emit('interviewStarted', {
        success: true,
        sessionId,
        role: 'interviewee'
      });
    }

    console.log(`Interview started: ${sessionId}`);
  }

  async rejectMatch(socket, data) {
    const { sessionId, userId } = data;

    // Find and cancel the session
    const session = await InterviewSession.findOne({ sessionId });
    if (session) {
      session.status = 'cancelled';
      await session.save();
    }

    // Remove queue entries
    await MatchmakingQueue.updateMany(
      { sessionId: session?._id },
      { status: 'cancelled' }
    );

    // Notify the other user
    const otherUserId = session?.interviewerId.toString() === userId 
      ? session.intervieweeId.toString() 
      : session.interviewerId.toString();

    this.io.to(`user_${otherUserId}`).emit('matchRejected', {
      success: true,
      message: 'The other participant declined the match'
    });

    console.log(`Match rejected: ${sessionId}`);
  }

  async updatePing(socket) {
    if (socket.userId) {
      await MatchmakingQueue.findOneAndUpdate(
        { userId: socket.userId },
        { lastPing: new Date() }
      );
    }
  }

  async handleDisconnect(socket) {
    if (socket.userId) {
      // Mark as inactive in queue
      await MatchmakingQueue.findOneAndUpdate(
        { userId: socket.userId },
        { 
          status: 'cancelled',
          socketId: null 
        }
      );

      console.log(`User ${socket.userId} disconnected from matchmaking`);
    }
  }

  // Cleanup inactive users
  async cleanupInactiveUsers() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    await MatchmakingQueue.updateMany(
      { 
        lastPing: { $lt: fiveMinutesAgo },
        status: 'waiting'
      },
      { status: 'cancelled' }
    );
  }

  // Start cleanup interval
  startCleanupInterval() {
    setInterval(() => {
      this.cleanupInactiveUsers();
    }, 60000); // Every minute
  }
}

export default MatchmakingService;
