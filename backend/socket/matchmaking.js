import { io } from '../server.js';
import MatchmakingQueue from '../models/MatchmakingQueue.js';
import User from '../models/User.js';
import InterviewSession from '../models/InterviewSession.js';
import { findBestMatch, getMatchmakingInsights } from '../utils/matchmaking.js';
import { registerWebRTCHandlers, cleanupRoom, cleanupSocketRooms } from './webrtc.js';

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

// Clean up stale queue entries on server startup
const cleanupStaleQueueEntries = async () => {
  try {
    // Remove all queue entries older than 1 hour or from previous server sessions
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const result = await MatchmakingQueue.deleteMany({
      $or: [
        { lastPing: { $lt: oneHourAgo } },
        { status: 'waiting' } // Clear all waiting entries on startup
      ]
    });
    console.log(`🧹 Cleaned up ${result.deletedCount} stale queue entries`);
  } catch (error) {
    console.error('Error cleaning up stale queue entries:', error);
  }
};

// Periodic cleanup of stale entries
const periodicCleanup = async () => {
  try {
    // Clean up activeQueues entries where socket is disconnected
    for (const [userId, queueData] of activeQueues.entries()) {
      const socket = io.sockets.sockets.get(queueData.socketId);
      if (!socket || !socket.connected) {
        console.log(`🧹 Periodic cleanup: Removing stale activeQueues entry for user ${userId}`);
        activeQueues.delete(userId);
        await MatchmakingQueue.findOneAndDelete({ userId: userId });
      }
    }
    
    // Clean up pendingMatches where sockets are disconnected
    for (const [matchId, match] of pendingMatches.entries()) {
      const user1Socket = io.sockets.sockets.get(match.user1?.socketId);
      const user2Socket = io.sockets.sockets.get(match.user2?.socketId);
      
      if (!user1Socket || !user1Socket.connected || !user2Socket || !user2Socket.connected) {
        console.log(`🧹 Periodic cleanup: Removing stale pending match ${matchId}`);
        
        // Notify connected user if one is still connected
        if (user1Socket && user1Socket.connected) {
          user1Socket.emit('matchCancelled', { reason: 'Partner disconnected' });
          const userId = match.user1.user?.toString?.() || match.user1.user;
          if (userId && !activeQueues.has(userId)) {
            activeQueues.set(userId, match.user1);
          }
        } else if (user2Socket && user2Socket.connected) {
          user2Socket.emit('matchCancelled', { reason: 'Partner disconnected' });
          const userId = match.user2.user?.toString?.() || match.user2.user;
          if (userId && !activeQueues.has(userId)) {
            activeQueues.set(userId, match.user2);
          }
        }
        
        pendingMatches.delete(matchId);
      }
    }
  } catch (error) {
    console.error('Error in periodic cleanup:', error);
  }
};

