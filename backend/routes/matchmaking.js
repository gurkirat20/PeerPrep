import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import MatchmakingQueue from '../models/MatchmakingQueue.js';
import User from '../models/User.js';

const router = express.Router();

// @route   GET /api/matchmaking/status
// @desc    Get user's current queue status
// @access  Private
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const queueEntry = await MatchmakingQueue.findOne({ 
      user: req.user.id,
      status: 'waiting'
    });

    if (!queueEntry) {
      return res.json({ inQueue: false });
    }

    await queueEntry.updateQueuePosition();
    const updatedQueue = await MatchmakingQueue.findById(queueEntry._id);

    res.json({
      inQueue: true,
      position: updatedQueue.queuePosition,
      estimatedWaitTime: updatedQueue.estimatedWaitTime,
      totalInQueue: await MatchmakingQueue.countDocuments({ status: 'waiting' }),
      preferences: updatedQueue.preferences
    });
  } catch (error) {
    console.error('Error getting queue status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/matchmaking/join
// @desc    Join matchmaking queue
// @access  Private
router.post('/join', [
  authenticateToken,
  body('role').isIn(['interviewer', 'interviewee']).withMessage('Invalid role'),
  body('skillLevel').isIn(['beginner', 'intermediate', 'advanced', 'expert']).withMessage('Invalid skill level'),
  body('interviewType').isIn(['technical', 'behavioral', 'system-design', 'coding', 'general']).withMessage('Invalid interview type'),
  body('duration').isInt({ min: 15, max: 120 }).withMessage('Duration must be between 15 and 120 minutes')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { role, skillLevel, interviewType, duration } = req.body;

    // Remove user from any existing queue
    await MatchmakingQueue.findOneAndDelete({ user: req.user.id });

    // Create new queue entry
    const queueEntry = new MatchmakingQueue({
      user: req.user.id,
      preferences: {
        role,
        skillLevel,
        interviewType,
        duration
      },
      status: 'waiting',
      joinedAt: new Date()
    });

    await queueEntry.save();
    await queueEntry.updateQueuePosition();
    const updatedQueue = await MatchmakingQueue.findById(queueEntry._id);

    res.json({
      message: 'Joined queue successfully',
      position: updatedQueue.queuePosition,
      estimatedWaitTime: updatedQueue.estimatedWaitTime,
      totalInQueue: await MatchmakingQueue.countDocuments({ status: 'waiting' })
    });
  } catch (error) {
    console.error('Error joining queue:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/matchmaking/leave
// @desc    Leave matchmaking queue
// @access  Private
router.delete('/leave', authenticateToken, async (req, res) => {
  try {
    const queueEntry = await MatchmakingQueue.findOneAndDelete({ 
      user: req.user.id,
      status: 'waiting'
    });

    if (!queueEntry) {
      return res.status(404).json({ message: 'Not in queue' });
    }

    res.json({ message: 'Left queue successfully' });
  } catch (error) {
    console.error('Error leaving queue:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/matchmaking/stats
// @desc    Get matchmaking statistics
// @access  Private
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const totalInQueue = await MatchmakingQueue.countDocuments({ status: 'waiting' });
    
    const roleStats = await MatchmakingQueue.aggregate([
      { $match: { status: 'waiting' } },
      { $group: { _id: '$preferences.role', count: { $sum: 1 } } }
    ]);

    const skillLevelStats = await MatchmakingQueue.aggregate([
      { $match: { status: 'waiting' } },
      { $group: { _id: '$preferences.skillLevel', count: { $sum: 1 } } }
    ]);

    const interviewTypeStats = await MatchmakingQueue.aggregate([
      { $match: { status: 'waiting' } },
      { $group: { _id: '$preferences.interviewType', count: { $sum: 1 } } }
    ]);

    res.json({
      totalInQueue,
      roleStats: roleStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      skillLevelStats: skillLevelStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      interviewTypeStats: interviewTypeStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Error getting matchmaking stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
