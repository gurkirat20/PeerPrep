import { io } from '../server.js';
import MatchmakingQueue from '../models/MatchmakingQueue.js';
import User from '../models/User.js';
import InterviewSession from '../models/InterviewSession.js';
import { findBestMatch, getMatchmakingInsights } from '../utils/matchmaking.js';

// Store active matchmaking sessions
const activeQueues = new Map(); // userId -> queue data
const pendingMatches = new Map(); // matchId -> match data

// Legacy matchmaking algorithm (kept for fallback)
const findMatch = async (userQueue) => {
  try {
    const { user, preferences } = userQueue;
    
    const oppositeRole = preferences.role === 'interviewer' ? 'interviewee' : 'interviewer';
    const skillLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
    const currentLevelIndex = skillLevels.indexOf(preferences.skillLevel);
    const compatibleLevels = [
      skillLevels[Math.max(0, currentLevelIndex - 1)],
      preferences.skillLevel,
      skillLevels[Math.min(skillLevels.length - 1, currentLevelIndex + 1)]
    ];

    const potentialMatches = await MatchmakingQueue.find({
      userId: { $ne: user },
      'preferences.role': oppositeRole,
      'preferences.skillLevel': { $in: compatibleLevels },
      'preferences.interviewType': preferences.interviewType,
      'preferences.duration': { $gte: preferences.duration - 15, $lte: preferences.duration + 15 },
      status: 'waiting'
    }).populate('userId', 'name email skillLevel');

    if (potentialMatches.length > 0) {
      const bestMatch = potentialMatches.find(match => 
        match.preferences.skillLevel === preferences.skillLevel
      ) || potentialMatches[0];

      return bestMatch;
    }

    return null;
  } catch (error) {
    console.error('Error finding match:', error);
    return null;
  }
};

// Create interview session
const createInterviewSession = async (user1, user2, preferences) => {
  try {
    const session = new InterviewSession({
      participants: [user1.user, user2.user],
      type: 'peer',
      status: 'pending',
      details: {
        interviewType: preferences.interviewType,
        duration: preferences.duration,
        skillLevel: preferences.skillLevel
      }
    });

    await session.save();
    return session;
  } catch (error) {
    console.error('Error creating interview session:', error);
    return null;
  }
};

