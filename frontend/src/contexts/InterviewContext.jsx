import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const InterviewContext = createContext();

// Configure axios defaults
axios.defaults.baseURL = '/api';
const token = localStorage.getItem('token');
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

export const useInterview = () => {
  const context = useContext(InterviewContext);
  if (!context) {
    throw new Error('useInterview must be used within an InterviewProvider');
  }
  return context;
};

export const InterviewProvider = ({ children }) => {
  const [interviews, setInterviews] = useState([]);
  const [stats, setStats] = useState({
    totalInterviews: 0,
    averageRating: 0,
    improvementTrend: 'Stable',
    recentPerformance: { averageScore: 0, interviewsCount: 0 }
  });
  const [insights, setInsights] = useState({
    strengths: [],
    commonImprovements: []
  });
  const [loading, setLoading] = useState(false);

  // Mock data for demonstration
  const mockInterviews = [
    {
      _id: 'mock_1',
      interviewerId: { _id: 'u1', name: 'Alex' },
      intervieweeId: { _id: 'u2', name: 'Test User' },
      interviewType: 'Technical',
      status: 'Completed',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      hasAnalysis: true,
      analysis: { overallScore: 8 },
      feedback: {
        overallRating: 4,
        technicalKnowledge: 4,
        communication: 5,
        problemSolving: 4,
        strengths: ['Clear communication', 'Good technical foundation'],
        improvements: ['Provide more examples', 'Explain thought process better'],
        recommendations: 'Continue practicing technical questions'
      }
    },
    {
      _id: 'mock_2',
      interviewerId: { _id: 'u2', name: 'Test User' },
      intervieweeId: { _id: 'u3', name: 'Taylor' },
      interviewType: 'Behavioral',
      status: 'Completed',
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      hasAnalysis: true,
      analysis: { overallScore: 7 },
      feedback: {
        overallRating: 3,
        technicalKnowledge: 3,
        communication: 4,
        problemSolving: 3,
        strengths: ['Good problem-solving approach'],
        improvements: ['Provide more specific examples', 'Work on technical depth'],
        recommendations: 'Practice explaining complex concepts'
      }
    }
  ];

  const mockStats = {
    totalInterviews: 2,
    averageRating: 3.5,
    improvementTrend: 'Improving',
    recentPerformance: { averageScore: 7.5, interviewsCount: 2 }
  };

  const mockInsights = {
    strengths: [
      { strength: 'Clear communication', frequency: 2 },
      { strength: 'Problem-solving', frequency: 1 }
    ],
    commonImprovements: [
      { improvement: 'Provide more specific examples', frequency: 2 },
      { improvement: 'Explain thought process better', frequency: 1 }
    ]
  };

  // Initialize with mock data
  useEffect(() => {
    setInterviews(mockInterviews);
    setStats(mockStats);
    setInsights(mockInsights);
  }, []);

  const fetchInterviews = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/peer-analysis/history');
      if (response.data.success) {
        setInterviews(response.data.data.interviews);
      }
    } catch (error) {
      console.error('Error fetching interviews:', error);
      // Keep mock data on error
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/dashboard/summary');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Keep mock data on error
    }
  };

  const fetchInsights = async () => {
    try {
      const response = await axios.get('/api/peer-analysis/insights');
      if (response.data.success) {
        setInsights(response.data.data.insights);
      }
    } catch (error) {
      console.error('Error fetching insights:', error);
      // Keep mock data on error
    }
  };

  const addInterview = (interviewData) => {
    const newInterview = {
      _id: `interview_${Date.now()}`,
      ...interviewData,
      createdAt: new Date(),
      hasAnalysis: false,
      analysis: null,
      feedback: null
    };
    
    setInterviews(prev => [newInterview, ...prev]);
    
    // Update stats
    setStats(prev => ({
      ...prev,
      totalInterviews: prev.totalInterviews + 1
    }));
  };

  const updateInterviewAnalysis = (interviewId, analysis) => {
    setInterviews(prev => 
      prev.map(interview => 
        interview._id === interviewId 
          ? { ...interview, hasAnalysis: true, analysis }
          : interview
      )
    );

    // Recalculate stats
    const updatedInterviews = interviews.map(interview => 
      interview._id === interviewId 
        ? { ...interview, hasAnalysis: true, analysis }
        : interview
    );

    const analyzedInterviews = updatedInterviews.filter(i => i.hasAnalysis && i.analysis);
    if (analyzedInterviews.length > 0) {
      const avgScore = analyzedInterviews.reduce((sum, i) => sum + i.analysis.overallScore, 0) / analyzedInterviews.length;
      setStats(prev => ({
        ...prev,
        averageRating: avgScore,
        recentPerformance: { 
          averageScore: avgScore, 
          interviewsCount: analyzedInterviews.length 
        }
      }));
    }
  };

  const updateInterviewFeedback = (interviewId, feedback) => {
    setInterviews(prev => 
      prev.map(interview => 
        interview._id === interviewId 
          ? { ...interview, feedback }
          : interview
      )
    );
  };

  const simulateMockInterview = () => {
    const mockInterview = {
      _id: `mock_${Date.now()}`,
      interviewerId: { _id: 'u1', name: 'AI Agent' },
      intervieweeId: { _id: 'u2', name: 'Test User' },
      interviewType: 'Technical',
      status: 'Completed',
      createdAt: new Date(),
      hasAnalysis: true,
      analysis: { overallScore: Math.floor(Math.random() * 3) + 7 }, // 7-9 range
      feedback: {
        overallRating: Math.floor(Math.random() * 2) + 4, // 4-5 range
        technicalKnowledge: Math.floor(Math.random() * 2) + 4,
        communication: Math.floor(Math.random() * 2) + 4,
        problemSolving: Math.floor(Math.random() * 2) + 4,
        strengths: ['Good technical knowledge', 'Clear communication'],
        improvements: ['Provide more examples', 'Work on system design'],
        recommendations: 'Continue practicing mock interviews'
      }
    };

    addInterview(mockInterview);
    
    // Simulate analysis after a delay
    setTimeout(() => {
      updateInterviewAnalysis(mockInterview._id, mockInterview.analysis);
    }, 1000);
  };

  const value = {
    interviews,
    stats,
    insights,
    loading,
    fetchInterviews,
    fetchStats,
    fetchInsights,
    addInterview,
    updateInterviewAnalysis,
    updateInterviewFeedback,
    simulateMockInterview
  };

  return (
    <InterviewContext.Provider value={value}>
      {children}
    </InterviewContext.Provider>
  );
};
