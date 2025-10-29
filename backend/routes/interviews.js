import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import InterviewSession from '../models/InterviewSession.js';

const router = express.Router();

// @route   POST /api/interviews/match
// @desc    Join matchmaking queue
// @access  Private
router.post('/match', async (req, res) => {
  try {
    // TODO: Implement matchmaking logic
    res.json({ message: 'Join matchmaking queue endpoint - to be implemented' });
  } catch (error) {
    console.error('Matchmaking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/interviews/ai
// @desc    Start AI interview
// @access  Private
router.post('/ai', async (req, res) => {
  try {
    // TODO: Implement AI interview logic
    res.json({ message: 'Start AI interview endpoint - to be implemented' });
  } catch (error) {
    console.error('AI interview error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/interviews/history
// @desc    Get interview history
// @access  Private
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const interviews = await InterviewSession.find({
      $or: [{ interviewerId: userId }, { intervieweeId: userId }]
    })
      .populate('interviewerId', 'name email')
      .populate('intervieweeId', 'name email')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, data: { interviews } });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/interviews/complete
// Persist interview stats (AI or peer)
router.post('/complete', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      sessionId,
      type = 'ai',
      interviewerId,
      intervieweeId,
      interviewType = 'technical',
      duration = 30,
      difficulty = 'medium',
      questions = [],
      conversation = [],
      aiAnalysis = null,
      feedback = null,
      startedAt,
      endedAt,
      roomId
    } = req.body;

    let doc = await InterviewSession.findOne({ sessionId });
    if (!doc) {
      doc = new InterviewSession({
        sessionId,
        type,
        interviewerId: interviewerId || (type === 'ai' ? userId : interviewerId),
        intervieweeId: intervieweeId || userId,
        interviewType,
        duration,
        difficulty,
        status: 'completed',
        startedAt: startedAt ? new Date(startedAt) : undefined,
        endedAt: endedAt ? new Date(endedAt) : undefined,
        roomId
      });
    }

    // Update fields
    doc.type = type;
    doc.interviewerId = interviewerId || doc.interviewerId;
    doc.intervieweeId = intervieweeId || doc.intervieweeId || userId;
    doc.interviewType = interviewType;
    doc.duration = duration;
    doc.difficulty = difficulty;
    doc.status = 'completed';
    if (Array.isArray(questions) && questions.length) {
      doc.questions = questions;
    }
    if (Array.isArray(conversation) && conversation.length) {
      doc.conversation = conversation;
    }
    if (aiAnalysis) {
      doc.feedback = doc.feedback || {};
      doc.feedback.aiAnalysis = aiAnalysis;
    }
    if (feedback) {
      doc.feedback = { ...(doc.feedback || {}), interviewerFeedback: feedback };
    }
    if (startedAt) doc.startedAt = new Date(startedAt);
    if (endedAt) doc.endedAt = new Date(endedAt);
    if (roomId) doc.roomId = roomId;

    await doc.save();

    res.json({ success: true, data: { interview: doc } });
  } catch (error) {
    console.error('Complete interview error:', error);
    res.status(500).json({ success: false, message: 'Failed to persist interview' });
  }
});

export default router;
