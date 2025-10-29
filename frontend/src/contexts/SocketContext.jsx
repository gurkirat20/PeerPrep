import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [queueStatus, setQueueStatus] = useState(null);
  const [matchFound, setMatchFound] = useState(null);

  useEffect(() => {
    const onInterviewRoute = location.pathname.startsWith('/interview/');
    if ((isAuthenticated && user) || onInterviewRoute) {
      // Connect to Socket.IO backend directly to avoid proxy issues
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const token = localStorage.getItem('token');
      const socketOptions = {
        transports: ['websocket'],
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000
      };
      if (token) {
        socketOptions.auth = { token };
      }
      const newSocket = io(backendUrl, socketOptions);

      // Connection events
      newSocket.on('connect', () => {
        console.log('🔌 Connected to server');
        setIsConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('🔌 Disconnected from server');
        setIsConnected(false);
      });

      // Matchmaking events
      newSocket.on('queueJoined', (data) => {
        console.log('📋 Joined queue:', data);
        setQueueStatus(data);
      });

      newSocket.on('queueUpdated', (data) => {
        console.log('📋 Queue updated:', data);
        setQueueStatus(data);
      });

      newSocket.on('matchFound', (data) => {
        console.log('🎯 Match found:', data);
        setMatchFound(data);
        setQueueStatus(null); // Clear queue status
        // If backend provides roomId directly, navigate immediately
        if (data.roomId) {
          navigate(`/interview/${data.roomId}`);
        }
      });

      // Start call trigger from backend
      newSocket.on('startCall', ({ roomId }) => {
        if (roomId) {
          navigate(`/interview/${roomId}`);
        }
      });

      newSocket.on('queueLeft', () => {
        console.log('📋 Left queue');
        setQueueStatus(null);
      });

      newSocket.on('matchCancelled', () => {
        console.log('❌ Match cancelled');
        setMatchFound(null);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      // Disconnect if not authenticated
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
        setQueueStatus(null);
        setMatchFound(null);
      }
    }
  }, [isAuthenticated, user, location.pathname]);

  const joinQueue = (preferences) => {
    if (socket && isConnected) {
      socket.emit('joinQueue', preferences);
    }
  };

  const leaveQueue = () => {
    if (socket && isConnected) {
      socket.emit('leaveQueue');
    }
  };

  const acceptMatch = () => {
    if (socket && isConnected && matchFound) {
      socket.emit('acceptMatch', { matchId: matchFound.matchId });
    }
  };

  const rejectMatch = () => {
    if (socket && isConnected && matchFound) {
      socket.emit('rejectMatch', { matchId: matchFound.matchId });
    }
  };

  const value = {
    socket,
    isConnected,
    queueStatus,
    matchFound,
    joinQueue,
    leaveQueue,
    acceptMatch,
    rejectMatch
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
