import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        skillLevel: req.user.skillLevel,
        skills: req.user.skills,
        interests: req.user.interests,
        preferredTopics: req.user.preferredTopics,
        experience: req.user.experience,
        preferences: req.user.preferences,
        stats: req.user.stats,
        avatar: req.user.avatar,
        createdAt: req.user.createdAt,
        updatedAt: req.user.updatedAt
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', [
  authenticateToken,
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('role').optional().isIn(['interviewer', 'interviewee', 'both']).withMessage('Invalid role'),
  body('skillLevel').optional().isIn(['beginner', 'intermediate', 'advanced', 'expert']).withMessage('Invalid skill level'),
  body('experience.years').optional().isInt({ min: 0, max: 50 }).withMessage('Experience years must be between 0 and 50'),
  body('experience.description').optional().isLength({ max: 500 }).withMessage('Experience description cannot exceed 500 characters'),
  // Enhanced profile validation
  body('skills').optional().isArray().withMessage('Skills must be an array'),
  body('interests').optional().isArray().withMessage('Interests must be an array'),
  body('preferredTopics').optional().isArray().withMessage('Preferred topics must be an array'),
  body('experience.domains').optional().isArray().withMessage('Experience domains must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const allowedUpdates = ['name', 'role', 'skillLevel', 'skills', 'interests', 'preferredTopics', 'experience', 'preferences'];
    const updates = {};

    // Only update allowed fields
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Update user
    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        skillLevel: user.skillLevel,
        skills: user.skills,
        interests: user.interests,
        preferredTopics: user.preferredTopics,
        experience: user.experience,
        preferences: user.preferences,
        stats: user.stats,
        avatar: user.avatar,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/users/skills
// @desc    Add or update user skills
// @access  Private
router.post('/skills', [
  authenticateToken,
  body('skills').isArray().withMessage('Skills must be an array'),
  body('skills.*.name').notEmpty().withMessage('Skill name is required'),
  body('skills.*.level').isIn(['beginner', 'intermediate', 'advanced', 'expert']).withMessage('Invalid skill level')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { skills } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { skills },
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Skills updated successfully',
      skills: user.skills
    });
  } catch (error) {
    console.error('Update skills error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/preferences
// @desc    Update user preferences
// @access  Private
router.put('/preferences', [
  authenticateToken,
  body('interviewTypes').optional().isArray().withMessage('Interview types must be an array'),
  body('interviewTypes.*').optional().isIn(['technical', 'behavioral', 'system-design', 'coding', 'general']).withMessage('Invalid interview type'),
  body('duration').optional().isInt({ min: 15, max: 120 }).withMessage('Duration must be between 15 and 120 minutes'),
  body('timezone').optional().isString().withMessage('Timezone must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const allowedPreferences = ['interviewTypes', 'duration', 'timezone'];
    const preferences = {};

    allowedPreferences.forEach(field => {
      if (req.body[field] !== undefined) {
        preferences[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { preferences: { ...req.user.preferences, ...preferences } },
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Preferences updated successfully',
      preferences: user.preferences
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/stats
// @desc    Get user statistics
// @access  Private
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('stats');
    
    res.json({
      stats: user.stats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/users/account
// @desc    Deactivate user account
// @access  Private
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { isActive: false },
      { new: true }
    );

    res.json({
      message: 'Account deactivated successfully'
    });
  } catch (error) {
    console.error('Deactivate account error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
