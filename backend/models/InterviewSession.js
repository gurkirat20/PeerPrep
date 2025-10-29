import mongoose from 'mongoose';

const interviewSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true
  },
  interviewerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  intervieweeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['peer', 'ai'],
    required: true
  },
  interviewType: {
    type: String,
    enum: ['technical', 'behavioral', 'system-design', 'coding', 'mixed'],
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled', 'abandoned'],
    default: 'scheduled'
  },
  duration: {
    type: Number, // in minutes
    default: 30
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  topics: [String],
  questions: [{
    question: String,
    answer: String,
    timestamp: Date,
    questionType: {
      type: String,
      enum: ['technical', 'behavioral', 'system-design', 'follow-up']
    }
  }],
  conversation: [{
    speaker: {
      type: String,
      enum: ['interviewer', 'interviewee', 'ai']
    },
    message: String,
    timestamp: Date,
    messageType: {
      type: String,
      enum: ['question', 'answer', 'comment', 'feedback']
    }
  }],
  feedback: {
    interviewerFeedback: {
      technicalKnowledge: { type: Number, min: 0, max: 10 },
      problemSolving: { type: Number, min: 0, max: 10 },
      communication: { type: Number, min: 0, max: 10 },
      codeQuality: { type: Number, min: 0, max: 10 },
      overallPerformance: { type: Number, min: 0, max: 10 },
      strengths: String,
      weaknesses: String,
      suggestions: String,
      submittedAt: Date
    },
    aiAnalysis: {
      overallScore: { type: Number, min: 0, max: 10 },
      readinessLevel: {
        type: String,
        enum: ['junior', 'mid', 'senior']
      },
      summary: String,
      detailedAnalysis: String,
      technicalKnowledge: String,
      communicationSkills: String,
      problemSolving: String,
      strengths: [String],
      improvements: [String],
      recommendations: [String],
      metrics: {
        conversationFlow: {
          questionAnswerRatio: String,
          followUpFrequency: Number,
          topicCoherence: Number,
          conversationBalance: {
            interviewerPercentage: Number,
            intervieweePercentage: Number,
            balanceScore: String
          }
        },
        technicalDepth: Number,
        communicationQuality: Number,
        engagementLevel: Number,
        interviewEfficiency: Number,
        averageResponseTime: Number,
        totalQuestions: Number
      },
      analyzedAt: Date
    }
  },
  recording: {
    url: String,
    duration: Number,
    uploadedAt: Date
  },
  startedAt: Date,
  endedAt: Date,
  roomId: String, // WebRTC room ID
  matchmakingData: {
    matchedAt: Date,
    preferences: mongoose.Schema.Types.Mixed,
    compatibilityScore: Number
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
interviewSessionSchema.index({ sessionId: 1 }, { unique: true });
interviewSessionSchema.index({ interviewerId: 1, createdAt: -1 });
interviewSessionSchema.index({ intervieweeId: 1, createdAt: -1 });
interviewSessionSchema.index({ status: 1 });
interviewSessionSchema.index({ type: 1 });
interviewSessionSchema.index({ interviewType: 1 });
interviewSessionSchema.index({ createdAt: -1 });

// Virtual for duration calculation
interviewSessionSchema.virtual('actualDuration').get(function() {
  if (this.startedAt && this.endedAt) {
    return Math.round((this.endedAt - this.startedAt) / 1000 / 60); // minutes
  }
  return null;
});

// Method to start interview
interviewSessionSchema.methods.startInterview = function() {
  this.status = 'in-progress';
  this.startedAt = new Date();
  return this.save();
};

// Method to end interview
interviewSessionSchema.methods.endInterview = function() {
  this.status = 'completed';
  this.endedAt = new Date();
  return this.save();
};

// Method to add conversation message
interviewSessionSchema.methods.addMessage = function(speaker, message, messageType = 'comment') {
  this.conversation.push({
    speaker,
    message,
    timestamp: new Date(),
    messageType
  });
  return this.save();
};

// Method to add question and answer
interviewSessionSchema.methods.addQnA = function(question, answer, questionType = 'technical') {
  this.questions.push({
    question,
    answer,
    timestamp: new Date(),
    questionType
  });
  return this.save();
};

// Method to submit interviewer feedback
interviewSessionSchema.methods.submitInterviewerFeedback = function(feedback) {
  this.feedback.interviewerFeedback = {
    ...feedback,
    submittedAt: new Date()
  };
  return this.save();
};

// Method to submit AI analysis
interviewSessionSchema.methods.submitAIAnalysis = function(analysis) {
  this.feedback.aiAnalysis = {
    ...analysis,
    analyzedAt: new Date()
  };
  return this.save();
};

const InterviewSession = mongoose.model('InterviewSession', interviewSessionSchema);

export default InterviewSession;