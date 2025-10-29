import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import InterviewSession from '../models/InterviewSession.js';

const router = express.Router();

// GET /api/dashboard/summary
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const matchUser = {
      $or: [
        { interviewerId: userId },
        { intervieweeId: userId }
      ]
    };

    const totalInterviews = await InterviewSession.countDocuments(matchUser);

    const recent = await InterviewSession.find(matchUser)
      .sort({ createdAt: -1 })
      .limit(10)
      .select('type interviewType status createdAt feedback.aiAnalysis.overallScore feedback.interviewerFeedback.overallPerformance');

    const scores = recent.map(s => (
      s?.feedback?.aiAnalysis?.overallScore ?? s?.feedback?.interviewerFeedback?.overallPerformance
    )).filter(v => typeof v === 'number');

    const averageScore = scores.length
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : 0;

    // Simple trend: compare last 3 vs previous 3
    const last3 = scores.slice(0, 3);
    const prev3 = scores.slice(3, 6);
    const avg = arr => arr.length ? arr.reduce((a,b)=>a+b,0) / arr.length : 0;
    const trendDelta = avg(last3) - avg(prev3);
    const improvementTrend = trendDelta > 0.5 ? 'Improving' : trendDelta < -0.5 ? 'Declining' : 'Stable';

    res.json({
      success: true,
      data: {
        totalInterviews,
        averageScore,
        improvementTrend,
        recent
      }
    });
  } catch (err) {
    console.error('Dashboard summary error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch summary' });
  }
});

export default router;


