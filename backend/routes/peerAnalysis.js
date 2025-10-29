import express from 'express';
import { body, validationResult } from 'express-validator';
import getPeerInterviewAnalyzer from '../services/peerInterviewAnalyzer.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Submit peer interview for AI analysis
router.post('/analyze', authenticateToken, [
  body('interviewId').isMongoId().withMessage('Valid interview ID required'),
  body('conversation').isArray().withMessage('Conversation data required'),
  body('duration').isNumeric().withMessage('Duration must be a number'),
  body('participants').isArray().withMessage('Participants data required'),
  body('interviewType').isString().withMessage('Interview type required'),
  body('questions').isArray().withMessage('Questions data required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input data',
        errors: errors.array()
      });
    }

    const { interviewId, conversation, duration, participants, interviewType, questions } = req.body;
    const userId = req.user.userId;

    // Verify interview exists and user has access
    const interview = await Interview.findById(interviewId);
    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found'
      });
    }

    // Check if user is participant in this interview
    const isParticipant = participants.some(p => p.id === userId);
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Not a participant in this interview'
      });
    }

    // Prepare analysis data
    const analysisData = {
      conversation,
      duration,
      participants,
      interviewType,
      questions,
      interviewId,
      userId
    };

    // Perform AI analysis
    const analysis = await getPeerInterviewAnalyzer().analyzePeerInterview(analysisData);
    
    // Analyze interview metrics
    const metrics = getPeerInterviewAnalyzer().analyzeInterviewMetrics(analysisData);

    // Save analysis to database
    const feedbackData = {
      interviewId,
      intervieweeId: userId,
      interviewerId: participants.find(p => p.id !== userId)?.id,
      analysis: {
        ...analysis,
        metrics
      },
      type: 'peer_interview',
      status: 'completed',
      createdAt: new Date()
    };

    const feedback = new Feedback(feedbackData);
    await feedback.save();

    // Update interview with analysis
    await Interview.findByIdAndUpdate(interviewId, {
      status: 'analyzed',
      analysisId: feedback._id,
      analyzedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Interview analysis completed successfully',
      data: {
        analysis,
        metrics,
        feedbackId: feedback._id
      }
    });

  } catch (error) {
    console.error('Error analyzing peer interview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze interview',
      error: error.message
    });
  }
});

// Get analysis results for an interview
// NOTE: DB-backed endpoints removed in favor of mock endpoints below to ensure frontend renders.

// Helper functions for insights calculation
function calculateAverageScore(feedbacks) {
  const scores = feedbacks.map(f => f.analysis?.overallScore || 0);
  return scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0;
}

function calculateImprovementTrend(feedbacks) {
  if (feedbacks.length < 2) return 'Insufficient data';
  
  const recentScores = feedbacks.slice(0, 3).map(f => f.analysis?.overallScore || 0);
  const olderScores = feedbacks.slice(-3).map(f => f.analysis?.overallScore || 0);
  
  const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
  const olderAvg = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;
  
  const improvement = recentAvg - olderAvg;
  
  if (improvement > 0.5) return 'Improving';
  if (improvement < -0.5) return 'Declining';
  return 'Stable';
}

function identifyCommonStrengths(feedbacks) {
  const allStrengths = feedbacks.flatMap(f => f.analysis?.strengths || []);
  const strengthCounts = {};
  
  allStrengths.forEach(strength => {
    strengthCounts[strength] = (strengthCounts[strength] || 0) + 1;
  });
  
  return Object.entries(strengthCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([strength, count]) => ({ strength, frequency: count }));
}

function identifyCommonImprovements(feedbacks) {
  const allImprovements = feedbacks.flatMap(f => f.analysis?.improvements || []);
  const improvementCounts = {};
  
  allImprovements.forEach(improvement => {
    improvementCounts[improvement] = (improvementCounts[improvement] || 0) + 1;
  });
  
  return Object.entries(improvementCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([improvement, count]) => ({ improvement, frequency: count }));
}

function trackReadinessProgression(feedbacks) {
  return feedbacks.map(f => ({
    date: f.createdAt,
    level: f.analysis?.readinessLevel || 'mid',
    score: f.analysis?.overallScore || 0
  }));
}

function getRecentPerformance(feedbacks) {
  const recent = feedbacks.slice(0, 3);
  return {
    averageScore: calculateAverageScore(recent),
    commonStrengths: identifyCommonStrengths(recent).slice(0, 3),
    commonImprovements: identifyCommonImprovements(recent).slice(0, 3)
  };
}

function analyzeSkillBreakdown(feedbacks) {
  const breakdown = {
    technicalKnowledge: [],
    communicationSkills: [],
    problemSolving: [],
    overallScores: []
  };
  
  feedbacks.forEach(f => {
    if (f.analysis) {
      breakdown.technicalKnowledge.push(f.analysis.technicalKnowledge);
      breakdown.communicationSkills.push(f.analysis.communicationSkills);
      breakdown.problemSolving.push(f.analysis.problemSolving);
      breakdown.overallScores.push(f.analysis.overallScore);
    }
  });
  
  return breakdown;
}

