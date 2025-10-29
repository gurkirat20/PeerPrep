import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';

const WindowWrapper = ({ 
  children, 
  component: Component,
  title, 
  roomId,
  requireSocket = false,
  requireAuth = true,
  errorMessage = 'Authentication required. Please log in to access this feature.'
}) => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { isConnected } = useSocket();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading && requireAuth) return;

    if (requireAuth && !isAuthenticated) {
      setError(errorMessage);
      setIsLoading(false);
      return;
    }

    if (requireSocket && !isConnected) {
      const timeout = setTimeout(() => {
        setError('Connection timeout. Please refresh the page.');
        setIsLoading(false);
      }, 10000);

      if (isConnected) {
        clearTimeout(timeout);
        setIsLoading(false);
      }

      return () => clearTimeout(timeout);
    }

    setIsLoading(false);
  }, [isAuthenticated, authLoading, isConnected, requireSocket, requireAuth, errorMessage]);

  const handleClose = () => {
    if (window.opener) {
      window.close();
    } else {
      navigate('/dashboard');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading {title}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {Component ? (
        <Component roomId={roomId} onClose={handleClose} />
      ) : (
        React.cloneElement(children, { onClose: handleClose })
      )}
    </div>
  );
};

export default WindowWrapper;
