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
  const pendingJoinQueue = useRef(null); // Store pending joinQueue call

  // Effect to manage socket connection based on auth state
  useEffect(() => {
    const onInterviewRoute = location.pathname.startsWith('/interview/');
    const shouldConnect = (isAuthenticated && user) || onInterviewRoute;
    
    console.log('Socket useEffect', { 
      isAuthenticated, 
      hasUser: !!user, 
      onInterviewRoute, 
      shouldConnect, 
      socketInitialized: socketInitialized.current, 
      hasSocket: !!socket 
    });
    
    // Create socket if we should connect and haven't initialized yet
    if (shouldConnect && !socketInitialized.current && !socket) {
      console.log('🔌 Initializing socket connection...');
      // Connect to Socket.IO backend directly to avoid proxy issues
      // Prefer URL from localStorage so both peers can target the same signaling server (e.g., ngrok)
      const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('BACKEND_URL') : null;
      // In dev, force localhost backend to avoid stale ngrok/custom URLs
      // const backendUrl = import.meta.env.DEV
      //   ? 'http://localhost:3001'
      //   : (storedUrl || import.meta.env.VITE_BACKEND_URL || 'http://10.143.143.182:3001');
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      console.log('Socket connecting to:', backendUrl);
      
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
      // No authentication required - socket connects freely
      const newSocket = io(backendUrl, socketOptions);
      
      // Add connection error handling
      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
      });

      // Handle socket errors
      newSocket.on('error', (error) => {
        console.error('Socket error event:', error);
      });

      // Connection events
      newSocket.on('connect', () => {
        console.log('🔌 Connected to server');
        setIsConnected(true);
        
        // If there's a pending joinQueue call, execute it now
        if (pendingJoinQueue.current) {
          console.log('🔄 Executing pending joinQueue after connection');
          const { preferences, userId } = pendingJoinQueue.current;
          pendingJoinQueue.current = null;
          // Execute immediately - no auth needed
          setTimeout(() => {
            console.log('📤 Emitting pending joinQueue with preferences:', preferences);
            newSocket.emit('joinQueue', { ...preferences, userId });
          }, 100);
        }
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
      console.log('✅ Socket instance created and stored');
    } else if (shouldConnect && socketInitialized.current && !socket) {
      // Socket was initialized but lost - reset the flag to allow re-initialization
      console.warn('⚠️ Socket was initialized but is now null, resetting flag');
      socketInitialized.current = false;
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
    console.log('joinQueue called', { socket: !!socket, isConnected, isAuthenticated, user: !!user, preferences });
    
    // Get user ID from auth context (no token needed for socket)
    if (!user || !user.id) {
      console.error('❌ Cannot join queue: User not authenticated');
      alert('Please log in to join the matchmaking queue.');
      return;
    }
    
    const userId = user.id;
    
    // If socket is not initialized, store the request and wait for initialization
    if (!socket) {
      console.warn('⚠️ Socket not initialized yet, storing joinQueue request...');
      
      // Store preferences with userId to retry once socket is ready
      pendingJoinQueue.current = { preferences, userId };
      console.log('⏳ Waiting for socket initialization via useEffect...');
      return;
    }
    
    // Clear any pending request since we have a socket now
    pendingJoinQueue.current = null;
    
    if (!isConnected) {
      console.warn('⚠️ Socket not connected yet, waiting for connection...');
      // Wait for connection then emit
      const connectHandler = () => {
        console.log('✅ Socket connected, now joining queue');
        socket.emit('joinQueue', { ...preferences, userId });
        socket.off('connect', connectHandler);
      };
      socket.on('connect', connectHandler);
      
      // If disconnected, try to connect
      if (socket.disconnected) {
        socket.connect();
      }
      return;
    }
    
    // Socket is connected - emit joinQueue with userId
    console.log('📤 Emitting joinQueue with preferences and userId:', { ...preferences, userId });
    socket.emit('joinQueue', { ...preferences, userId });
  };

  const leaveQueue = () => {
    console.log('leaveQueue called', { socket: !!socket, isConnected });
    if (!user || !user.id) {
      console.warn('⚠️ Cannot leave queue: User not authenticated');
      return;
    }
    
    if (socket && isConnected) {
      socket.emit('leaveQueue', { userId: user.id });
    } else {
      console.warn('⚠️ Cannot leave queue: Socket not connected');
    }
  };

  const acceptMatch = () => {
    if (!user || !user.id) {
      console.warn('⚠️ Cannot accept match: User not authenticated');
      return;
    }
    
    if (socket && isConnected && matchFound) {
      socket.emit('acceptMatch', { matchId: matchFound.matchId, userId: user.id });
    }
  };

  const rejectMatch = () => {
    if (!user || !user.id) {
      console.warn('⚠️ Cannot reject match: User not authenticated');
      return;
    }
    
    if (socket && isConnected && matchFound) {
      socket.emit('rejectMatch', { matchId: matchFound.matchId, userId: user.id });
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
