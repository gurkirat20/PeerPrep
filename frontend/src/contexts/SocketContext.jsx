import { createContext, useContext, useEffect, useState, useRef } from 'react';
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
  const socketInitialized = useRef(false);

  // Effect to manage socket connection based on auth state
  useEffect(() => {
    const onInterviewRoute = location.pathname.startsWith('/interview/');
    const shouldConnect = (isAuthenticated && user) || onInterviewRoute;
    
    // Only create socket once if we should connect and haven't initialized yet
    if (shouldConnect && !socketInitialized.current && !socket) {
      // Connect to Socket.IO backend directly to avoid proxy issues
      // Prefer URL from localStorage so both peers can target the same signaling server (e.g., ngrok)
      const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('BACKEND_URL') : null;
      // In dev, force localhost backend to avoid stale ngrok/custom URLs
      // const backendUrl = import.meta.env.DEV
      //   ? 'http://localhost:3001'
      //   : (storedUrl || import.meta.env.VITE_BACKEND_URL || 'http://10.143.143.182:3001');
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      console.log('Socket connecting to:', backendUrl);
      const token = localStorage.getItem('token');
      const socketOptions = {
        // Try polling first, then upgrade to websocket (better for Render.com and reverse proxies)
        transports: ['polling', 'websocket'],
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        // Additional options for better connection stability
        upgrade: true,
        rememberUpgrade: true,
        timeout: 20000,
        // Force new connection to avoid stale connections
        forceNew: false
      };
      if (token) {
        socketOptions.auth = { token };
      }
      const newSocket = io(backendUrl, socketOptions);
      
      // Add connection error handling
      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
      });

      // Handle socket errors (like authentication failures)
      newSocket.on('error', (error) => {
        console.error('Socket error event:', error);
        if (error.message === 'Authentication required') {
          console.error('❌ Authentication required for socket operations');
        }
      });

      // Handle authentication errors from backend
      newSocket.on('authError', (error) => {
        console.error('Socket auth error:', error);
      });

      // Connection events
      newSocket.on('connect', () => {
        console.log('🔌 Connected to server');
        setIsConnected(true);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('🔌 Disconnected from server:', reason);
        setIsConnected(false);
        // Only clear socket if it was intentionally closed or auth failed
        if (reason === 'io server disconnect' || reason === 'io client disconnect') {
          setSocket(null);
        }
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

      // Handle matchmaking errors
      newSocket.on('matchmakingError', (error) => {
        console.error('❌ Matchmaking error:', error);
        alert(error.message || 'An error occurred during matchmaking');
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
      socketInitialized.current = true;
    }

    // Cleanup: Only cleanup on logout or when leaving interview routes while not authenticated
    return () => {
      const stillOnInterviewRoute = location.pathname.startsWith('/interview/');
      const shouldStillConnect = (isAuthenticated && user) || stillOnInterviewRoute;
      
      // Only cleanup if we definitely shouldn't be connected
      if (!shouldStillConnect && socket && socketInitialized.current) {
        console.log('Cleaning up socket connection - user logged out or left interview');
        socket.close();
        setSocket(null);
        setIsConnected(false);
        setQueueStatus(null);
        setMatchFound(null);
        socketInitialized.current = false;
      }
    };
  }, [isAuthenticated, user, location.pathname]); // Don't include socket to avoid re-renders

  const joinQueue = (preferences) => {
    console.log('joinQueue called', { socket: !!socket, isConnected, preferences });
    
    if (!socket) {
      console.error('❌ Cannot join queue: Socket not initialized');
      alert('Socket connection not ready. Please wait a moment and try again.');
      return;
    }
    
    if (!isConnected) {
      console.warn('⚠️ Socket not connected yet, waiting for connection...');
      // Wait for connection then emit
      const connectHandler = () => {
        console.log('✅ Socket connected, now joining queue');
        socket.emit('joinQueue', preferences);
        socket.off('connect', connectHandler);
      };
      socket.on('connect', connectHandler);
      
      // If already connecting, the handler will fire when connected
      // If not connecting, try to connect
      if (socket.disconnected) {
        socket.connect();
      }
      return;
    }
    
    // Socket is connected, emit immediately
    console.log('📤 Emitting joinQueue with preferences:', preferences);
    socket.emit('joinQueue', preferences);
  };

  const leaveQueue = () => {
    console.log('leaveQueue called', { socket: !!socket, isConnected });
    if (socket && isConnected) {
      socket.emit('leaveQueue');
    } else {
      console.warn('⚠️ Cannot leave queue: Socket not connected');
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