// Socket.IO connection handling
export const setupMatchmaking = () => {
  io.on('connection', (socket) => {
    console.log('🔌 User connected:', socket.id);

    // Join queue
    socket.on('joinQueue', async (preferences) => {
      try {
        const userId = socket.userId;
        if (!userId) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        // Upsert queue entry to avoid duplicate key errors
        const queueEntry = await MatchmakingQueue.findOneAndUpdate(
          { userId: userId },
          { 
            $set: {
              preferences,
              status: 'waiting',
              joinedAt: new Date(),
              socketId: socket.id,
              lastPing: new Date()
            }
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        
        // Store in active queues
        activeQueues.set(userId, {
          socketId: socket.id,
          user: userId,
          preferences,
          queueEntry
        });

        // Compute queue position and ETA
        const position = await MatchmakingQueue.countDocuments({ 
          status: 'waiting', 
          joinedAt: { $lte: queueEntry.joinedAt }
        });
        const totalInQueue = await MatchmakingQueue.countDocuments({ status: 'waiting' });
        const estimatedWaitTime = Math.max(0, position - 1) * 2; // simple 2-min per position estimate

        socket.emit('queueJoined', {
          position,
          estimatedWaitTime,
          totalInQueue,
          oppositeRole: preferences.role === 'interviewer' ? 'interviewee' : 'interviewer'
        });

        // Try to find a match immediately using enhanced algorithm
        const matchResult = await findBestMatch(activeQueues.get(userId));
        if (matchResult) {
          await handleMatchFound(userId, matchResult.match.userId.toString(), matchResult);
        }

      } catch (error) {
        console.error('Error joining queue:', error);
        socket.emit('error', { message: 'Failed to join queue' });
      }
    });

    // Leave queue
    socket.on('leaveQueue', async () => {
      try {
        const userId = socket.userId;
        if (!userId) return;

        // Remove from database
        await MatchmakingQueue.findOneAndDelete({ userId: userId });
        
        // Remove from active queues
        if (activeQueues.has(userId)) {
          activeQueues.delete(userId);
        }

        socket.emit('queueLeft');
      } catch (error) {
        console.error('Error leaving queue:', error);
      }
    });

    // Accept match
    socket.on('acceptMatch', async (data) => {
      try {
        const userId = socket.userId;
        const { matchId } = data;

        if (!pendingMatches.has(matchId)) {
          socket.emit('error', { message: 'Match not found' });
          return;
        }

        const match = pendingMatches.get(matchId);
        
        // Check if both users accepted
        if (match.acceptedBy.includes(userId)) {
          socket.emit('error', { message: 'Already accepted this match' });
          return;
        }

        match.acceptedBy.push(userId);
        match.acceptedAt[userId] = new Date();

        if (match.acceptedBy.length === 2) {
          // Both users accepted, create interview session
          const session = await createInterviewSession(match.user1, match.user2, match.preferences);
          
          if (session) {
            // Notify both users
          const user1Socket = io.sockets.sockets.get(match.user1.socketId);
          const user2Socket = io.sockets.sockets.get(match.user2.socketId);

            if (user1Socket) {
              user1Socket.emit('interviewStarted', {
                sessionId: session.sessionId,
                partner: match.user2.user,
                role: match.user1.preferences.role
              });
            }

            if (user2Socket) {
              user2Socket.emit('interviewStarted', {
                sessionId: session.sessionId,
                partner: match.user1.user,
                role: match.user2.preferences.role
              });
            }

            // Clean up
            pendingMatches.delete(matchId);
            activeQueues.delete(match.user1.user.toString());
            activeQueues.delete(match.user2.user.toString());
          }
        } else {
          // Store updated match
          pendingMatches.set(matchId, match);
          
          // Notify the other user
          const otherUserId = match.user1.user.toString() === userId ? 
            match.user2.user.toString() : match.user1.user.toString();
          
          const otherUserQueue = activeQueues.get(otherUserId);
          if (otherUserQueue) {
            const otherSocket = io.sockets.sockets.get(otherUserQueue.socketId);
            if (otherSocket) {
              otherSocket.emit('matchAccepted', { matchId });
            }
          }
        }

      } catch (error) {
        console.error('Error accepting match:', error);
        socket.emit('error', { message: 'Failed to accept match' });
      }
    });

    // Reject match
    socket.on('rejectMatch', async (data) => {
      try {
        const userId = socket.userId;
        const { matchId } = data;

        if (!pendingMatches.has(matchId)) {
          socket.emit('error', { message: 'Match not found' });
          return;
        }

        const match = pendingMatches.get(matchId);
        
        // Notify the other user
        const otherUserId = match.user1.user.toString() === userId ? 
          match.user2.user.toString() : match.user1.user.toString();
        
        const otherUserQueue = activeQueues.get(otherUserId);
        if (otherUserQueue) {
          const otherSocket = io.sockets.sockets.get(otherUserQueue.socketId);
          if (otherSocket) {
            otherSocket.emit('matchCancelled', { reason: 'Partner rejected the match' });
          }
        }

        // Clean up
        pendingMatches.delete(matchId);
        
        // Put both users back in queue
        if (activeQueues.has(userId)) {
          const userQueue = activeQueues.get(userId);
          const match = await findMatch(userQueue);
          if (match) {
            await handleMatchFound(userId, match.userId.toString());
          }
        }

        if (activeQueues.has(otherUserId)) {
          const otherUserQueue = activeQueues.get(otherUserId);
          const match = await findMatch(otherUserQueue);
          if (match) {
            await handleMatchFound(otherUserId, match.userId.toString());
          }
        }

      } catch (error) {
        console.error('Error rejecting match:', error);
      }
    });

    // Handle match found with enhanced compatibility data
    const handleMatchFound = async (userId1, userId2, matchResult = null) => {
      try {
        const user1Queue = activeQueues.get(userId1);
        const user2Queue = activeQueues.get(userId2);

        if (!user1Queue || !user2Queue) return;

        // Create match with compatibility data
        const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const match = {
          matchId,
          user1: user1Queue,
          user2: user2Queue,
          preferences: user1Queue.preferences,
          createdAt: new Date(),
          acceptedBy: [],
          acceptedAt: {},
          compatibilityScore: matchResult?.compatibilityScore || 0,
          scoreBreakdown: matchResult?.scoreBreakdown || {}
        };

        pendingMatches.set(matchId, match);

        // Notify both users with enhanced match data
        const user1Socket = io.sockets.sockets.get(user1Queue.socketId);
        const user2Socket = io.sockets.sockets.get(user2Queue.socketId);

        if (user1Socket) {
          user1Socket.emit('matchFound', {
            matchId,
            opponentRole: user2Queue.preferences.role,
            interviewType: user1Queue.preferences.interviewType,
            duration: user1Queue.preferences.duration,
            skillLevel: user1Queue.preferences.skillLevel,
            partner: user2Queue.user,
            compatibilityScore: matchResult?.compatibilityScore || 0,
            scoreBreakdown: matchResult?.scoreBreakdown || {},
            matchReasons: generateMatchReasons(matchResult?.scoreBreakdown || {})
          });
        }

        if (user2Socket) {
          user2Socket.emit('matchFound', {
            matchId,
            opponentRole: user1Queue.preferences.role,
            interviewType: user2Queue.preferences.interviewType,
            duration: user2Queue.preferences.duration,
            skillLevel: user2Queue.preferences.skillLevel,
            partner: user1Queue.user,
            compatibilityScore: matchResult?.compatibilityScore || 0,
            scoreBreakdown: matchResult?.scoreBreakdown || {},
            matchReasons: generateMatchReasons(matchResult?.scoreBreakdown || {})
          });
        }

        // Remove from active queues temporarily
        activeQueues.delete(userId1);
        activeQueues.delete(userId2);

      } catch (error) {
        console.error('Error handling match found:', error);
      }
    };

    // Generate human-readable match reasons
    const generateMatchReasons = (scoreBreakdown) => {
      const reasons = [];
      
      if (scoreBreakdown.skillIntersection > 30) {
        reasons.push('Strong skill overlap');
      }
      
      if (scoreBreakdown.topicIntersection > 20) {
        reasons.push('Shared interview topics');
      }
      
      if (scoreBreakdown.experienceCompatibility > 20) {
        reasons.push('Compatible experience levels');
      }
      
      if (scoreBreakdown.domainIntersection > 15) {
        reasons.push('Similar domain expertise');
      }
      
      if (scoreBreakdown.interviewTypeMatch > 0) {
        reasons.push('Same interview type preference');
      }
      
      return reasons.length > 0 ? reasons : ['Good overall compatibility'];
    };

    // Disconnect
    socket.on('disconnect', async () => {
      try {
        const userId = socket.userId;
        if (!userId) return;

        // Remove from queue
        await MatchmakingQueue.findOneAndDelete({ userId: userId });
        activeQueues.delete(userId);

        console.log('🔌 User disconnected:', socket.id);
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });
  });
};
