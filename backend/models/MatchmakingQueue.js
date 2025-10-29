import mongoose from 'mongoose';

const matchmakingQueueSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  preferences: {
    role: {
      type: String,
      enum: ['interviewer', 'interviewee'],
      required: true
    },
    interviewType: {
      type: String,
      enum: ['technical', 'behavioral', 'system-design', 'coding', 'mixed'],
      required: true
    },
    duration: {
      type: Number,
      default: 30,
      min: 15,
      max: 120
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
    },
    topics: [String],
    skillLevel: String,
    preferredSkills: [String],
    excludedSkills: [String]
  },
  userProfile: {
    skillLevel: String,
    skills: [{
      name: String,
      keywords: [String],
      level: String
    }],
    experience: {
      years: Number,
      domains: [String]
    },
    location: {
      country: String,
      city: String,
      timezone: String
    }
  },
  status: {
    type: String,
    enum: ['waiting', 'matched', 'interviewing', 'completed', 'cancelled'],
    default: 'waiting'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  matchedAt: Date,
  matchedWith: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InterviewSession'
  },
  compatibilityScore: Number,
  socketId: String, // For real-time communication
  lastPing: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient matching
matchmakingQueueSchema.index({ userId: 1 }, { unique: true });
matchmakingQueueSchema.index({ status: 1 });
matchmakingQueueSchema.index({ 'preferences.role': 1 });
matchmakingQueueSchema.index({ 'preferences.interviewType': 1 });
matchmakingQueueSchema.index({ 'preferences.difficulty': 1 });
matchmakingQueueSchema.index({ 'userProfile.skillLevel': 1 });
matchmakingQueueSchema.index({ joinedAt: 1 });
matchmakingQueueSchema.index({ lastPing: 1 });

// Method to update ping (for connection health)
matchmakingQueueSchema.methods.updatePing = function() {
  this.lastPing = new Date();
  return this.save();
};

// Method to match with another user
matchmakingQueueSchema.methods.matchWith = function(matchedUserId, sessionId, compatibilityScore) {
  this.status = 'matched';
  this.matchedAt = new Date();
  this.matchedWith = matchedUserId;
  this.sessionId = sessionId;
  this.compatibilityScore = compatibilityScore;
  return this.save();
};

// Method to start interview
matchmakingQueueSchema.methods.startInterview = function() {
  this.status = 'interviewing';
  return this.save();
};

// Method to complete interview
matchmakingQueueSchema.methods.completeInterview = function() {
  this.status = 'completed';
  return this.save();
};

// Method to cancel matchmaking
matchmakingQueueSchema.methods.cancel = function() {
  this.status = 'cancelled';
  return this.save();
};

// Static method to find compatible matches
matchmakingQueueSchema.statics.findCompatibleMatches = function(userId, preferences) {
  const { role, interviewType, difficulty, skillLevel, topics, preferredSkills } = preferences;
  
  // Build query for opposite role
  const oppositeRole = role === 'interviewer' ? 'interviewee' : 'interviewer';
  
  const query = {
    userId: { $ne: userId },
    status: 'waiting',
    'preferences.role': oppositeRole,
    'preferences.interviewType': interviewType,
    'preferences.difficulty': difficulty,
    lastPing: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Active within last 5 minutes
  };

  // Add skill level matching if specified
  if (skillLevel) {
    query['userProfile.skillLevel'] = skillLevel;
  }

  // Add topic matching if specified
  if (topics && topics.length > 0) {
    query['preferences.topics'] = { $in: topics };
  }

  // Add skill matching if specified
  if (preferredSkills && preferredSkills.length > 0) {
    query['userProfile.skills.name'] = { $in: preferredSkills };
  }

  return this.find(query)
    .populate('userId', 'name skillLevel skills experience location')
    .sort({ joinedAt: 1 }); // First come, first served
};

// Static method to calculate compatibility score
matchmakingQueueSchema.statics.calculateCompatibility = function(user1, user2) {
  let score = 0;
  let factors = 0;

  // Role compatibility (opposite roles)
  if (user1.preferences.role !== user2.preferences.role) {
    score += 20;
  }
  factors++;

  // Interview type compatibility
  if (user1.preferences.interviewType === user2.preferences.interviewType) {
    score += 20;
  }
  factors++;

  // Difficulty compatibility
  if (user1.preferences.difficulty === user2.preferences.difficulty) {
    score += 15;
  }
  factors++;

  // Skill level compatibility
  if (user1.userProfile.skillLevel === user2.userProfile.skillLevel) {
    score += 15;
  }
  factors++;

  // Topic overlap
  const user1Topics = user1.preferences.topics || [];
  const user2Topics = user2.preferences.topics || [];
  const topicOverlap = user1Topics.filter(topic => user2Topics.includes(topic)).length;
  if (topicOverlap > 0) {
    score += Math.min(topicOverlap * 5, 15);
  }
  factors++;

  // Skill overlap
  const user1Skills = (user1.userProfile.skills || []).map(s => s.name);
  const user2Skills = (user2.userProfile.skills || []).map(s => s.name);
  const skillOverlap = user1Skills.filter(skill => user2Skills.includes(skill)).length;
  if (skillOverlap > 0) {
    score += Math.min(skillOverlap * 3, 15);
  }
  factors++;

  return Math.round(score);
};

const MatchmakingQueue = mongoose.model('MatchmakingQueue', matchmakingQueueSchema);

export default MatchmakingQueue;