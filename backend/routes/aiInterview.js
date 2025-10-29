import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import getAIInterviewerService from '../services/aiInterviewer.js';

const router = express.Router();

/**
 * @route   POST /api/ai-interview/start
 * @desc    Start a new AI interview session
 * @access  Private
 */
router.post('/start', authenticateToken, [
  body('preferences.interviewType').isIn(['technical', 'behavioral', 'system_design', 'mixed']),
  body('preferences.duration').isInt({ min: 15, max: 120 }),
  body('preferences.difficulty').isIn(['easy', 'medium', 'hard']),
  body('preferences.domains').optional().isArray(),
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

    const { preferences } = req.body;
    const userProfile = req.user;

    // Start AI interview session
    const result = await getAIInterviewerService().startInterview(userProfile, preferences);

    res.status(200).json({
      success: true,
      message: 'AI interview session started successfully',
      data: {
        sessionId: result.sessionId,
        question: result.question,
        session: result.session
      }
    });

  } catch (error) {
    console.error('Error starting AI interview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start AI interview session',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/ai-interview/:sessionId/question
 * @desc    Get next question from AI interviewer
 * @access  Private
 */
router.post('/:sessionId/question', authenticateToken, [
  body('questionType').optional().isIn(['opening', 'follow_up', 'technical', 'behavioral', 'system_design', 'closing'])
], async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { questionType = 'follow_up' } = req.body;

    // Verify session ownership
    const session = getAIInterviewerService().getSession(sessionId);
    if (!session || session.userId !== req.user._id) {
      return res.status(404).json({
        success: false,
        message: 'Interview session not found'
      });
    }

    // Generate next question
    const question = await getAIInterviewerService().generateQuestion(sessionId, questionType);

    res.status(200).json({
      success: true,
      message: 'Question generated successfully',
      data: {
        question,
        session: session
      }
    });

  } catch (error) {
    console.error('Error generating question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate question',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/ai-interview/:sessionId/answer
 * @desc    Submit answer and get AI analysis
 * @access  Private
 */
router.post('/:sessionId/answer', authenticateToken, [
  body('answer').isString().isLength({ min: 1, max: 2000 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid answer data',
        errors: errors.array()
      });
    }

    const { sessionId } = req.params;
    const { answer } = req.body;

    // Verify session ownership
    const session = getAIInterviewerService().getSession(sessionId);
    if (!session || session.userId !== req.user._id) {
      return res.status(404).json({
        success: false,
        message: 'Interview session not found'
      });
    }

    // Process answer and get analysis
    const result = await getAIInterviewerService().processAnswer(sessionId, answer);

    res.status(200).json({
      success: true,
      message: 'Answer processed successfully',
      data: result
    });

  } catch (error) {
    console.error('Error processing answer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process answer',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/ai-interview/:sessionId
 * @desc    Get interview session details
 * @access  Private
 */
router.get('/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = getAIInterviewerService().getSession(sessionId);
    if (!session || session.userId !== req.user._id) {
      return res.status(404).json({
        success: false,
        message: 'Interview session not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Session retrieved successfully',
      data: {
        session
      }
    });

  } catch (error) {
    console.error('Error retrieving session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve session',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/ai-interview/:sessionId/end
 * @desc    End interview session and get final feedback
 * @access  Private
 */
router.post('/:sessionId/end', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Verify session ownership
    const session = getAIInterviewerService().getSession(sessionId);
    if (!session || session.userId !== req.user._id) {
      return res.status(404).json({
        success: false,
        message: 'Interview session not found'
      });
    }

    // End interview and get final feedback
    const finalSession = await getAIInterviewerService().endInterview(sessionId);

    res.status(200).json({
      success: true,
      message: 'Interview completed successfully',
      data: {
        session: finalSession,
        finalFeedback: finalSession.feedback
      }
    });

  } catch (error) {
    console.error('Error ending interview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end interview',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/ai-interview/history
 * @desc    Get user's AI interview history
 * @access  Private
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get all sessions for this user
    const userSessions = [];
    for (const [sessionId, session] of getAIInterviewerService().interviewSessions) {
      if (session.userId === userId) {
        userSessions.push({
          sessionId,
          startTime: session.startTime,
          endTime: session.endTime,
          status: session.status,
          questionCount: session.questionCount,
          overallScore: session.feedback.overallScore,
          domains: session.userProfile.domains
        });
      }
    }

    // Sort by start time (most recent first)
    userSessions.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

    res.status(200).json({
      success: true,
      message: 'Interview history retrieved successfully',
      data: {
        sessions: userSessions
      }
    });

  } catch (error) {
    console.error('Error retrieving interview history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve interview history',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/ai-interview/:sessionId
 * @desc    Delete interview session
 * @access  Private
 */
router.delete('/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Verify session ownership
    const session = getAIInterviewerService().getSession(sessionId);
    if (!session || session.userId !== req.user._id) {
      return res.status(404).json({
        success: false,
        message: 'Interview session not found'
      });
    }

    // Delete session
    getAIInterviewerService().interviewSessions.delete(sessionId);

    res.status(200).json({
      success: true,
      message: 'Interview session deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete session',
      error: error.message
    });
  }
});

export default router;
