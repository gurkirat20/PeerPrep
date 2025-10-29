// WebRTC signaling handlers for Socket.IO
import { Server } from 'socket.io';

// Store active rooms and participants
const activeRooms = new Map();
const participantRooms = new Map();

export const setupWebRTCSignaling = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected for WebRTC:', socket.id);

    // Join room
    socket.on('joinRoom', async (data) => {
      const { roomId, userId } = data;
      
      try {
        // Leave previous room if any
        if (participantRooms.has(socket.id)) {
          const prevRoomId = participantRooms.get(socket.id);
          await leaveRoom(socket, prevRoomId);
        }

        // Join new room
        await socket.join(roomId);
        participantRooms.set(socket.id, roomId);

        // Initialize room if it doesn't exist
        if (!activeRooms.has(roomId)) {
          activeRooms.set(roomId, {
            id: roomId,
            participants: new Map(),
            createdAt: new Date(),
            status: 'waiting'
          });
        }

        const room = activeRooms.get(roomId);
        const participant = {
          id: socket.id,
          userId,
          joinedAt: new Date(),
          isConnected: true
        };

        room.participants.set(socket.id, participant);

        // Notify room participants
        const participantsList = Array.from(room.participants.values()).map(p => ({
          id: p.id,
          userId: p.userId,
          joinedAt: p.joinedAt
        }));

        socket.emit('roomJoined', {
          roomId,
          participants: participantsList,
          isInitiator: room.participants.size === 1
        });

        socket.to(roomId).emit('participantJoined', participant);

        console.log(`User ${userId} joined room ${roomId}`);

        // If this is the second participant, start the interview
        if (room.participants.size === 2) {
          room.status = 'active';
          io.to(roomId).emit('interviewStarted', {
            roomId,
            startedAt: new Date()
          });
        }

      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('roomError', {
          error: 'Failed to join room',
          details: error.message
        });
      }
    });

    // Leave room
    socket.on('leaveRoom', async (data) => {
      const { roomId } = data;
      await leaveRoom(socket, roomId);
    });

    // WebRTC signaling events
    socket.on('offer', (data) => {
      const { roomId, offer } = data;
      socket.to(roomId).emit('offer', {
        from: socket.id,
        offer
      });
    });

    socket.on('answer', (data) => {
      const { roomId, answer } = data;
      socket.to(roomId).emit('answer', {
        from: socket.id,
        answer
      });
    });

    socket.on('iceCandidate', (data) => {
      const { roomId, candidate } = data;
      socket.to(roomId).emit('iceCandidate', {
        from: socket.id,
        candidate
      });
    });

    // Chat events
    socket.on('chatMessage', (data) => {
      const { roomId, message } = data;
      socket.to(roomId).emit('chatMessage', {
        ...message,
        roomId
      });
    });

    // Code editor events
    socket.on('codeUpdate', (data) => {
      const { roomId, code, language } = data;
      socket.to(roomId).emit('codeUpdate', {
        roomId,
        code,
        language,
        from: socket.id
      });
    });

    // Interview control events
    socket.on('startRecording', (data) => {
      const { roomId } = data;
      socket.to(roomId).emit('recordingStarted', {
        roomId,
        startedBy: socket.id,
        startedAt: new Date()
      });
    });

    socket.on('stopRecording', (data) => {
      const { roomId } = data;
      socket.to(roomId).emit('recordingStopped', {
        roomId,
        stoppedBy: socket.id,
        stoppedAt: new Date()
      });
    });

    socket.on('endInterview', (data) => {
      const { roomId, reason } = data;
      socket.to(roomId).emit('interviewEnded', {
        roomId,
        endedBy: socket.id,
        reason,
        endedAt: new Date()
      });
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log('User disconnected:', socket.id);
      
      if (participantRooms.has(socket.id)) {
        const roomId = participantRooms.get(socket.id);
        await leaveRoom(socket, roomId);
      }
    });
  });
};

const leaveRoom = async (socket, roomId) => {
  try {
    await socket.leave(roomId);
    participantRooms.delete(socket.id);

    if (activeRooms.has(roomId)) {
      const room = activeRooms.get(roomId);
      const participant = room.participants.get(socket.id);
      
      if (participant) {
        room.participants.delete(socket.id);
        
        // Notify other participants
        socket.to(roomId).emit('participantLeft', {
          id: socket.id,
          userId: participant.userId
        });

        // Clean up room if empty
        if (room.participants.size === 0) {
          activeRooms.delete(roomId);
          console.log(`Room ${roomId} deleted - no participants`);
        } else {
          // Update room status if only one participant left
          room.status = 'waiting';
          socket.to(roomId).emit('interviewPaused', {
            roomId,
            reason: 'Participant left'
          });
        }
      }
    }

    console.log(`User left room ${roomId}`);
  } catch (error) {
    console.error('Error leaving room:', error);
  }
};

// Utility functions
export const getRoomInfo = (roomId) => {
  return activeRooms.get(roomId);
};

export const getAllRooms = () => {
  return Array.from(activeRooms.values()).map(room => ({
    id: room.id,
    participantCount: room.participants.size,
    status: room.status,
    createdAt: room.createdAt
  }));
};

export const cleanupInactiveRooms = () => {
  const now = new Date();
  const inactiveThreshold = 30 * 60 * 1000; // 30 minutes

  for (const [roomId, room] of activeRooms.entries()) {
    const timeSinceCreation = now - room.createdAt;
    
    if (timeSinceCreation > inactiveThreshold && room.participants.size === 0) {
      activeRooms.delete(roomId);
      console.log(`Cleaned up inactive room: ${roomId}`);
    }
  }
};

// Run cleanup every 10 minutes
setInterval(cleanupInactiveRooms, 10 * 60 * 1000);
