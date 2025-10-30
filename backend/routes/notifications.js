import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import Notification from '../models/Notification.js';

const router = express.Router();

// GET /api/notifications - list notifications and unread count
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [notifications, unreadCount] = await Promise.all([
      Notification.getUserNotifications(userId, 50, 0),
      Notification.getUnreadCount(userId)
    ]);

    return res.json({
      success: true,
      data: { notifications, unreadCount }
    });
  } catch (error) {
    console.error('Fetch notifications error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

// PATCH /api/notifications/:id/read - mark one as read
router.patch('/:id/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const notif = await Notification.findOne({ _id: id, userId });
    if (!notif) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    await notif.markAsRead();
    const unreadCount = await Notification.getUnreadCount(userId);

    return res.json({ success: true, data: { notification: notif, unreadCount } });
  } catch (error) {
    console.error('Mark notification read error:', error);
    return res.status(500).json({ success: false, message: 'Failed to mark as read' });
  }
});

// PATCH /api/notifications/mark-all-read - mark all as read
router.patch('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    await Notification.markAllAsRead(userId);
    return res.json({ success: true });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    return res.status(500).json({ success: false, message: 'Failed to mark all as read' });
  }
});

export default router;



