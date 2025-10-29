import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'match_found',
      'interview_scheduled',
      'interview_starting',
      'interview_completed',
      'feedback_received',
      'analysis_ready',
      'matchmaking_timeout',
      'system_announcement'
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: true,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  data: {
    // Flexible data field for different notification types
    interviewId: mongoose.Schema.Types.ObjectId,
    sessionId: String,
    matchedUserId: mongoose.Schema.Types.ObjectId,
    matchedUserName: String,
    analysisId: mongoose.Schema.Types.ObjectId,
    scheduledTime: Date,
    actionUrl: String,
    actionText: String
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ priority: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Static method to create notification
notificationSchema.statics.createNotification = function(userId, type, title, message, data = {}) {
  return this.create({
    userId,
    type,
    title,
    message,
    data
  });
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({ userId, isRead: false });
};

// Static method to get notifications for user
notificationSchema.statics.getUserNotifications = function(userId, limit = 20, skip = 0) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('data.matchedUserId', 'name')
    .lean();
};

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    { userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

// Static method to create match found notification
notificationSchema.statics.createMatchFoundNotification = function(userId, matchedUserId, matchedUserName, sessionId) {
  return this.createNotification(
    userId,
    'match_found',
    'Match Found! 🎉',
    `You've been matched with ${matchedUserName} for a peer interview. Get ready to start!`,
    {
      matchedUserId,
      matchedUserName,
      sessionId,
      actionUrl: `/interview/${sessionId}`,
      actionText: 'Join Interview'
    }
  );
};

// Static method to create analysis ready notification
notificationSchema.statics.createAnalysisReadyNotification = function(userId, interviewId, sessionId) {
  return this.createNotification(
    userId,
    'analysis_ready',
    'Interview Analysis Ready 📊',
    'Your interview analysis and feedback are now available. Check your performance insights!',
    {
      interviewId,
      sessionId,
      actionUrl: '/dashboard?tab=analysis',
      actionText: 'View Analysis'
    }
  );
};

// Static method to create interview starting notification
notificationSchema.statics.createInterviewStartingNotification = function(userId, sessionId, scheduledTime) {
  const timeUntilStart = Math.round((scheduledTime - new Date()) / 1000 / 60); // minutes
  
  return this.createNotification(
    userId,
    'interview_starting',
    'Interview Starting Soon ⏰',
    `Your interview starts in ${timeUntilStart} minutes. Please join the interview room.`,
    {
      sessionId,
      scheduledTime,
      actionUrl: `/interview/${sessionId}`,
      actionText: 'Join Now',
      priority: 'high'
    }
  );
};

// Static method to create feedback received notification
notificationSchema.statics.createFeedbackReceivedNotification = function(userId, interviewerName, sessionId) {
  return this.createNotification(
    userId,
    'feedback_received',
    'Feedback Received 📝',
    `${interviewerName} has provided feedback for your interview. Check it out!`,
    {
      sessionId,
      actionUrl: '/dashboard?tab=analysis',
      actionText: 'View Feedback'
    }
  );
};

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
