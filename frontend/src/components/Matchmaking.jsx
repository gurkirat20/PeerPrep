import { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { Users, Clock, X, Check, AlertCircle } from 'lucide-react';

const Matchmaking = ({ onMatchFound, onCancel, selectedRole }) => {
  const { queueStatus, matchFound, joinQueue, leaveQueue, acceptMatch, rejectMatch } = useSocket();
  const { user } = useAuth();
  const [preferences, setPreferences] = useState({
    role: selectedRole || '',
    skillLevel: user?.skillLevel || 'intermediate',
    interviewType: 'technical',
    duration: 30
  });
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinQueue = () => {
    if (!preferences.role) {
      alert('Please select a role');
      return;
    }
    
    setIsJoining(true);
    joinQueue(preferences);
  };

  const handleLeaveQueue = () => {
    leaveQueue();
    setIsJoining(false);
    onCancel();
  };

  const handleAcceptMatch = () => {
    acceptMatch();
    if (matchFound) {
      onMatchFound(matchFound);
    }
  };

  const handleRejectMatch = () => {
    rejectMatch();
  };

  // Auto-join queue when component mounts with preferences
  useEffect(() => {
    if (preferences.role && !queueStatus && !matchFound) {
      handleJoinQueue();
    }
  }, [preferences.role]);

  // Match found modal
  if (matchFound) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Match Found!</h3>
            <p className="text-gray-600 mb-2">
              We found a {matchFound.opponentRole} for your {preferences.role} role
            </p>
            
            {/* Compatibility Score */}
            <div className="flex items-center justify-center mb-4">
              <div className="bg-green-100 rounded-full px-3 py-1">
                <span className="text-green-800 font-semibold">
                  {matchFound.compatibilityScore?.toFixed(0) || 85}% Match
                </span>
              </div>
            </div>
            
            {/* Match Reasons */}
            {matchFound.matchReasons && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Why this is a good match:</p>
                <div className="flex flex-wrap gap-2">
                  {matchFound.matchReasons.map((reason, index) => (
                    <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      {reason}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Interview Type:</span>
                <span className="text-sm font-medium capitalize">{matchFound.interviewType}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Duration:</span>
                <span className="text-sm font-medium">{matchFound.duration} minutes</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Skill Level:</span>
                <span className="text-sm font-medium capitalize">{matchFound.skillLevel}</span>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleRejectMatch}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
              >
                <X className="w-4 h-4" />
                <span>Reject</span>
              </button>
              <button
                onClick={handleAcceptMatch}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Check className="w-4 h-4" />
                <span>Accept</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Queue status
  if (queueStatus) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-blue-600 animate-pulse" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Finding a Match</h3>
            <p className="text-gray-600 mb-4">
              Looking for a {queueStatus.oppositeRole} to match with your {preferences.role} role
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Position in queue:</span>
                <span className="text-sm font-medium">{queueStatus.position}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Estimated wait:</span>
                <span className="text-sm font-medium">{queueStatus.estimatedWaitTime} min</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">People in queue:</span>
                <span className="text-sm font-medium">{queueStatus.totalInQueue}</span>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleLeaveQueue}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Initial preferences setup
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Interview Preferences</h3>
        
        <div className="space-y-4 mb-6">
          {/* Interview Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Interview Type
            </label>
            <select
              value={preferences.interviewType}
              onChange={(e) => setPreferences({...preferences, interviewType: e.target.value})}
              className="block w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="technical">Technical</option>
              <option value="behavioral">Behavioral</option>
              <option value="system-design">System Design</option>
              <option value="coding">Coding</option>
              <option value="general">General</option>
            </select>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration (minutes)
            </label>
            <select
              value={preferences.duration}
              onChange={(e) => setPreferences({...preferences, duration: parseInt(e.target.value)})}
              className="block w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
          </div>

          {/* Skill Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Skill Level
            </label>
            <select
              value={preferences.skillLevel}
              onChange={(e) => setPreferences({...preferences, skillLevel: e.target.value})}
              className="block w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleJoinQueue}
            disabled={!preferences.role}
            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Find Match
          </button>
        </div>
      </div>
    </div>
  );
};

export default Matchmaking;
