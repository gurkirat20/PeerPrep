// Advanced Keyword/Attribute Intersection Matchmaking Algorithm
import MatchmakingQueue from '../models/MatchmakingQueue.js';
import User from '../models/User.js';

// Calculate intersection score between two users
const calculateIntersectionScore = (user1, user2, preferences1, preferences2) => {
  let score = 0;
  let maxPossibleScore = 0;

  // 1. ROLE COMPATIBILITY (Required - 100 points)
  maxPossibleScore += 100;
  if (preferences1.role !== preferences2.role) {
    score += 100;
  } else {
    return 0; // No match possible
  }

  // 2. SKILL KEYWORD INTERSECTION (50 points max)
  maxPossibleScore += 50;
  const skillIntersection = calculateSkillIntersection(user1, user2, preferences1, preferences2);
  score += skillIntersection;

  // 3. TOPIC INTERSECTION (40 points max)
  maxPossibleScore += 40;
  const topicIntersection = calculateTopicIntersection(user1, user2, preferences1, preferences2);
  score += topicIntersection;

  // 4. EXPERIENCE COMPATIBILITY (30 points max)
  maxPossibleScore += 30;
  const experienceCompatibility = calculateExperienceCompatibility(user1, user2, preferences1, preferences2);
  score += experienceCompatibility;

  // 5. DOMAIN INTERSECTION (25 points max)
  maxPossibleScore += 25;
  const domainIntersection = calculateDomainIntersection(user1, user2, preferences1, preferences2);
  score += domainIntersection;

  // 6. INTERVIEW TYPE MATCH (20 points max)
  maxPossibleScore += 20;
  if (preferences1.interviewType === preferences2.interviewType) {
    score += 20;
  }

  // 7. DURATION COMPATIBILITY (15 points max)
  maxPossibleScore += 15;
  const durationCompatibility = calculateDurationCompatibility(preferences1.duration, preferences2.duration);
  score += durationCompatibility;

  // 8. DIFFICULTY MATCH (10 points max)
  maxPossibleScore += 10;
  if (preferences1.difficulty === preferences2.difficulty) {
    score += 10;
  }

  return {
    score,
    maxPossibleScore,
    percentage: (score / maxPossibleScore) * 100,
    breakdown: {
      roleCompatibility: preferences1.role !== preferences2.role ? 100 : 0,
      skillIntersection,
      topicIntersection,
      experienceCompatibility,
      domainIntersection,
      interviewTypeMatch: preferences1.interviewType === preferences2.interviewType ? 20 : 0,
      durationCompatibility,
      difficultyMatch: preferences1.difficulty === preferences2.difficulty ? 10 : 0
    }
  };
};

// Calculate skill keyword intersection
const calculateSkillIntersection = (user1, user2, preferences1, preferences2) => {
  const user1Skills = user1.skills || [];
  const user2Skills = user2.skills || [];
  
  let intersectionScore = 0;
  let totalPossibleScore = 0;

  // Check required skills from preferences
  const requiredSkills1 = preferences1.requiredSkills || [];
  const requiredSkills2 = preferences2.requiredSkills || [];

  // Score based on required skills match
  for (const reqSkill of requiredSkills1) {
    totalPossibleScore += 10;
    const matchingSkill = user2Skills.find(skill => 
      skill.name.toLowerCase() === reqSkill.name.toLowerCase() &&
      isSkillLevelCompatible(skill.level, reqSkill.level)
    );
    if (matchingSkill) {
      intersectionScore += 10;
    }
  }

  // Score based on keyword intersection
  const user1Keywords = user1Skills.flatMap(skill => skill.keywords || []);
  const user2Keywords = user2Skills.flatMap(skill => skill.keywords || []);
  
  const keywordIntersection = user1Keywords.filter(keyword => 
    user2Keywords.includes(keyword.toLowerCase())
  );

  totalPossibleScore += Math.max(user1Keywords.length, user2Keywords.length) * 2;
  intersectionScore += keywordIntersection.length * 2;

  // Normalize to max 50 points
  return Math.min(50, (intersectionScore / Math.max(totalPossibleScore, 1)) * 50);
};

