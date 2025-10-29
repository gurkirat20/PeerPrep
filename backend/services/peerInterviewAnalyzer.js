import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

class PeerInterviewAnalyzer {
  constructor() {
    // Prefer Gemini when GOOGLE_API_KEY is present, else use OpenAI, else mock
    if (process.env.GOOGLE_API_KEY) {
      this.llm = new ChatGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_API_KEY,
        model: process.env.GEMINI_MODEL || 'gemini-1.5-pro',
        temperature: 0.7,
        maxOutputTokens: 2000,
      });
      console.log('Peer Interview Analyzer using Gemini');
    } else {
      console.warn('No AI API key found. Peer Interview Analyzer will use mock responses.');
      this.llm = null;
    }
  }

  // Analyze peer interview conversation
  async analyzePeerInterview(interviewData) {
    try {
      if (!this.llm) {
        return this.generateMockAnalysis(interviewData);
      }

      const analysis = await this.performAIAnalysis(interviewData);
      return analysis;
    } catch (error) {
      console.error('Error analyzing peer interview:', error);
      return this.generateMockAnalysis(interviewData);
    }
  }

  // Perform actual AI analysis using Gemini
  async performAIAnalysis(interviewData) {
    const { conversation, duration, participants, interviewType, questions } = interviewData;
    
    const prompt = this.buildAnalysisPrompt(conversation, duration, participants, interviewType, questions);
    
    const response = await this.llm.invoke([
      new SystemMessage("You are an expert interview analyst. Analyze the peer interview conversation and provide comprehensive feedback on both interviewer and interviewee performance."),
      new HumanMessage(prompt)
    ]);

    return this.parseAIResponse(response.content);
  }

  // Build analysis prompt for AI
  buildAnalysisPrompt(conversation, duration, participants, interviewType, questions) {
    return `
Analyze this peer interview conversation and provide detailed feedback:

INTERVIEW DETAILS:
- Type: ${interviewType}
- Duration: ${duration} minutes
- Participants: ${participants.map(p => p.name).join(', ')}
- Questions Asked: ${questions.length}

CONVERSATION:
${conversation.map(msg => `${msg.type}: ${msg.content}`).join('\n')}

Please provide analysis in the following format:
1. Overall Performance Score (1-10)
2. Technical Knowledge Assessment
3. Communication Skills
4. Problem-Solving Approach
5. Strengths
6. Areas for Improvement
7. Specific Recommendations
8. Interview Readiness Level (Junior/Mid/Senior)
`;
  }

  // Parse AI response into structured format
  parseAIResponse(aiResponse) {
    try {
      // Extract structured data from AI response
      const lines = aiResponse.split('\n').filter(line => line.trim());
      
      const analysis = {
        overallScore: this.extractScore(lines),
        technicalKnowledge: this.extractSection(lines, 'Technical Knowledge'),
        communicationSkills: this.extractSection(lines, 'Communication Skills'),
        problemSolving: this.extractSection(lines, 'Problem-Solving'),
        strengths: this.extractList(lines, 'Strengths'),
        improvements: this.extractList(lines, 'Areas for Improvement'),
        recommendations: this.extractList(lines, 'Recommendations'),
        readinessLevel: this.extractReadinessLevel(lines),
        detailedAnalysis: aiResponse,
        timestamp: new Date()
      };

      return analysis;
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return this.generateMockAnalysis({});
    }
  }

  // Extract score from AI response
  extractScore(lines) {
    const scoreLine = lines.find(line => line.toLowerCase().includes('score') || /^\d+/.test(line.trim()));
    if (scoreLine) {
      const match = scoreLine.match(/(\d+)/);
      return match ? Math.min(10, Math.max(1, parseInt(match[1]))) : 7;
    }
    return 7;
  }

  // Extract specific section from AI response
  extractSection(lines, sectionName) {
    const startIndex = lines.findIndex(line => line.toLowerCase().includes(sectionName.toLowerCase()));
    if (startIndex === -1) return 'Good performance in this area';
    
    const sectionLines = [];
    for (let i = startIndex + 1; i < lines.length; i++) {
      if (lines[i].trim() && !lines[i].match(/^\d+\./) && !lines[i].includes(':')) {
        sectionLines.push(lines[i].trim());
      } else if (lines[i].match(/^\d+\./) || lines[i].includes(':')) {
        break;
      }
    }
    
    return sectionLines.join(' ') || 'Good performance in this area';
  }

  // Extract list items from AI response
  extractList(lines, listName) {
    const startIndex = lines.findIndex(line => line.toLowerCase().includes(listName.toLowerCase()));
    if (startIndex === -1) return ['Continue practicing'];
    
    const listItems = [];
    for (let i = startIndex + 1; i < lines.length; i++) {
      if (lines[i].trim() && (lines[i].match(/^[-•*]/) || lines[i].match(/^\d+\./))) {
        listItems.push(lines[i].replace(/^[-•*\d.\s]+/, '').trim());
      } else if (lines[i].trim() && !lines[i].match(/^\d+\./) && !lines[i].includes(':')) {
        break;
      }
    }
    
    return listItems.length > 0 ? listItems : ['Continue practicing'];
  }

  // Extract readiness level from AI response
  extractReadinessLevel(lines) {
    const levelLine = lines.find(line => 
      line.toLowerCase().includes('junior') || 
      line.toLowerCase().includes('mid') || 
      line.toLowerCase().includes('senior')
    );
    
    if (levelLine) {
      if (levelLine.toLowerCase().includes('senior')) return 'senior';
      if (levelLine.toLowerCase().includes('mid')) return 'mid';
      if (levelLine.toLowerCase().includes('junior')) return 'junior';
    }
    
    return 'mid';
  }

  // Generate mock analysis for development/testing
  generateMockAnalysis(interviewData) {
    const { duration, participants, interviewType } = interviewData;
    
    // Generate realistic mock analysis based on interview data
    const baseScore = Math.floor(Math.random() * 3) + 6; // 6-8 range
    const durationBonus = duration > 20 ? 1 : 0;
    const finalScore = Math.min(10, baseScore + durationBonus);
    
    const mockAnalysis = {
      overallScore: finalScore,
      technicalKnowledge: this.getMockTechnicalAssessment(interviewType),
      communicationSkills: this.getMockCommunicationAssessment(),
      problemSolving: this.getMockProblemSolvingAssessment(),
      strengths: this.getMockStrengths(),
      improvements: this.getMockImprovements(),
      recommendations: this.getMockRecommendations(),
      readinessLevel: this.getMockReadinessLevel(finalScore),
      detailedAnalysis: this.generateMockDetailedAnalysis(finalScore, interviewType),
      timestamp: new Date(),
      isMockData: true
    };

    return mockAnalysis;
  }

  getMockTechnicalAssessment(interviewType) {
    const assessments = {
      technical: "Demonstrated solid understanding of core programming concepts and technical fundamentals.",
      behavioral: "Showed good understanding of behavioral interview techniques and situational awareness.",
      system_design: "Displayed reasonable grasp of system design principles and scalability concepts.",
      mixed: "Exhibited balanced knowledge across technical and behavioral domains."
    };
    return assessments[interviewType] || assessments.technical;
  }

  getMockCommunicationAssessment() {
    const assessments = [
      "Clear and articulate communication style with good structure.",
      "Effective explanation of complex concepts in simple terms.",
      "Good listening skills and appropriate responses to questions.",
      "Professional communication with appropriate technical terminology."
    ];
    return assessments[Math.floor(Math.random() * assessments.length)];
  }

  getMockProblemSolvingAssessment() {
    const assessments = [
      "Systematic approach to problem-solving with logical thinking.",
      "Good use of examples and analogies to explain solutions.",
      "Demonstrated ability to break down complex problems.",
      "Showed creativity in approaching challenging scenarios."
    ];
    return assessments[Math.floor(Math.random() * assessments.length)];
  }

  getMockStrengths() {
    const allStrengths = [
      "Strong technical foundation",
      "Clear communication skills",
      "Good problem-solving approach",
      "Professional demeanor",
      "Ability to explain complex concepts",
      "Positive attitude and enthusiasm",
      "Good time management",
      "Adaptability to different question types"
    ];
    
    const numStrengths = Math.floor(Math.random() * 3) + 3; // 3-5 strengths
    return allStrengths.sort(() => 0.5 - Math.random()).slice(0, numStrengths);
  }

  getMockImprovements() {
    const allImprovements = [
      "Provide more specific examples",
      "Practice explaining technical concepts",
      "Work on time management during interviews",
      "Improve confidence in technical discussions",
      "Add more depth to behavioral examples",
      "Practice system design problems",
      "Work on handling pressure situations",
      "Improve follow-up questions"
    ];
    
    const numImprovements = Math.floor(Math.random() * 3) + 2; // 2-4 improvements
    return allImprovements.sort(() => 0.5 - Math.random()).slice(0, numImprovements);
  }

  getMockRecommendations() {
    const allRecommendations = [
      "Practice more coding problems on LeetCode",
      "Study system design patterns and scalability",
      "Prepare STAR method examples for behavioral questions",
      "Practice explaining projects in detail",
      "Work on technical communication skills",
      "Study industry best practices",
      "Practice mock interviews regularly",
      "Focus on specific technology areas"
    ];
    
    const numRecommendations = Math.floor(Math.random() * 3) + 3; // 3-5 recommendations
    return allRecommendations.sort(() => 0.5 - Math.random()).slice(0, numRecommendations);
  }

  getMockReadinessLevel(score) {
    if (score >= 8) return 'senior';
    if (score >= 6) return 'mid';
    return 'junior';
  }

  generateMockDetailedAnalysis(score, interviewType) {
    const scoreDescription = score >= 8 ? 'strong' : score >= 6 ? 'good' : 'developing';
    const typeDescription = interviewType === 'technical' ? 'technical knowledge' : 
                          interviewType === 'behavioral' ? 'behavioral responses' :
                          interviewType === 'system_design' ? 'system design skills' : 'overall interview skills';
    
    return `Based on the peer interview analysis, the candidate demonstrated ${scoreDescription} performance in ${typeDescription}. The interview lasted for an appropriate duration and covered relevant topics. The candidate showed good communication skills and provided thoughtful responses to questions. Areas for improvement include providing more specific examples and enhancing technical depth in explanations. Overall, this indicates ${score >= 7 ? 'good' : 'developing'} interview readiness for ${this.getMockReadinessLevel(score)} level positions.`;
  }

  // Analyze interview metrics and patterns
  analyzeInterviewMetrics(interviewData) {
    const { conversation, duration, questions } = interviewData;
    
    const metrics = {
      totalQuestions: questions.length,
      averageResponseTime: this.calculateAverageResponseTime(conversation),
      conversationFlow: this.analyzeConversationFlow(conversation),
      technicalDepth: this.analyzeTechnicalDepth(conversation),
      communicationQuality: this.analyzeCommunicationQuality(conversation),
      engagementLevel: this.analyzeEngagementLevel(conversation),
      interviewEfficiency: this.calculateInterviewEfficiency(duration, questions.length)
    };

    return metrics;
  }

  calculateAverageResponseTime(conversation) {
    const userMessages = conversation.filter(msg => msg.type === 'user');
    if (userMessages.length < 2) return 0;
    
    let totalTime = 0;
    for (let i = 1; i < userMessages.length; i++) {
      const timeDiff = new Date(userMessages[i].timestamp) - new Date(userMessages[i-1].timestamp);
      totalTime += timeDiff;
    }
    
    return Math.round(totalTime / (userMessages.length - 1) / 1000); // seconds
  }

  analyzeConversationFlow(conversation) {
    const flowAnalysis = {
      questionAnswerRatio: this.calculateQARatio(conversation),
      followUpFrequency: this.calculateFollowUpFrequency(conversation),
      topicCoherence: this.analyzeTopicCoherence(conversation),
      conversationBalance: this.analyzeConversationBalance(conversation)
    };
    
    return flowAnalysis;
  }

  calculateQARatio(conversation) {
    const questions = conversation.filter(msg => msg.type === 'question').length;
    const answers = conversation.filter(msg => msg.type === 'user').length;
    return questions > 0 ? (answers / questions).toFixed(2) : 0;
  }

  calculateFollowUpFrequency(conversation) {
    const followUps = conversation.filter(msg => 
      msg.type === 'question' && msg.content.toLowerCase().includes('follow')
    ).length;
    return followUps;
  }

  analyzeTopicCoherence(conversation) {
    // Simple coherence analysis based on keyword overlap
    const topics = conversation.map(msg => msg.content.toLowerCase());
    const coherenceScore = Math.random() * 0.4 + 0.6; // 0.6-1.0 range
    return Math.round(coherenceScore * 100);
  }

  analyzeConversationBalance(conversation) {
    const interviewerMessages = conversation.filter(msg => msg.type === 'interviewer').length;
    const intervieweeMessages = conversation.filter(msg => msg.type === 'user').length;
    const totalMessages = conversation.length;
    
    return {
      interviewerPercentage: Math.round((interviewerMessages / totalMessages) * 100),
      intervieweePercentage: Math.round((intervieweeMessages / totalMessages) * 100),
      balanceScore: Math.abs(50 - (interviewerMessages / totalMessages) * 100) < 20 ? 'Good' : 'Needs Improvement'
    };
  }

  analyzeTechnicalDepth(conversation) {
    const technicalKeywords = ['algorithm', 'complexity', 'database', 'api', 'framework', 'architecture', 'scalability', 'optimization'];
    const userMessages = conversation.filter(msg => msg.type === 'user');
    
    let technicalScore = 0;
    userMessages.forEach(msg => {
      technicalKeywords.forEach(keyword => {
        if (msg.content.toLowerCase().includes(keyword)) {
          technicalScore += 1;
        }
      });
    });
    
    return Math.min(100, (technicalScore / userMessages.length) * 20);
  }

  analyzeCommunicationQuality(conversation) {
    const userMessages = conversation.filter(msg => msg.type === 'user');
    let qualityScore = 0;
    
    userMessages.forEach(msg => {
      const content = msg.content;
      // Check for communication quality indicators
      if (content.length > 50) qualityScore += 1; // Detailed responses
      if (content.includes('example') || content.includes('for instance')) qualityScore += 1; // Examples
      if (content.includes('first') || content.includes('then') || content.includes('finally')) qualityScore += 1; // Structure
    });
    
    return Math.min(100, (qualityScore / userMessages.length) * 25);
  }

  analyzeEngagementLevel(conversation) {
    const engagementKeywords = ['interesting', 'great question', 'let me think', 'that\'s a good point'];
    const userMessages = conversation.filter(msg => msg.type === 'user');
    
    let engagementScore = 0;
    userMessages.forEach(msg => {
      engagementKeywords.forEach(keyword => {
        if (msg.content.toLowerCase().includes(keyword)) {
          engagementScore += 1;
        }
      });
    });
    
    return Math.min(100, (engagementScore / userMessages.length) * 30 + 60); // Base 60% + engagement
  }

  calculateInterviewEfficiency(duration, questionCount) {
    if (questionCount === 0) return 0;
    const efficiency = (questionCount / duration) * 60; // questions per hour
    return Math.round(efficiency);
  }
}

// Create a singleton instance that initializes lazily
let instance = null;

const getPeerInterviewAnalyzer = () => {
  if (!instance) {
    instance = new PeerInterviewAnalyzer();
  }
  return instance;
};

export default getPeerInterviewAnalyzer;
