import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Brain, 
  User, 
  Star, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle, 
  AlertCircle, 
  Target, 
  MessageSquare, 
  BarChart3, 
  Award, 
  Clock, 
  Users, 
  Download, 
  X,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  FileText,
  Zap
} from 'lucide-react';
import axios from 'axios';
import HumanFeedbackForm from './HumanFeedbackForm';

// Configure axios
axios.defaults.baseURL = '/api';
const token = localStorage.getItem('token');
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

const ComprehensiveAnalysisView = ({ interviewId, onClose }) => {
  const { user } = useAuth();
  const [interview, setInterview] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [humanFeedback, setHumanFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchInterviewData();
  }, [interviewId]);

  const fetchInterviewData = async () => {
    try {
      setLoading(true);
      
      // Fetch interview details
      const interviewResponse = await axios.get(`/interviews/${interviewId}`);
      setInterview(interviewResponse.data.interview);

      // Fetch AI analysis
      try {
        const aiResponse = await axios.get(`/peer-analysis/${interviewId}`);
        setAiAnalysis(aiResponse.data.analysis);
      } catch (aiError) {
        console.log('No AI analysis available yet');
      }

      // Fetch human feedback
      try {
        const feedbackResponse = await axios.get(`/interviews/${interviewId}/feedback`);
        setHumanFeedback(feedbackResponse.data.feedback);
      } catch (feedbackError) {
        console.log('No human feedback available yet');
      }

    } catch (error) {
      console.error('Error fetching interview data:', error);
      setError('Failed to load interview data');
    } finally {
      setLoading(false);
    }
  };

  const handleFeedbackSubmit = (feedbackData) => {
    setHumanFeedback(feedbackData);
    setShowFeedbackForm(false);
    // Refresh the interview data
    fetchInterviewData();
  };

  const getScoreColor = (score) => {
    if (score >= 8) return 'text-green-500';
    if (score >= 6) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBgColor = (score) => {
    if (score >= 8) return 'bg-green-100 dark:bg-green-900/20';
    if (score >= 6) return 'bg-yellow-100 dark:bg-yellow-900/20';
    return 'bg-red-100 dark:bg-red-900/20';
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Overall Performance Comparison */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
          Overall Performance Comparison
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* AI Analysis */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <Brain className="w-5 h-5 text-purple-500 mr-2" />
              <h4 className="font-medium text-gray-900 dark:text-gray-100">AI Analysis</h4>
            </div>
            {aiAnalysis ? (
              <div>
                <div className={`inline-flex px-3 py-1 text-lg font-bold rounded-full ${getScoreBgColor(aiAnalysis.overallScore)} mb-3`}>
                  <span className={getScoreColor(aiAnalysis.overallScore)}>
                    {aiAnalysis.overallScore}/10
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {aiAnalysis.summary || 'AI-generated analysis based on conversation patterns and technical content.'}
                </p>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Analyzed on {new Date(aiAnalysis.analyzedAt).toLocaleDateString()}
                </div>
              </div>
            ) : (
              <div className="text-gray-500 dark:text-gray-400 text-sm">
                AI analysis not available yet
              </div>
            )}
          </div>

          {/* Human Feedback */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <User className="w-5 h-5 text-blue-500 mr-2" />
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Human Feedback</h4>
            </div>
            {humanFeedback ? (
              <div>
                <div className={`inline-flex px-3 py-1 text-lg font-bold rounded-full ${getScoreBgColor(humanFeedback.overallRating)} mb-3`}>
                  <span className={getScoreColor(humanFeedback.overallRating)}>
                    {humanFeedback.overallRating}/5
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {humanFeedback.overallComments || 'Human interviewer feedback based on direct observation.'}
                </p>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Submitted on {new Date(humanFeedback.submittedAt).toLocaleDateString()}
                </div>
              </div>
            ) : (
              <div className="text-gray-500 dark:text-gray-400 text-sm">
                <p className="mb-2">Human feedback not available yet</p>
                <button
                  onClick={() => setShowFeedbackForm(true)}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                >
                  Provide Feedback
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
          Key Insights
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* AI Insights */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
              <Brain className="w-4 h-4 text-purple-500 mr-2" />
              AI-Generated Insights
            </h4>
            {aiAnalysis ? (
              <div className="space-y-2">
                {aiAnalysis.recommendations?.general?.slice(0, 3).map((rec, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{rec}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No AI insights available</p>
            )}
          </div>

          {/* Human Insights */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
              <User className="w-4 h-4 text-blue-500 mr-2" />
              Human Insights
            </h4>
            {humanFeedback ? (
              <div className="space-y-2">
                {humanFeedback.recommendations && (
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    {humanFeedback.recommendations}
                  </div>
                )}
                {humanFeedback.nextSteps && (
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Next Steps:</strong> {humanFeedback.nextSteps}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No human insights available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderDetailedTab = () => (
    <div className="space-y-6">
      {/* AI Detailed Analysis */}
      {aiAnalysis && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <Brain className="w-5 h-5 mr-2 text-purple-500" />
            AI Detailed Analysis
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Interviewee Analysis */}
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Interviewee Performance</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Technical Knowledge</span>
                    <span>{aiAnalysis.intervieweeAnalysis?.technicalKnowledge || 'N/A'}/10</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{width: `${(aiAnalysis.intervieweeAnalysis?.technicalKnowledge || 0) * 10}%`}}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Communication</span>
                    <span>{aiAnalysis.intervieweeAnalysis?.communication || 'N/A'}/10</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{width: `${(aiAnalysis.intervieweeAnalysis?.communication || 0) * 10}%`}}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Problem Solving</span>
                    <span>{aiAnalysis.intervieweeAnalysis?.problemSolving || 'N/A'}/10</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-purple-500 h-2 rounded-full" 
                      style={{width: `${(aiAnalysis.intervieweeAnalysis?.problemSolving || 0) * 10}%`}}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Interviewer Analysis */}
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Interviewer Performance</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Question Quality</span>
                    <span>{aiAnalysis.interviewerAnalysis?.questionQuality || 'N/A'}/10</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-orange-500 h-2 rounded-full" 
                      style={{width: `${(aiAnalysis.interviewerAnalysis?.questionQuality || 0) * 10}%`}}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Communication</span>
                    <span>{aiAnalysis.interviewerAnalysis?.communication || 'N/A'}/10</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{width: `${(aiAnalysis.interviewerAnalysis?.communication || 0) * 10}%`}}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Professionalism</span>
                    <span>{aiAnalysis.interviewerAnalysis?.professionalism || 'N/A'}/10</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{width: `${(aiAnalysis.interviewerAnalysis?.professionalism || 0) * 10}%`}}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Human Detailed Feedback */}
      {humanFeedback && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2 text-blue-500" />
            Human Detailed Feedback
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Technical Skills */}
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Technical Skills</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Technical Knowledge</span>
                    <span>{humanFeedback.technicalKnowledge || 'N/A'}/5</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{width: `${(humanFeedback.technicalKnowledge || 0) * 20}%`}}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Problem Solving</span>
                    <span>{humanFeedback.problemSolving || 'N/A'}/5</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-purple-500 h-2 rounded-full" 
                      style={{width: `${(humanFeedback.problemSolving || 0) * 20}%`}}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Code Quality</span>
                    <span>{humanFeedback.codeQuality || 'N/A'}/5</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{width: `${(humanFeedback.codeQuality || 0) * 20}%`}}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Communication Skills */}
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Communication Skills</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Communication</span>
                    <span>{humanFeedback.communication || 'N/A'}/5</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{width: `${(humanFeedback.communication || 0) * 20}%`}}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Clarity</span>
                    <span>{humanFeedback.clarity || 'N/A'}/5</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{width: `${(humanFeedback.clarity || 0) * 20}%`}}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Confidence</span>
                    <span>{humanFeedback.confidence || 'N/A'}/5</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-orange-500 h-2 rounded-full" 
                      style={{width: `${(humanFeedback.confidence || 0) * 20}%`}}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderRecommendationsTab = () => (
    <div className="space-y-6">
      {/* AI Recommendations */}
      {aiAnalysis && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <Brain className="w-5 h-5 mr-2 text-purple-500" />
            AI Recommendations
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">For Interviewee</h4>
              <div className="space-y-2">
                {aiAnalysis.recommendations?.interviewee?.map((rec, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <Target className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">For Interviewer</h4>
              <div className="space-y-2">
                {aiAnalysis.recommendations?.interviewer?.map((rec, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <Target className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Human Recommendations */}
      {humanFeedback && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2 text-blue-500" />
            Human Recommendations
          </h3>
          
          <div className="space-y-4">
            {humanFeedback.strengths && humanFeedback.strengths.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2 flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Strengths
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {humanFeedback.strengths.map((strength, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{strength}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {humanFeedback.improvements && humanFeedback.improvements.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2 flex items-center">
                  <AlertCircle className="w-4 h-4 text-orange-500 mr-2" />
                  Areas for Improvement
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {humanFeedback.improvements.map((improvement, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <AlertCircle className="w-3 h-3 text-orange-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{improvement}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Error</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 dark:bg-gray-700 p-6 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Comprehensive Interview Analysis
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                AI + Human Feedback Analysis
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
          <div className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'detailed', label: 'Detailed Analysis', icon: FileText },
              { id: 'recommendations', label: 'Recommendations', icon: Target }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-2 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'detailed' && renderDetailedTab()}
          {activeTab === 'recommendations' && renderRecommendationsTab()}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-700 p-6 border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Analysis includes both AI-generated insights and human interviewer feedback
            </div>
            <div className="flex space-x-2">
              <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span>Export Report</span>
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Human Feedback Form Modal */}
      {showFeedbackForm && (
        <HumanFeedbackForm
          interviewSession={interview}
          interviewee={interview?.intervieweeId}
          onFeedbackSubmit={handleFeedbackSubmit}
          onClose={() => setShowFeedbackForm(false)}
          isVisible={showFeedbackForm}
        />
      )}
    </div>
  );
};

export default ComprehensiveAnalysisView;