// Calculate topic intersection
const calculateTopicIntersection = (user1, user2, preferences1, preferences2) => {
  const user1Topics = [
    ...(user1.preferredTopics || []),
    ...(preferences1.preferredTopics || [])
  ].map(topic => topic.toLowerCase());

  const user2Topics = [
    ...(user2.preferredTopics || []),
    ...(preferences2.preferredTopics || [])
  ].map(topic => topic.toLowerCase());

  // Check for excluded topics
  const excludedTopics1 = preferences1.excludedTopics || [];
  const excludedTopics2 = preferences2.excludedTopics || [];

  // If any excluded topic matches, reduce score
  const hasExcludedIntersection = excludedTopics1.some(topic => 
    user2Topics.includes(topic.toLowerCase())
  ) || excludedTopics2.some(topic => 
    user1Topics.includes(topic.toLowerCase())
  );

  if (hasExcludedIntersection) {
    return 0;
  }

  // Calculate intersection
  const intersection = user1Topics.filter(topic => user2Topics.includes(topic));
  const union = [...new Set([...user1Topics, ...user2Topics])];

  // Jaccard similarity coefficient
  const jaccardSimilarity = intersection.length / union.length;
  return Math.round(jaccardSimilarity * 40);
};

// Calculate experience compatibility
const calculateExperienceCompatibility = (user1, user2, preferences1, preferences2) => {
  const exp1 = user1.experience?.years || 0;
  const exp2 = user2.experience?.years || 0;

  // Check if experience is within preferred range
  const range1 = preferences1.experienceRange || { min: 0, max: 50 };
  const range2 = preferences2.experienceRange || { min: 0, max: 50 };

  let score = 0;

  // Check if user2's experience fits user1's range
  if (exp2 >= range1.min && exp2 <= range1.max) {
    score += 15;
  }

  // Check if user1's experience fits user2's range
  if (exp1 >= range2.min && exp1 <= range2.max) {
    score += 15;
  }

  return Math.min(30, score);
};

// Calculate domain intersection
const calculateDomainIntersection = (user1, user2, preferences1, preferences2) => {
  const domains1 = [
    ...(user1.experience?.domains || []),
    ...(preferences1.domains || [])
  ].map(domain => domain.toLowerCase());

  const domains2 = [
    ...(user2.experience?.domains || []),
    ...(preferences2.domains || [])
  ].map(domain => domain.toLowerCase());

  const intersection = domains1.filter(domain => domains2.includes(domain));
  const union = [...new Set([...domains1, ...domains2])];

  if (union.length === 0) return 0;

  const jaccardSimilarity = intersection.length / union.length;
  return Math.round(jaccardSimilarity * 25);
};

// Calculate duration compatibility
const calculateDurationCompatibility = (duration1, duration2) => {
  const diff = Math.abs(duration1 - duration2);
  
  if (diff === 0) return 15;
  if (diff <= 15) return 10;
  if (diff <= 30) return 5;
  return 0;
};

// Check if skill levels are compatible
const isSkillLevelCompatible = (level1, level2) => {
  const levels = ['beginner', 'intermediate', 'advanced', 'expert'];
  const index1 = levels.indexOf(level1);
  const index2 = levels.indexOf(level2);
  
  return Math.abs(index1 - index2) <= 1;
};