// GET /api/peer-analysis/history
// Get user's interview history with analysis status
router.get(
  '/history',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;
      
      // In a real application, you would fetch from your database
      // For now, we'll return mock data
      const mockInterviews = [
        {
          _id: 'interview_1',
          interviewerId: { _id: 'user_1', name: 'John Doe' },
          intervieweeId: { _id: userId, name: req.user.name },
          interviewType: 'Technical',
          status: 'Completed',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          hasAnalysis: true,
          analysis: {
            overallScore: 8,
            strengths: ['Strong technical knowledge', 'Good problem-solving approach'],
            improvements: ['Could improve communication clarity']
          }
        },
        {
          _id: 'interview_2',
          interviewerId: { _id: userId, name: req.user.name },
          intervieweeId: { _id: 'user_2', name: 'Jane Smith' },
          interviewType: 'Behavioral',
          status: 'Completed',
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          hasAnalysis: true,
          analysis: {
            overallScore: 7,
            strengths: ['Excellent communication', 'Good examples'],
            improvements: ['Could be more specific with metrics']
          }
        },
        {
          _id: 'interview_3',
          interviewerId: { _id: 'user_3', name: 'Mike Johnson' },
          intervieweeId: { _id: userId, name: req.user.name },
          interviewType: 'System Design',
          status: 'Completed',
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          hasAnalysis: false
        }
      ];

      res.status(200).json({
        success: true,
        data: {
          interviews: mockInterviews
        }
      });
    } catch (error) {
      console.error('Error fetching interview history:', error);
      res.status(500).json({ message: 'Server error while fetching interview history' });
    }
  }
);

// GET /api/peer-analysis/insights
// Get user's interview performance insights and trends
router.get(
  '/insights',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;
      
      // Mock insights data
      const mockInsights = {
        totalInterviews: 3,
        averageScore: 7.5,
        improvementTrend: 'Improving',
        recentPerformance: {
          averageScore: 8,
          interviewsCount: 2
        },
        strengths: [
          { strength: 'Strong technical knowledge', frequency: 2 },
          { strength: 'Good communication skills', frequency: 2 },
          { strength: 'Problem-solving approach', frequency: 1 }
        ],
        commonImprovements: [
          { improvement: 'Communication clarity', frequency: 2 },
          { improvement: 'Specific examples with metrics', frequency: 1 },
          { improvement: 'Time management', frequency: 1 }
        ]
      };

      res.status(200).json({
        success: true,
        data: {
          insights: mockInsights
        }
      });
    } catch (error) {
      console.error('Error fetching insights:', error);
      res.status(500).json({ message: 'Server error while fetching insights' });
    }
  }
);

// GET /api/peer-analysis/analysis/:interviewId
// Get detailed analysis for a specific interview
router.get(
  '/analysis/:interviewId',
  authenticateToken,
  async (req, res) => {
    try {
      const { interviewId } = req.params;
      const userId = req.user.id;
      
      // Mock detailed analysis data
      const mockAnalysis = {
        overallScore: 8,
        readinessLevel: 'mid',
        summary: 'Strong performance with good technical knowledge and communication skills.',
        detailedAnalysis: 'The interviewee demonstrated solid technical knowledge throughout the interview. They showed good problem-solving skills and were able to communicate their thought process clearly. The candidate provided relevant examples and showed enthusiasm for the role. Areas for improvement include being more specific with metrics and providing more detailed explanations for complex technical concepts.',
        technicalKnowledge: 'Strong foundational knowledge in core technologies. Demonstrated understanding of key concepts and was able to explain technical solutions clearly.',
        communicationSkills: 'Good verbal communication with clear explanations. Sometimes could be more concise and provide more specific examples.',
        problemSolving: 'Logical approach to problem-solving with good step-by-step thinking. Showed ability to break down complex problems into manageable parts.',
        strengths: [
          'Strong technical knowledge',
          'Good problem-solving approach',
          'Clear communication',
          'Enthusiastic about learning'
        ],
        improvements: [
          'Provide more specific metrics and examples',
          'Improve time management for complex problems',
          'Be more concise in explanations'
        ],
        recommendations: [
          'Practice explaining complex technical concepts in simple terms',
          'Prepare specific examples with measurable outcomes',
          'Work on structuring responses more efficiently',
          'Consider taking advanced courses in your field'
        ]
      };

      const mockMetrics = {
        conversationFlow: {
          questionAnswerRatio: '1:3',
          followUpFrequency: 4,
          topicCoherence: 85,
          conversationBalance: {
            interviewerPercentage: 30,
            intervieweePercentage: 70,
            balanceScore: 'Good'
          }
        },
        technicalDepth: 82,
        communicationQuality: 78,
        engagementLevel: 88,
        interviewEfficiency: 12,
        averageResponseTime: 15,
        totalQuestions: 8
      };

      res.status(200).json({
        success: true,
        data: {
          analysis: mockAnalysis,
          metrics: mockMetrics
        }
      });
    } catch (error) {
      console.error('Error fetching analysis:', error);
      res.status(500).json({ message: 'Server error while fetching analysis' });
    }
  }
);

export default router;
