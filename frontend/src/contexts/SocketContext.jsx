import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getToken } from '../utils/auth';

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
      // Use centralized token utility
      const token = getToken();
      
      // Log token status (don't log the actual token for security)
      if (token) {
        console.log('✅ Token found, including in socket auth');
      } else {
        console.warn('⚠️ No token found in localStorage - socket will connect without authentication');
      }
      
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
        console.log('🔐 Socket auth configured with token');
      } else {
        console.warn('⚠️ Socket connecting without token - authentication may fail');
      }
      const newSocket = io(backendUrl, socketOptions);
      
      // Add connection error handling
      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
      });

      // Handle socket errors (like authentication failures)
      newSocket.on('error', (error) => {
        console.error('Socket error event:', error);
        const errorMessage = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
        if (errorMessage.includes('Authentication') || errorMessage.includes('auth')) {
          console.error('❌ Authentication required for socket operations');
          const currentToken = getToken();
          console.error('Token available:', !!currentToken);
          
          if (currentToken) {
            console.log('🔄 Authentication failed, reconnecting socket with token...');
            // Fully disconnect and recreate socket with token
            newSocket.disconnect();
            newSocket.removeAllListeners();
            
            // Reset initialization flag to allow reconnection
            socketInitialized.current = false;
            setSocket(null);
            setIsConnected(false);
            
            // Reconnect after a short delay
            setTimeout(() => {
              console.log('🔄 Attempting to reconnect with authentication...');
              // The useEffect will handle reconnection when socket becomes null
              // But we need to trigger it, so clear the socket state
              setSocket(null);
            }, 1000);
          }
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
        
        // Note: socket.auth is only used during handshake, not after connection
        // If we need to verify auth, we should emit a test event or check server response
        
        // If there's a pending joinQueue call, execute it now
        if (pendingJoinQueue.current) {
          console.log('🔄 Executing pending joinQueue after connection');
          const preferences = pendingJoinQueue.current;
          pendingJoinQueue.current = null;
          // Wait a bit for server to finish authentication setup
          setTimeout(() => {
            console.log('📤 Emitting pending joinQueue with preferences:', preferences);
            newSocket.emit('joinQueue', preferences);
          }, 500);
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
    
    // Check if user is authenticated - use centralized token utility
    const token = getToken();
    if (!token) {
      console.error('❌ Cannot join queue: No authentication token found');
      alert('Please log in to join the matchmaking queue.');
      return;
    }
    
    // If socket is not initialized, store the request and wait for initialization
    if (!socket) {
      console.warn('⚠️ Socket not initialized yet, storing joinQueue request...');
      
      // Check if we should be connected (user authenticated)
      if (isAuthenticated && user) {
        // Store preferences to retry once socket is ready
        pendingJoinQueue.current = preferences;
        console.log('⏳ Waiting for socket initialization via useEffect...');
        // Socket will be created by useEffect, and on connect it will retry joinQueue
        return;
      } else {
        console.error('❌ User not authenticated, cannot initialize socket');
        alert('Please log in to join the matchmaking queue.');
      }
      return;
    }
    
    // Clear any pending request since we have a socket now
    pendingJoinQueue.current = null;
    
    // Note: socket.auth only works during initial handshake, not after connection
    // If socket connected without proper auth, the backend will handle it in joinQueue
    
    if (!isConnected) {
      console.warn('⚠️ Socket not connected yet, waiting for connection...');
      // Wait for connection then emit
      const connectHandler = () => {
        console.log('✅ Socket connected, now joining queue');
        // Small delay to ensure server has finished auth setup
        setTimeout(() => {
          socket.emit('joinQueue', preferences);
        }, 500);
        socket.off('connect', connectHandler);
      };
      socket.on('connect', connectHandler);
      
      // If disconnected, try to connect (token should already be in socketOptions.auth)
      if (socket.disconnected) {
        socket.connect();
      }
      return;
    }
    
    // Socket is connected - emit joinQueue
    // Backend will verify authentication and set userId if token is valid
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
