import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useInterview } from '../contexts/InterviewContext';
import { User, LogOut, Calendar, Star, TrendingUp, Users, Brain, Moon, Sun } from 'lucide-react';
import Matchmaking from './Matchmaking';
import UserProfile from './UserProfile';
import EnhancedProfile from './EnhancedProfile';
import MatchmakingLoader from './MatchmakingLoader';
import NotificationBell from './NotificationBell';
import InterviewAnalysisDashboard from './InterviewAnalysisDashboard';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { stats, simulateMockInterview } = useInterview();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [interviewType, setInterviewType] = useState('');
  const [showMatchmaking, setShowMatchmaking] = useState(false);
  const [showEnhancedPreferences, setShowEnhancedPreferences] = useState(false);
  const [currentMatch, setCurrentMatch] = useState(null);
  const [showMatchmakingLoader, setShowMatchmakingLoader] = useState(false);
  const [matchmakingPreferences, setMatchmakingPreferences] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Initialize from localStorage or system preference
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme !== null) {
      return JSON.parse(savedTheme);
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Apply dark mode class to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleLogout = () => {
    logout();
  };

  const handleStartInterview = (type) => {
    setInterviewType(type);
    
    // For AI interviews, user is always interviewee
    if (type === 'ai') {
      // Navigate directly to AI interviewer (avoid async state race)
      openAIInterviewerWindow();
      return;
    }
    
    // For peer interviews, show role selection
    setShowRoleModal(true);
  };

  const openAIInterviewerWindow = () => {
    // Navigate in-tab to avoid popup blockers
    navigate('/ai-interview');
    
    // Simulate adding a mock interview after a delay (when user completes the interview)
    setTimeout(() => {
      simulateMockInterview();
    }, 30000); // Simulate completion after 30 seconds
  };

  const handleRoleSelection = () => {
    if (!selectedRole) return;
    
    if (interviewType === 'ai') {
      console.log('Starting AI interview - User is interviewee, AI is interviewer');
      openAIInterviewerWindow();
    } else {
      console.log(`Starting peer interview as ${selectedRole}`);
      // Start matchmaking UI (socket-driven)
      setMatchmakingPreferences({
        role: selectedRole,
        userProfile: user
      });
      setShowMatchmaking(true);
    }
    setShowRoleModal(false);
    setSelectedRole('');
    setInterviewType('');
  };

  // Explicit handler used by Interviews tab CTA
  const handleStartPeerInterview = () => {
    setInterviewType('peer');
    setShowRoleModal(true);
  };

  const handleMatchFound = (match) => {
    console.log('Match found:', match);
    setCurrentMatch(match);
    setShowMatchmaking(false);
    // Use the match ID as the room ID so both users join the same room
    const roomId = match.matchId || `room_${match.id || Date.now()}`;
    
    // Open interview room in a new window
    openInterviewRoomWindow(roomId);
  };

  const openInterviewRoomWindow = (roomId) => {
    // Navigate in-tab to avoid popup blockers
    navigate(`/interview/${roomId}`);
  };

  const handleMatchmakingCancel = () => {
    setShowMatchmaking(false);
    setSelectedRole('');
    setInterviewType('');
  };

  const handleNoMatch = (type) => {
    setShowMatchmakingLoader(false);
    if (type === 'ai') {
      // Navigate to AI Interviewer
      navigate('/ai-interview');
    }
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: TrendingUp },
    { id: 'interviews', name: 'Interviews', icon: Calendar },
    { id: 'analysis', name: 'Analysis', icon: Brain },
    { id: 'profile', name: 'Profile', icon: User }
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'}`}>
      {/* Header */}
      <header className={`backdrop-blur-md shadow-lg border-b sticky top-0 z-50 transition-colors duration-300 ${isDarkMode ? 'bg-gray-900/80 border-gray-700/20' : 'bg-white/80 border-white/20'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                PeerPrep
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <NotificationBell />
              
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-lg transition-colors duration-200 group ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
                title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5 text-yellow-500 group-hover:rotate-12 transition-transform" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600 group-hover:rotate-12 transition-transform" />
                )}
              </button>
              
              {/* User Profile */}
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold truncate ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{user?.name}</p>
                </div>
              </div>
              
              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 group ${isDarkMode ? 'text-gray-400 hover:text-red-400 hover:bg-red-900/20' : 'text-gray-600 hover:text-red-600 hover:bg-red-50'}`}
              >
                <LogOut className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64">
            <nav className="space-y-3">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/25'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-gray-800/60 hover:shadow-md hover:text-gray-900 dark:hover:text-gray-100'
                    }`}
                  >
                    <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                      activeTab === tab.id ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                    }`} />
                    <span className="font-medium">{tab.name}</span>
                    {activeTab === tab.id && (
                      <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Welcome Section */}
                <div className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 dark:from-blue-500/20 dark:via-purple-500/20 dark:to-pink-500/20 rounded-2xl"></div>
                  <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-8 rounded-2xl border border-white/20 dark:border-gray-700/20 shadow-xl transition-colors duration-300">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                        <User className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent mb-2">
                          Welcome back, {user?.name}! 👋
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 text-lg">Ready to ace your next interview?</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="group bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/20 hover:shadow-xl hover:scale-105 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg group-hover:rotate-12 transition-transform duration-300">
                          <Calendar className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Interviews</p>
                          <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                            {stats.totalInterviews}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Active</p>
                      </div>
                    </div>
                  </div>

                  <div className="group bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/20 hover:shadow-xl hover:scale-105 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl shadow-lg group-hover:rotate-12 transition-transform duration-300">
                          <Star className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Average Rating</p>
                          <p className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                            {stats.averageRating ? stats.averageRating.toFixed(1) : '0.0'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-3 h-3 ${i < Math.floor(user?.stats?.averageRating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300 dark:text-gray-600'}`} />
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Rating</p>
                      </div>
                    </div>
                  </div>

                  <div className="group bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/20 hover:shadow-xl hover:scale-105 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 min-w-0 flex-1">
                        <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl shadow-lg group-hover:rotate-12 transition-transform duration-300 flex-shrink-0">
                          <Users className="w-6 h-6 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Skill Level</p>
                          <p className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent capitalize truncate">
                            {user?.skillLevel}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">
                            {user?.skillLevel === 'beginner' ? 'B' : user?.skillLevel === 'intermediate' ? 'I' : user?.skillLevel === 'advanced' ? 'A' : 'E'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Level</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-blue-500/5 dark:from-purple-500/10 dark:via-pink-500/10 dark:to-blue-500/10 rounded-2xl"></div>
                  <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-8 rounded-2xl border border-white/20 dark:border-gray-700/20 shadow-xl transition-colors duration-300">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                        <Brain className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                        Quick Actions
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <button 
                        onClick={() => handleStartInterview('peer')}
                        className="group relative overflow-hidden p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border-2 border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-xl hover:scale-105 transition-all duration-300"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative text-center">
                          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:rotate-12 transition-transform duration-300">
                            <Users className="w-8 h-8 text-white" />
                          </div>
                          <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Start Peer Interview</h4>
                          <p className="text-gray-600 dark:text-gray-400 mb-4">Practice with another user</p>
                          <div className="inline-flex items-center space-x-2 text-blue-600 dark:text-blue-400 font-medium group-hover:text-blue-700 dark:group-hover:text-blue-300">
                            <span>Get Started</span>
                            <div className="w-4 h-4 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin group-hover:animate-none"></div>
                          </div>
                        </div>
                      </button>
                      
                      <button 
                        onClick={() => handleStartInterview('ai')}
                        className="group relative overflow-hidden p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border-2 border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-xl hover:scale-105 transition-all duration-300"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative text-center">
                          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:rotate-12 transition-transform duration-300">
                            <Brain className="w-8 h-8 text-white" />
                          </div>
                          <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Try AI Interviewer</h4>
                          <p className="text-gray-600 dark:text-gray-400 mb-4">Get interviewed by AI</p>
                          <div className="inline-flex items-center space-x-2 text-purple-600 dark:text-purple-400 font-medium group-hover:text-purple-700 dark:group-hover:text-purple-300">
                            <span>Start Now</span>
                            <div className="w-4 h-4 border-2 border-purple-600 dark:border-purple-400 border-t-transparent rounded-full animate-spin group-hover:animate-none"></div>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <EnhancedProfile />
            )}

                {activeTab === 'analysis' && (
                  <InterviewAnalysisDashboard />
                )}


            {activeTab === 'interviews' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 transition-colors duration-300">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Interview Sessions</h2>
                  <button
                    onClick={handleStartPeerInterview}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Schedule Interview</span>
                  </button>
                </div>
                
                <div className="space-y-4">
                  {/* Upcoming Interviews */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-2">Upcoming Interviews</h3>
                    <p className="text-blue-700 dark:text-blue-300 text-sm">No upcoming interviews scheduled</p>
                  </div>
                  
                  {/* Recent Interviews */}
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Recent Sessions</h3>
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No interviews yet</h4>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">Start your first peer interview to see your session history here.</p>
                      <button
                        onClick={handleStartPeerInterview}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Start Interview
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Role Selection Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-2xl p-8 w-full max-w-lg shadow-2xl border border-white/20 dark:border-gray-700/20 transition-colors duration-300">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent mb-2">
                Choose Your Role
              </h3>
              <p className="text-gray-600 dark:text-gray-400">Select how you'd like to participate in this peer interview</p>
            </div>
            
            <div className="space-y-4 mb-8">
              <button
                onClick={() => setSelectedRole('interviewer')}
                className={`w-full p-6 border-2 rounded-2xl text-left transition-all duration-200 group ${
                  selectedRole === 'interviewer'
                    ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 shadow-lg shadow-blue-500/25'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${
                    selectedRole === 'interviewer'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg'
                      : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30'
                  }`}>
                    <Users className={`w-6 h-6 ${
                      selectedRole === 'interviewer' ? 'text-white' : 'text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold text-lg ${
                      selectedRole === 'interviewer' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      Interviewer
                    </p>
                    <p className={`text-sm ${
                      selectedRole === 'interviewer' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      Ask questions and evaluate the candidate
                    </p>
                  </div>
                  {selectedRole === 'interviewer' && (
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>
              </button>
              
              <button
                onClick={() => setSelectedRole('interviewee')}
                className={`w-full p-6 border-2 rounded-2xl text-left transition-all duration-200 group ${
                  selectedRole === 'interviewee'
                    ? 'border-purple-500 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 shadow-lg shadow-purple-500/25'
                    : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${
                    selectedRole === 'interviewee'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg'
                      : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30'
                  }`}>
                    <User className={`w-6 h-6 ${
                      selectedRole === 'interviewee' ? 'text-white' : 'text-gray-600 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold text-lg ${
                      selectedRole === 'interviewee' ? 'text-purple-700 dark:text-purple-300' : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      Interviewee
                    </p>
                    <p className={`text-sm ${
                      selectedRole === 'interviewee' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      Answer questions and showcase your skills
                    </p>
                  </div>
                  {selectedRole === 'interviewee' && (
                    <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>
              </button>
            </div>
            
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedRole('');
                  setInterviewType('');
                }}
                className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleRoleSelection}
                disabled={!selectedRole}
                className={`px-8 py-3 rounded-xl font-semibold transition-all duration-200 ${
                  selectedRole
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg hover:shadow-xl hover:scale-105'
                    : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                Start Interview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Matchmaking Component */}
      {showMatchmaking && (
        <Matchmaking
          onMatchFound={handleMatchFound}
          onCancel={handleMatchmakingCancel}
          selectedRole={selectedRole}
        />
      )}

      {/* Matchmaking Loader intentionally disabled in favor of live socket matchmaking */}

    </div>
  );
};

export default Dashboard;
