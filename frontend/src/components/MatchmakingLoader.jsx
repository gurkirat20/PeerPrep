import React, { useState, useEffect } from 'react';
import { Users, Search, Clock, CheckCircle, AlertCircle, Bot } from 'lucide-react';

const MatchmakingLoader = ({ onCancel, preferences, onNoMatch }) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Searching for matches...');
  const [currentStep, setCurrentStep] = useState(0);
  const [showNoMatch, setShowNoMatch] = useState(false);

  const steps = [
    { text: 'Analyzing your profile...', duration: 2000 },
    { text: 'Finding compatible candidates...', duration: 3000 },
    { text: 'Evaluating skill levels...', duration: 2500 },
    { text: 'Matching interview preferences...', duration: 2000 },
    { text: 'Finalizing match...', duration: 1500 }
  ];

  useEffect(() => {
    let currentProgress = 0;
    let currentStepIndex = 0;
    
    const progressInterval = setInterval(() => {
      currentProgress += Math.random() * 8 + 2; // Random progress between 2-10%
      
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(progressInterval);
        
        // Simulate no match found (70% chance for demo purposes)
        const hasMatch = Math.random() > 0.7;
        
        if (hasMatch) {
          setStatus('Match found! Preparing interview room...');
          setTimeout(() => {
            console.log('Match found! Launching interview room...');
            // Simulate successful match
          }, 2000);
        } else {
          setStatus('No matches found at this time...');
          setTimeout(() => {
            setShowNoMatch(true);
          }, 1500);
        }
        return;
      }

      // Update step based on progress
      const stepProgress = 100 / steps.length;
      const newStepIndex = Math.floor(currentProgress / stepProgress);
      if (newStepIndex !== currentStepIndex && newStepIndex < steps.length) {
        currentStepIndex = newStepIndex;
        setCurrentStep(currentStepIndex);
        setStatus(steps[currentStepIndex].text);
      }

      setProgress(currentProgress);
    }, 300);

    return () => clearInterval(progressInterval);
  }, []);

  const handleTryAIInterviewer = () => {
    onNoMatch && onNoMatch('ai');
  };

  const handleRetryMatchmaking = () => {
    setShowNoMatch(false);
    setProgress(0);
    setCurrentStep(0);
    setStatus('Searching for matches...');
    // Restart the matching process
    window.location.reload(); // Simple restart for demo
  };

  if (showNoMatch) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              No Matches Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              We couldn't find a suitable interview partner at this time.
            </p>
          </div>

          {/* Content */}
          <div className="space-y-6">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                What you can do:
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Try our AI Interviewer for instant practice</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Check back later for peer interviews</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Update your profile to attract more matches</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {preferences?.role === 'interviewee' && (
                <button
                  onClick={handleTryAIInterviewer}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <Bot className="w-5 h-5" />
                  <span>Try AI Interviewer</span>
                </button>
              )}
              
              <button
                onClick={handleRetryMatchmaking}
                className="w-full px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Try Again
              </button>
              
              <button
                onClick={onCancel}
                className="w-full px-6 py-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              💡 Tip: AI Interviewer is always available and provides instant feedback!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Finding Your Match
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            We're searching for the perfect interview partner...
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {status}
            </span>
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3 mb-8">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                index <= currentStep
                  ? 'bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                index < currentStep
                  ? 'bg-green-500 text-white'
                  : index === currentStep
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500'
              }`}>
                {index < currentStep ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <span className="text-xs font-bold">{index + 1}</span>
                )}
              </div>
              <span className="text-sm font-medium">{step.text}</span>
            </div>
          ))}
        </div>

        {/* Cancel Button */}
        <div className="flex justify-center">
          <button
            onClick={onCancel}
            className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel Search
          </button>
        </div>

        {/* Fun Facts */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            💡 Tip: The more detailed your profile, the better matches we can find!
          </p>
        </div>
      </div>
    </div>
  );
};

export default MatchmakingLoader;
