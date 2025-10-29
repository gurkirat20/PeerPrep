import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { InterviewProvider } from './contexts/InterviewContext'
import { SocketProvider } from './contexts/SocketContext'
import { NotificationProvider } from './contexts/NotificationContext';
import Login from './components/Login'
import Register from './components/Register'
import Dashboard from './components/Dashboard'
import InterviewRoomWindow from './components/InterviewRoomWindow'
import AIInterviewerWindow from './components/AIInterviewerWindow'
import './App.css'

const AppContent = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
        <Routes>
          {/* Interview Room Route - Accessible without authentication check */}
          <Route path="/interview/:roomId" element={<InterviewRoomWindow />} />
          
          {/* AI Interviewer Route - Accessible without authentication check */}
          <Route path="/ai-interview" element={<AIInterviewerWindow />} />
          
          {/* Protected Routes */}
          {isAuthenticated ? (
            <>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/login" element={<Navigate to="/dashboard" replace />} />
              <Route path="/register" element={<Navigate to="/dashboard" replace />} />
            </>
          ) : (
            <>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/dashboard" element={<Navigate to="/login" replace />} />
            </>
          )}
        </Routes>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <InterviewProvider>
          <SocketProvider>
            <NotificationProvider>
              <AppContent />
            </NotificationProvider>
          </SocketProvider>
        </InterviewProvider>
      </AuthProvider>
    </Router>
  );
}

export default App
