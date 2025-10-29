import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useInterview } from '../contexts/InterviewContext';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Star, 
  Target, 
  Award,
  BookOpen,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Minus,
  Download,
  Filter,
  Search
} from 'lucide-react';
import axios from 'axios';

// Ensure axios has base URL and auth header
axios.defaults.baseURL = '/api';
const token = localStorage.getItem('token');
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

const InterviewAnalysisDashboard = () => {
  const { user } = useAuth();
  const { interviews, stats, insights, loading } = useInterview();
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Data is now managed by InterviewContext
  }, []);

  const handleViewAnalysis = (interview) => {
    setSelectedInterview(interview);
    setShowAnalysis(true);
  };

  const closeAnalysis = () => {
    setShowAnalysis(false);
    setSelectedInterview(null);
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

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'Improving': return <ArrowUp className="w-4 h-4 text-green-500" />;
      case 'Declining': return <ArrowDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const filteredInterviews = interviews.filter(interview => {
    const matchesFilter = filter === 'all' || 
      (filter === 'analyzed' && interview.hasAnalysis) ||
      (filter === 'pending' && !interview.hasAnalysis);
    
    const matchesSearch = !searchTerm || 
      interview.interviewType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      interview.status?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your interview insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Interview Analysis Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your interview performance and get insights to improve your skills
          </p>
        </div>

        {/* Insights Overview */}
        {insights && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Interviews</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stats.totalInterviews}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <Star className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Average Score</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stats.averageRating}/10
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Improvement Trend</p>
                  <div className="flex items-center space-x-2">
                    {getTrendIcon(stats.improvementTrend)}
                    <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {stats.improvementTrend}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                  <Award className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Recent Performance</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {stats.recentPerformance?.averageScore || 'N/A'}/10
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Strengths and Improvements */}
        {insights && (insights.strengths.length > 0 || insights.commonImprovements.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                Common Strengths
              </h3>
              <div className="space-y-3">
                {insights.strengths.slice(0, 5).map((strength, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-gray-700 dark:text-gray-300">{strength.strength}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {strength.frequency} times
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <AlertCircle className="w-5 h-5 text-orange-500 mr-2" />
                Common Improvements
              </h3>
              <div className="space-y-3">
                {insights.commonImprovements.slice(0, 5).map((improvement, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-gray-700 dark:text-gray-300">{improvement.improvement}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {improvement.frequency} times
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Interview History */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Interview History
              </h2>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search interviews..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Interviews</option>
                  <option value="analyzed">With Analysis</option>
                  <option value="pending">Pending Analysis</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Interview
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Partner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredInterviews.map((interview) => (
                  <tr key={interview._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            Peer Interview
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {interview.status}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                        {interview.interviewType || 'Technical'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {interview.interviewerId?._id === user._id 
                        ? interview.intervieweeId?.name || 'Unknown'
                        : interview.interviewerId?.name || 'Unknown'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(interview.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {interview.analysis ? (
                        <div className={`inline-flex px-2 py-1 text-sm font-semibold rounded-full ${getScoreBgColor(interview.analysis.overallScore)}`}>
                          <span className={getScoreColor(interview.analysis.overallScore)}>
                            {interview.analysis.overallScore}/10
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {interview.hasAnalysis ? (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                          Analyzed
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {interview.hasAnalysis ? (
                        <button
                          onClick={() => handleViewAnalysis(interview)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          View Analysis
                        </button>
                      ) : (
                        <span className="text-gray-400">No analysis available</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredInterviews.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No interviews found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm || filter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Start your first peer interview to see analysis here.'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Analysis Modal */}
      {showAnalysis && selectedInterview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Interview Analysis</h2>
                  <p className="text-blue-100 mt-1">
                    {selectedInterview.type} • {selectedInterview.partner} • {selectedInterview.date}
                  </p>
                </div>
                <button
                  onClick={closeAnalysis}
                  className="text-white hover:text-gray-200 transition-colors p-2 rounded-full hover:bg-white hover:bg-opacity-20"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Score Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 p-6 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-green-500 rounded-full">
                      <Star className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-green-600 dark:text-green-300 font-medium">Overall Score</p>
                      <p className="text-2xl font-bold text-green-700 dark:text-green-200">
                        {selectedInterview.score || '8.5'}/10
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 p-6 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-blue-500 rounded-full">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-blue-600 dark:text-blue-300 font-medium">Interview Type</p>
                      <p className="text-lg font-bold text-blue-700 dark:text-blue-200">
                        {selectedInterview.interviewType || 'Technical'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 p-6 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-purple-500 rounded-full">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-purple-600 dark:text-purple-300 font-medium">Status</p>
                      <p className="text-lg font-bold text-purple-700 dark:text-purple-200">
                        {selectedInterview.status || 'Completed'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Analysis */}
              <div className="mb-8">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">AI Analysis</h3>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Strengths */}
                    <div>
                      <h4 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-3 flex items-center">
                        <ArrowUp className="w-5 h-5 mr-2" />
                        Strengths
                      </h4>
                      <ul className="space-y-2">
                        {['Clear communication', 'Strong technical knowledge', 'Good problem-solving approach', 'Well-structured answers'].map((strength, index) => (
                          <li key={index} className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Areas for Improvement */}
                    <div>
                      <h4 className="text-lg font-semibold text-orange-600 dark:text-orange-400 mb-3 flex items-center">
                        <ArrowDown className="w-5 h-5 mr-2" />
                        Areas for Improvement
                      </h4>
                      <ul className="space-y-2">
                        {['Provide more specific examples', 'Ask clarifying questions', 'Explain trade-offs better', 'Include metrics in answers'].map((improvement, index) => (
                          <li key={index} className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            <span>{improvement}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Detailed Analysis */}
                  <div className="mt-6">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Detailed Analysis</h4>
                    <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border-l-4 border-blue-500">
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        The candidate demonstrated strong technical knowledge and clear communication skills throughout the interview. 
                        Their problem-solving approach was methodical and well-structured. However, they could benefit from providing 
                        more specific examples and metrics to support their answers. The candidate shows good potential and would 
                        benefit from practicing more system design questions and improving their ability to explain trade-offs.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Human Feedback */}
              <div className="mb-8">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Human Feedback</h3>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Technical Skills */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Technical Skills</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 dark:text-gray-300">Problem Solving</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                              <div className="bg-green-500 h-2 rounded-full" style={{width: '85%'}}></div>
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">8.5</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 dark:text-gray-300">Code Quality</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                              <div className="bg-blue-500 h-2 rounded-full" style={{width: '75%'}}></div>
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">7.5</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 dark:text-gray-300">System Design</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                              <div className="bg-yellow-500 h-2 rounded-full" style={{width: '70%'}}></div>
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">7.0</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Soft Skills */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Soft Skills</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 dark:text-gray-300">Communication</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                              <div className="bg-green-500 h-2 rounded-full" style={{width: '90%'}}></div>
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">9.0</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 dark:text-gray-300">Collaboration</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                              <div className="bg-blue-500 h-2 rounded-full" style={{width: '80%'}}></div>
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">8.0</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 dark:text-gray-300">Leadership</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                              <div className="bg-purple-500 h-2 rounded-full" style={{width: '75%'}}></div>
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">7.5</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Human Comments */}
                  <div className="mt-6">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Interviewer Comments</h4>
                    <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border-l-4 border-green-500">
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        "Great candidate with strong technical skills and excellent communication. Shows good potential for the role. 
                        Would recommend for the next round. Areas to improve include providing more specific examples and metrics."
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Recommendations</h3>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-3">Next Steps</h4>
                      <ul className="space-y-2">
                        {['Practice system design questions', 'Work on providing specific metrics', 'Improve trade-off explanations', 'Continue technical skill development'].map((step, index) => (
                          <li key={index} className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-purple-600 dark:text-purple-400 mb-3">Resources</h4>
                      <ul className="space-y-2">
                        {['System Design Interview Prep', 'Technical Interview Guide', 'Communication Skills Workshop', 'Leadership Development Program'].map((resource, index) => (
                          <li key={index} className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span>{resource}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 flex justify-end space-x-3">
              <button
                onClick={closeAnalysis}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {/* Download functionality */}}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Report</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewAnalysisDashboard;
