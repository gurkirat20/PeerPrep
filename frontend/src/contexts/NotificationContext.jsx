import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import axios from 'axios';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { socket } = useSocket();
  const { user } = useAuth();

  // Fetch notifications from API
  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const response = await axios.get('/notifications');
      
      if (response.data.success) {
        setNotifications(response.data.data.notifications);
        setUnreadCount(response.data.data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await axios.patch(`/notifications/${notificationId}/read`);
      
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId 
            ? { ...notif, isRead: true, readAt: new Date() }
            : notif
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await axios.patch('/notifications/mark-all-read');
      
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isRead: true, readAt: new Date() }))
      );
      
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Add new notification
  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev]);
    if (!notification.isRead) {
      setUnreadCount(prev => prev + 1);
    }
  };

  // Remove notification
  const removeNotification = (notificationId) => {
    setNotifications(prev => {
      const notification = prev.find(n => n._id === notificationId);
      if (notification && !notification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      return prev.filter(n => n._id !== notificationId);
    });
  };

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }

    // Handle different notification types
    switch (notification.type) {
      case 'match_found':
        if (notification.data?.actionUrl) {
          window.open(notification.data.actionUrl, '_blank');
        }
        break;
      case 'interview_starting':
        if (notification.data?.actionUrl) {
          window.open(notification.data.actionUrl, '_blank');
        }
        break;
      case 'analysis_ready':
        if (notification.data?.actionUrl) {
          window.location.href = notification.data.actionUrl;
        }
        break;
      case 'feedback_received':
        if (notification.data?.actionUrl) {
          window.location.href = notification.data.actionUrl;
        }
        break;
      default:
        break;
    }
  };

  // Socket event listeners
  useEffect(() => {
    if (!socket || !user) return;

    // Listen for new notifications
    socket.on('newNotification', (notification) => {
      addNotification(notification);
      
      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/logo.svg',
          tag: notification._id
        });
      }
    });

    // Listen for match found
    socket.on('matchFound', (data) => {
      const notification = {
        _id: `match_${Date.now()}`,
        type: 'match_found',
        title: 'Match Found! 🎉',
        message: `You've been matched with ${data.match.name} for a peer interview. Get ready to start!`,
        data: {
          actionUrl: `/interview/${data.match.sessionId}`,
          actionText: 'Join Interview',
          matchedUserId: data.match.userId,
          matchedUserName: data.match.name,
          sessionId: data.match.sessionId
        },
        isRead: false,
        createdAt: new Date(),
        priority: 'high'
      };
      
      addNotification(notification);
    });

    // Listen for interview starting
    socket.on('interviewStarted', (data) => {
      const notification = {
        _id: `interview_start_${Date.now()}`,
        type: 'interview_starting',
        title: 'Interview Started! 🚀',
        message: 'Your interview has begun. Good luck!',
        data: {
          actionUrl: `/interview/${data.sessionId}`,
          actionText: 'Join Interview',
          sessionId: data.sessionId
        },
        isRead: false,
        createdAt: new Date(),
        priority: 'high'
      };
      
      addNotification(notification);
    });

    // Listen for analysis ready
    socket.on('analysisReady', (data) => {
      const notification = {
        _id: `analysis_${Date.now()}`,
        type: 'analysis_ready',
        title: 'Interview Analysis Ready 📊',
        message: 'Your interview analysis and feedback are now available. Check your performance insights!',
        data: {
          actionUrl: '/dashboard?tab=analysis',
          actionText: 'View Analysis',
          interviewId: data.interviewId,
          sessionId: data.sessionId
        },
        isRead: false,
        createdAt: new Date(),
        priority: 'medium'
      };
      
      addNotification(notification);
    });

    return () => {
      socket.off('newNotification');
      socket.off('matchFound');
      socket.off('interviewStarted');
      socket.off('analysisReady');
    };
  }, [socket, user]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Fetch notifications when user changes
  useEffect(() => {
    if (user) {
      fetchNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user]);

  // Auto-refresh notifications every 30 seconds
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  const value = {
    notifications,
    unreadCount,
    isLoading,
    showNotifications,
    setShowNotifications,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    handleNotificationClick,
    removeNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;