// Socket.IO connection handling
export const setupMatchmaking = async () => {
  // Clean up stale entries on startup
  await cleanupStaleQueueEntries();
  
  // Run periodic cleanup every 30 seconds
  setInterval(periodicCleanup, 30000);
  
  io.on('connection', (socket) => {
    console.log('🔌 User connected:', socket.id);

    // Register WebRTC handlers
    registerWebRTCHandlers(socket, io);

    // Join queue
    socket.on('joinQueue', async (data) => {
      try {
        // Extract userId and preferences from the event data
        const { userId, ...preferences } = data;
        
        if (!userId) {
          console.error('❌ joinQueue called without userId');
          socket.emit('error', { message: 'User ID is required' });
          return;
        }
        
        // Verify user exists
        const User = (await import('../models/User.js')).default;
        const user = await User.findById(userId).select('-password');
        if (!user) {
          console.error('❌ User not found:', userId);
          socket.emit('error', { message: 'User not found' });
          return;
        }
        
        console.log('✅ User verified for joinQueue:', userId);

        // CRITICAL: Clean up any stale entries for this user before joining
        // This handles cases where disconnect didn't properly clean up
        
        // Remove from activeQueues if exists with different socketId
        if (activeQueues.has(userId)) {
          const existingQueue = activeQueues.get(userId);
          if (existingQueue.socketId !== socket.id) {
            console.log(`🧹 Removing stale activeQueues entry for user ${userId} (old socket: ${existingQueue.socketId})`);
            activeQueues.delete(userId);
          }
        }
        
        // Clean up database entry with old socketId
        const staleEntry = await MatchmakingQueue.findOne({ userId: userId });
        if (staleEntry && staleEntry.socketId && staleEntry.socketId !== socket.id) {
          console.log(`🧹 Cleaning up stale DB entry with old socketId for user ${userId}`);
          const oldSocket = io.sockets.sockets.get(staleEntry.socketId);
          if (!oldSocket || !oldSocket.connected) {
            console.log(`   Old socket ${staleEntry.socketId} not connected, removing stale entry`);
            await MatchmakingQueue.findOneAndDelete({ userId: userId });
          }
        }
        
        // Clean up any pending matches this user is already in (they're re-joining)
        const userIdStr = userId.toString();
        for (const [matchId, match] of pendingMatches.entries()) {
          const matchUser1Id = match.user1.user?.toString?.() || match.user1.user;
          const matchUser2Id = match.user2.user?.toString?.() || match.user2.user;
          
          if (matchUser1Id === userIdStr || matchUser2Id === userIdStr) {
            console.log(`🧹 Cleaning up existing pending match ${matchId} before re-joining queue`);
            
            // Clean up associated WebRTC room
            if (match.roomId) {
              await cleanupRoom(io, match.roomId);
            }
            
            pendingMatches.delete(matchId);
            
            // Notify other user if still connected
            const otherQueue = matchUser1Id === userIdStr ? match.user2 : match.user1;
            const otherUserId = matchUser1Id === userIdStr ? matchUser2Id : matchUser1Id;
            if (otherQueue?.socketId) {
              const otherSocket = io.sockets.sockets.get(otherQueue.socketId);
              if (otherSocket && otherSocket.connected) {
                otherSocket.emit('matchCancelled', { reason: 'Partner left queue' });
                // Return other user to activeQueues if not already there
                if (otherUserId && !activeQueues.has(otherUserId)) {
                  activeQueues.set(otherUserId, otherQueue);
                }
              }
            }
          }
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
          console.log('✅ Match result found:', matchResult.compatibilityScore?.toFixed(1) + '%');
          
          // Extract the actual user ID from the populated document
          const matchedUserIdObj = matchResult.match.userId;
          const matchedUserId = (matchedUserIdObj._id || matchedUserIdObj).toString();
          
          // CRITICAL: Verify the matched user is actually connected (in activeQueues)
          // Database can have stale entries from disconnected users
          if (activeQueues.has(matchedUserId)) {
            await handleMatchFound(userId, matchedUserId, matchResult);
          } else {
            console.log('⚠️  Found match in DB but user is not connected, skipping. ID:', matchedUserId);
            // Clean up stale database entry
            await MatchmakingQueue.findOneAndDelete({ userId: matchedUserId });
          }
        }

      } catch (error) {
        console.error('Error joining queue:', error);
        socket.emit('error', { message: 'Failed to join queue' });
      }
    });

    // Leave queue
    socket.on('leaveQueue', async (data) => {
      try {
        const userId = data?.userId;
        if (!userId) {
          console.warn('⚠️ leaveQueue called without userId');
          return;
        }

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
        const { matchId, userId } = data;
        
        if (!userId) {
          socket.emit('error', { message: 'User ID is required' });
          return;
        }

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
        const { matchId, userId } = data;
        
        if (!userId) {
          socket.emit('error', { message: 'User ID is required' });
          return;
        }

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
            console.log('match', match);
            await handleMatchFound(userId, match.userId.toString(), match);
            // // Extract the actual user ID from the populated document
            // const matchedUserIdObj = match.userId;
            // const matchedUserId = (matchedUserIdObj._id || matchedUserIdObj).toString();
            // // Verify matched user is actually connected
            // if (activeQueues.has(matchedUserId)) {
            //   await handleMatchFound(userId, matchedUserId);
            // } else {
            //   console.log('⚠️  Found match in DB but user is not connected, cleaning up. ID:', matchedUserId);
            //   await MatchmakingQueue.findOneAndDelete({ userId: matchedUserId });
            // }
          }
        }

        if (activeQueues.has(otherUserId)) {
          const otherUserQueue = activeQueues.get(otherUserId);
          const match = await findMatch(otherUserQueue);
          if (match) {
            // Extract the actual user ID from the populated document
            const matchedUserIdObj = match.userId;
            const matchedUserId = (matchedUserIdObj._id || matchedUserIdObj).toString();
            // Verify matched user is actually connected
            if (activeQueues.has(matchedUserId)) {
              await handleMatchFound(otherUserId, matchedUserId);
            } else {
              console.log('⚠️  Found match in DB but user is not connected, cleaning up. ID:', matchedUserId);
              await MatchmakingQueue.findOneAndDelete({ userId: matchedUserId });
            }
          }
        }

      } catch (error) {
        console.error('Error rejecting match:', error);
      }
    });

    // Handle match found with enhanced compatibility data
    const handleMatchFound = async (userId1, userId2, matchResult = null) => {
      try {
        console.log('🔄 Handling match found:', userId1, 'with', userId2);
        console.log('   userId1 type:', typeof userId1, 'userId2 type:', typeof userId2);
        
        // Ensure both IDs are strings (handle ObjectId cases)
        const userId1Str = userId1.toString ? userId1.toString() : userId1;
        const userId2Str = userId2.toString ? userId2.toString() : userId2;
        
        // ATOMIC OPERATION: Try to get and IMMEDIATELY remove both users from queue
        // This prevents race condition where both matches try to pair the same users
        const user1Queue = activeQueues.get(userId1Str);
        const user2Queue = activeQueues.get(userId2Str);
        
        console.log('   User1 queue exists:', !!user1Queue, 'User2 queue exists:', !!user2Queue);
        
        if (!user1Queue || !user2Queue) {
          console.log('❌ User queue not found (possibly already matched)');
          console.log('   Looking for User1:', userId1Str);
          console.log('   Looking for User2:', userId2Str);
          console.log('   Active queues:', Array.from(activeQueues.keys()));
          console.log('   User1 in activeQueues?', activeQueues.has(userId1Str));
          console.log('   User2 in activeQueues?', activeQueues.has(userId2Str));
          
          // Check if match came from database but user is offline
          if (!user2Queue) {
            console.log('⚠️  User2 found in DB but not in activeQueues - may be stale queue entry');
          }
          return;
        }
        
        // IMMEDIATELY remove from active queues to prevent duplicate matching
        // This is the critical atomic operation that prevents race conditions
        activeQueues.delete(userId1Str);
        activeQueues.delete(userId2Str);
        console.log('✅ Creating match between users:', userId1Str, userId2Str);
        
        // Check if either user is already in a pending match (extra safety)
        const existingMatch = Array.from(pendingMatches.values()).find(match => {
          const matchUser1Id = match.user1.user?.toString?.() || match.user1.user;
          const matchUser2Id = match.user2.user?.toString?.() || match.user2.user;
          return matchUser1Id === userId1Str || matchUser1Id === userId2Str ||
                 matchUser2Id === userId1Str || matchUser2Id === userId2Str;
        });
        
        if (existingMatch) {
          console.log('⚠️ Users already in pending match, cleaning up old match and creating new one');
          // Clean up the existing match (likely stale)
          const matchUser1Id = existingMatch.user1.user?.toString?.() || existingMatch.user1.user;
          const matchUser2Id = existingMatch.user2.user?.toString?.() || existingMatch.user2.user;
          
          // Check if users are actually connected
          const user1Connected = activeQueues.has(matchUser1Id);
          const user2Connected = activeQueues.has(matchUser2Id);
          
          if (!user1Connected || !user2Connected) {
            console.log('   Old match has disconnected users, removing it');
            // Clean up associated WebRTC room
            if (existingMatch.roomId) {
              await cleanupRoom(io, existingMatch.roomId);
            }
            pendingMatches.delete(existingMatch.matchId);
            // Continue with new match creation
          } else {
            console.log('   Both users still connected, skipping duplicate match');
            // Restore them to activeQueues since we deleted them above
            activeQueues.set(userId1Str, user1Queue);
            activeQueues.set(userId2Str, user2Queue);
            return;
          }
        }

        // Create match with compatibility data
        const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const roomId = `room_${matchId}`;
        const match = {
          matchId,
          roomId,
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
            roomId,
            opponentRole: user2Queue.preferences.role,
            interviewType: user1Queue.preferences.interviewType,
            duration: user1Queue.preferences.duration,
            skillLevel: user1Queue.preferences.skillLevel,
            partner: user2Queue.user,
            compatibilityScore: matchResult?.compatibilityScore || 0,
            scoreBreakdown: matchResult?.scoreBreakdown || {},
            matchReasons: generateMatchReasons(matchResult?.scoreBreakdown || {})
          });
          // Prompt client to join WebRTC room
          user1Socket.emit('startCall', { roomId });
        }

        if (user2Socket) {
          user2Socket.emit('matchFound', {
            matchId,
            roomId,
            opponentRole: user1Queue.preferences.role,
            interviewType: user2Queue.preferences.interviewType,
            duration: user2Queue.preferences.duration,
            skillLevel: user2Queue.preferences.skillLevel,
            partner: user1Queue.user,
            compatibilityScore: matchResult?.compatibilityScore || 0,
            scoreBreakdown: matchResult?.scoreBreakdown || {},
            matchReasons: generateMatchReasons(matchResult?.scoreBreakdown || {})
          });
          // Prompt client to join WebRTC room
          user2Socket.emit('startCall', { roomId });
        }

        // Users already removed from active queues at the start

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
        // Find userId by socketId in activeQueues
        let userId = null;
        for (const [uid, queueData] of activeQueues.entries()) {
          if (queueData.socketId === socket.id) {
            userId = uid;
            break;
          }
        }

        // Always clean up WebRTC rooms for this socket first
        await cleanupSocketRooms(socket);
        
        if (userId) {
          console.log('🔌 User disconnecting:', socket.id, 'userId:', userId);
          
          // Remove from database queue
          await MatchmakingQueue.findOneAndDelete({ userId: userId });
          
          // Remove from active queues
          activeQueues.delete(userId);
          
          // Clean up any pending matches this user is in
          const userIdStr = userId.toString();
          for (const [matchId, match] of pendingMatches.entries()) {
            const matchUser1Id = match.user1.user?.toString?.() || match.user1.user;
            const matchUser2Id = match.user2.user?.toString?.() || match.user2.user;
            
            if (matchUser1Id === userIdStr || matchUser2Id === userIdStr) {
              console.log(`🧹 Cleaning up pending match ${matchId} for disconnected user ${userIdStr}`);
              
              // Clean up associated WebRTC room
              if (match.roomId) {
                await cleanupRoom(io, match.roomId);
              }
              
              // Notify the other user if they're still connected
              const otherUserId = matchUser1Id === userIdStr ? matchUser2Id : matchUser1Id;
              const otherQueue = matchUser1Id === userIdStr ? match.user2 : match.user1;
              
              if (otherQueue?.socketId) {
                const otherSocket = io.sockets.sockets.get(otherQueue.socketId);
                if (otherSocket && otherSocket.connected) {
                  otherSocket.emit('matchCancelled', { reason: 'Partner disconnected' });
                  // Return other user to queue
                  if (otherUserId && activeQueues.has(otherUserId)) {
                    // Keep in queue, they'll get matched again
                  } else {
                    // Re-add to activeQueues if not there
                    activeQueues.set(otherUserId, otherQueue);
                  }
                }
              }
              
              // Remove the pending match
              pendingMatches.delete(matchId);
            }
          }
          
          console.log('✅ Cleaned up user on disconnect:', userId);
        } else {
          console.log('🔌 Socket disconnected (no active queue entry):', socket.id);
          
          // Still check pending matches by socketId to clean up orphaned matches
          for (const [matchId, match] of pendingMatches.entries()) {
            if (match.user1?.socketId === socket.id || match.user2?.socketId === socket.id) {
              console.log(`🧹 Cleaning up orphaned pending match ${matchId} for disconnected socket ${socket.id}`);
              
              // Clean up associated WebRTC room
              if (match.roomId) {
                await cleanupRoom(io, match.roomId);
              }
              
              // Notify the other user if still connected
              const otherQueue = match.user1?.socketId === socket.id ? match.user2 : match.user1;
              if (otherQueue?.socketId) {
                const otherSocket = io.sockets.sockets.get(otherQueue.socketId);
                if (otherSocket && otherSocket.connected) {
                  otherSocket.emit('matchCancelled', { reason: 'Partner disconnected' });
                }
              }
              
              pendingMatches.delete(matchId);
            }
          }
        }
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });
  });
};