// Enhanced matchmaking algorithm
export const findBestMatch = async (userQueue) => {
  try {
    const { user, preferences } = userQueue;
    const oppositeRole = preferences.role === 'interviewer' ? 'interviewee' : 'interviewer';

    // Get all potential matches
    const potentialMatches = await MatchmakingQueue.find({
      userId: { $ne: user },
      'preferences.role': oppositeRole,
      status: 'waiting'
    }).populate('userId', 'name email skills interests preferredTopics experience');

    if (potentialMatches.length === 0) {
      return null;
    }

    // Load initiating user's profile for scoring
    const user1 = await User.findById(user).select('name email skills interests preferredTopics experience');

    // Calculate intersection scores for all potential matches
    const scoredMatches = potentialMatches.map(match => {
      const scoreData = calculateIntersectionScore(
        user1,
        match.userId,
        preferences,
        match.preferences
      );

      return {
        match,
        score: scoreData.score,
        percentage: scoreData.percentage,
        breakdown: scoreData.breakdown
      };
    });

    // Sort by score (highest first)
    scoredMatches.sort((a, b) => b.score - a.score);

    // Filter matches with minimum threshold (e.g., 50% compatibility)
    const threshold = 50; // 50% minimum compatibility
    const viableMatches = scoredMatches.filter(match => match.percentage >= threshold);

    if (viableMatches.length === 0) {
      return null;
    }

    // Return the best match
    const bestMatch = viableMatches[0];
    
    console.log(`🎯 Best match found: ${bestMatch.percentage.toFixed(1)}% compatibility`);
    console.log(`   Score breakdown:`, bestMatch.breakdown);

    return {
      match: bestMatch.match,
      compatibilityScore: bestMatch.percentage,
      scoreBreakdown: bestMatch.breakdown
    };

  } catch (error) {
    console.error('Error in enhanced matchmaking:', error);
    return null;
  }
};

// Get matchmaking insights for a user
export const getMatchmakingInsights = async (userId) => {
  try {
    const user = await User.findById(userId).populate('skills');
    
    // Get queue statistics
    const queueStats = await MatchmakingQueue.aggregate([
      { $match: { status: 'waiting' } },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          avgWaitTime: { $avg: { $subtract: [new Date(), '$joinedAt'] } },
          skillDistribution: { $push: '$preferences.skillLevel' },
          topicDistribution: { $push: '$preferences.preferredTopics' }
        }
      }
    ]);

    // Calculate user's matchability score
    const userSkills = user.skills || [];
    const userTopics = user.preferredTopics || [];
    
    const matchabilityScore = {
      skillDiversity: userSkills.length,
      topicDiversity: userTopics.length,
      averageSkillLevel: calculateAverageSkillLevel(userSkills),
      recommendedImprovements: generateRecommendations(userSkills, userTopics)
    };

    return {
      queueStats: queueStats[0] || {},
      matchabilityScore,
      estimatedWaitTime: calculateEstimatedWaitTime(queueStats[0])
    };

  } catch (error) {
    console.error('Error getting matchmaking insights:', error);
    return null;
  }
};

// Helper functions
const calculateAverageSkillLevel = (skills) => {
  if (!skills.length) return 'beginner';
  
  const levelValues = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
  const average = skills.reduce((sum, skill) => sum + levelValues[skill.level], 0) / skills.length;
  
  const levels = ['beginner', 'intermediate', 'advanced', 'expert'];
  return levels[Math.round(average) - 1] || 'intermediate';
};

const generateRecommendations = (skills, topics) => {
  const recommendations = [];
  
  if (skills.length < 3) {
    recommendations.push('Add more skills to increase match opportunities');
  }
  
  if (topics.length < 2) {
    recommendations.push('Specify preferred interview topics');
  }
  
  const beginnerSkills = skills.filter(skill => skill.level === 'beginner');
  if (beginnerSkills.length > skills.length * 0.7) {
    recommendations.push('Consider improving skill levels for better matches');
  }
  
  return recommendations;
};

const calculateEstimatedWaitTime = (queueStats) => {
  if (!queueStats) return 30; // Default 30 minutes
  
  const totalUsers = queueStats.totalUsers || 0;
  const avgWaitTime = queueStats.avgWaitTime || 0;
  
  // Simple estimation based on queue size and historical data
  return Math.max(5, Math.min(60, totalUsers * 2 + avgWaitTime / 60000));
};
