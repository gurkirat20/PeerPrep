import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

class AIInterviewerService {
  constructor() {
    // Prefer Gemini when GOOGLE_API_KEY is present, else use OpenAI, else mock
    if (process.env.GOOGLE_API_KEY) {
      this.llm = new ChatGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_API_KEY,
        model: process.env.GEMINI_MODEL || 'gemini-1.5-pro',
        temperature: 0.7,
        maxOutputTokens: 1000,
      });
      console.log('AI Interviewer using Gemini');
    } else if (process.env.OPENAI_API_KEY) {
      this.llm = new ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 1000,
      });
      console.log('AI Interviewer using OpenAI');
    } else {
      console.warn('No AI API key found. AI Interviewer will use mock responses.');
      this.llm = null;
    }
    
    this.interviewSessions = new Map(); // Store active interview sessions
  }

  /**
   * Start a new AI interview session
   */
  async startInterview(userProfile, preferences) {
    const sessionId = this.generateSessionId();
    
    const session = {
      id: sessionId,
      userId: userProfile._id,
      userProfile,
      preferences,
      conversationHistory: [],
      currentQuestion: null,
      questionCount: 0,
      startTime: new Date(),
      status: 'active',
      feedback: {
        strengths: [],
        areasForImprovement: [],
        overallScore: 0,
        detailedAnalysis: ''
      }
    };

    this.interviewSessions.set(sessionId, session);
    
    // Generate first question
    const firstQuestion = await this.generateQuestion(sessionId, 'opening');
    
    return {
      sessionId,
      question: firstQuestion,
      session: session
    };
  }

  /**
   * Generate a question based on the current interview context using Gemini AI
   */
  async generateQuestion(sessionId, questionType = 'opening') {
    const session = this.interviewSessions.get(sessionId);
    if (!session) {
      throw new Error('Interview session not found');
    }

    try {
      if (!this.llm) {
        throw new Error('AI service not available. Please configure Gemini API key.');
      }

      // Generate dynamic question using Gemini AI
      const questionPrompt = this.generateDynamicQuestionPrompt(session, questionType);
      const response = await this.llm.invoke([
        new SystemMessage(this.generateSystemPrompt(session.userProfile, session.preferences)),
        new HumanMessage(questionPrompt)
      ]);
      
      const questionData = this.parseQuestionResponse(response.content);
      
      session.currentQuestion = {
        id: this.generateQuestionId(),
        text: questionData.question,
        type: questionType,
        difficulty: questionData.difficulty,
        domain: questionData.domain,
        expectedAnswer: questionData.expectedAnswer,
        keywords: questionData.keywords || [],
        timestamp: new Date()
      };

      session.questionCount++;
      session.conversationHistory.push({
        type: 'question',
        content: session.currentQuestion,
        timestamp: new Date()
      });

      return session.currentQuestion;
    } catch (error) {
      console.error('Error generating question:', error);
      throw new Error('Failed to generate question: ' + error.message);
    }
  }

  /**
   * Process user's answer and generate follow-up or feedback
   */
  async processAnswer(sessionId, answer) {
    const session = this.interviewSessions.get(sessionId);
    if (!session) {
      throw new Error('Interview session not found');
    }

    // Add answer to conversation history
    session.conversationHistory.push({
      type: 'answer',
      content: answer,
      timestamp: new Date(),
      questionId: session.currentQuestion?.id
    });

    // Analyze the answer
    const analysis = await this.analyzeAnswer(session, answer);
    
    // Update feedback based on analysis
    this.updateFeedback(session, analysis);

    // Determine next action
    const nextAction = await this.determineNextAction(session, analysis);

    return {
      analysis,
      nextAction,
      feedback: session.feedback,
      session: session
    };
  }

  /**
   * Generate system prompt for the AI interviewer
   */
  generateSystemPrompt(userProfile, preferences) {
    const { skillLevel, domains, experience } = userProfile;
    const { interviewType, duration, difficulty } = preferences;

    return `You are an expert technical interviewer conducting a ${interviewType} interview for a ${skillLevel} level candidate.

CANDIDATE PROFILE:
- Skill Level: ${skillLevel}
- Experience: ${experience} years
- Domains: ${domains?.join(', ') || 'General'}
- Interview Type: ${interviewType}
- Duration: ${duration} minutes
- Difficulty: ${difficulty}

INTERVIEW GUIDELINES:
1. Ask relevant technical questions based on the candidate's skill level and domains
2. Provide constructive feedback on answers
3. Ask follow-up questions to dive deeper into topics
4. Maintain a professional but friendly tone
5. Focus on problem-solving, technical knowledge, and communication skills

QUESTION FORMAT:
Return questions in this JSON format:
{
  "question": "The actual question text",
  "type": "technical|behavioral|system_design|coding",
  "difficulty": "easy|medium|hard",
  "domain": "relevant domain",
  "expectedAnswer": "Brief expected answer points",
  "keywords": ["key", "concepts", "to", "look", "for"]
}`;
  }

  /**
   * Generate dynamic question prompt for Gemini AI
   */
  generateDynamicQuestionPrompt(session, questionType) {
    const { questionCount, userProfile, preferences, conversationHistory } = session;
    const { interviewType, difficulty, duration } = preferences;
    
    let prompt = `Generate a ${interviewType} interview question for a ${difficulty} level candidate. `;
    
    // Add context based on conversation history
    if (conversationHistory.length > 0) {
      const lastResponse = conversationHistory[conversationHistory.length - 1];
      if (lastResponse.type === 'answer') {
        prompt += `The candidate's last response was: "${lastResponse.content}". `;
        prompt += `Generate a follow-up question that builds on their answer and explores deeper. `;
      }
    }
    
    // Add user profile context
    if (userProfile.domains && userProfile.domains.length > 0) {
      prompt += `Focus on these domains: ${userProfile.domains.join(', ')}. `;
    }
    
    // Add question type context
    switch (questionType) {
      case 'opening':
        prompt += `Start with an opening question to get to know the candidate. `;
        break;
      case 'technical':
        prompt += `Ask a technical question appropriate for ${difficulty} level. `;
        break;
      case 'behavioral':
        prompt += `Ask a behavioral question about past experiences. `;
        break;
      case 'system_design':
        prompt += `Ask a system design question. `;
        break;
      case 'follow_up':
        prompt += `Ask a follow-up question to dive deeper into their previous answer. `;
        break;
      case 'closing':
        prompt += `Ask a closing question to wrap up the interview. `;
        break;
    }
    
    prompt += `\n\nReturn ONLY a JSON object with this exact format:
    {
      "question": "The question text here",
      "type": "${questionType}",
      "difficulty": "${difficulty}",
      "domain": "relevant domain",
      "expectedAnswer": "What a good answer should include",
      "keywords": ["keyword1", "keyword2", "keyword3"]
    }`;
    
    return prompt;
  }

  /**
   * Generate question prompt based on session context (legacy method)
   */
  generateQuestionPrompt(session, questionType) {
    const { questionCount, userProfile, preferences } = session;
    
    let prompt = '';
    
    switch (questionType) {
      case 'opening':
        prompt = `Generate an opening question to start the interview. Make it welcoming and relevant to their background.`;
        break;
      case 'follow_up':
        prompt = `Generate a follow-up question based on the conversation so far. Question #${questionCount + 1}.`;
        break;
      case 'technical':
        prompt = `Generate a technical question appropriate for a ${userProfile.skillLevel} level candidate in ${userProfile.domains?.join(', ')}.`;
        break;
      case 'behavioral':
        prompt = `Generate a behavioral question to assess soft skills and experience.`;
        break;
      case 'system_design':
        prompt = `Generate a system design question appropriate for the candidate's level.`;
        break;
      case 'closing':
        prompt = `Generate a closing question and provide interview summary.`;
        break;
      default:
        prompt = `Generate an appropriate interview question.`;
    }

    return prompt;
  }

  /**
   * Parse AI response to extract question data
   */
  parseQuestionResponse(response) {
    try {
      // Try to parse as JSON first
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback to text parsing
      return {
        question: response,
        type: 'technical',
        difficulty: 'medium',
        domain: 'general',
        expectedAnswer: 'Comprehensive answer demonstrating knowledge',
        keywords: []
      };
    } catch (error) {
      console.error('Error parsing question response:', error);
      return {
        question: response,
        type: 'technical',
        difficulty: 'medium',
        domain: 'general',
        expectedAnswer: 'Comprehensive answer demonstrating knowledge',
        keywords: []
      };
    }
  }

  /**
   * Analyze user's answer
   */
  async analyzeAnswer(session, answer) {
    try {
      if (this.llm) {
        const analysisPrompt = `Analyze this interview answer and provide feedback:

QUESTION: ${session.currentQuestion?.text}
ANSWER: ${answer}
CANDIDATE LEVEL: ${session.userProfile.skillLevel}
DOMAIN: ${session.currentQuestion?.domain}

Provide analysis in this JSON format:
{
  "score": 0-10,
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "suggestions": ["suggestion1", "suggestion2"],
  "technicalAccuracy": 0-10,
  "communication": 0-10,
  "completeness": 0-10,
  "analysis": "Detailed analysis of the answer"
}`;

        const response = await this.llm.invoke([
          new SystemMessage("You are an expert interview evaluator. Analyze answers objectively and provide constructive feedback."),
          new HumanMessage(analysisPrompt)
        ]);

        return this.parseAnalysisResponse(response.content);
      } else {
        // Mock analysis
        return this.getMockAnalysis(answer);
      }
    } catch (error) {
      console.error('Error analyzing answer:', error);
      return this.getMockAnalysis(answer);
    }
  }

  /**
   * Parse analysis response
   */
  parseAnalysisResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return this.getMockAnalysis(response);
    } catch (error) {
      console.error('Error parsing analysis response:', error);
      return this.getMockAnalysis(response);
    }
  }

  /**
   * Update session feedback based on analysis
   */
  updateFeedback(session, analysis) {
    session.feedback.strengths.push(...analysis.strengths);
    session.feedback.areasForImprovement.push(...analysis.weaknesses);
    
    // Calculate running average score
    const totalScore = session.feedback.overallScore * (session.questionCount - 1) + analysis.score;
    session.feedback.overallScore = totalScore / session.questionCount;
  }

  /**
   * Determine next action based on analysis using Gemini AI
   */
  async determineNextAction(session, analysis) {
    const { questionCount, preferences } = session;
    const maxQuestions = Math.floor(preferences.duration / 5); // ~5 minutes per question
    
    if (questionCount >= maxQuestions) {
      return {
        type: 'end_interview',
        message: 'Interview completed. Generating final feedback...'
      };
    }
    
    try {
      if (!this.llm) {
        throw new Error('AI service not available');
      }

      const actionPrompt = `Based on this interview analysis, determine the next action:

ANALYSIS:
- Score: ${analysis.score}/10
- Completeness: ${analysis.completeness}/10
- Technical Accuracy: ${analysis.technicalAccuracy}/10
- Communication: ${analysis.communication}/10
- Strengths: ${analysis.strengths?.join(', ') || 'None'}
- Weaknesses: ${analysis.weaknesses?.join(', ') || 'None'}

INTERVIEW CONTEXT:
- Question Count: ${questionCount}/${maxQuestions}
- Interview Type: ${preferences.interviewType}
- Difficulty: ${preferences.difficulty}

Determine the next action and return ONLY a JSON object:
{
  "type": "next_question|follow_up|cross_question|clarification|end_interview",
  "message": "The message to send to the candidate",
  "reason": "Brief reason for this action"
}

Choose:
- "next_question" if answer was good and we should move to a new topic
- "follow_up" if answer needs more detail
- "cross_question" if answer was poor and needs deeper exploration
- "clarification" if technical accuracy needs improvement
- "end_interview" if we've reached the time limit`;

      const response = await this.llm.invoke([
        new SystemMessage('You are an expert interviewer determining the next action based on candidate performance.'),
        new HumanMessage(actionPrompt)
      ]);

      const actionData = JSON.parse(response.content);
      
      return {
        type: actionData.type || 'next_question',
        message: actionData.message || 'Let me ask you another question.',
        reason: actionData.reason || 'Continuing interview'
      };
    } catch (error) {
      console.error('Error determining next action:', error);
      
      // Fallback logic
      if (analysis.score < 4) {
        return {
          type: 'cross_question',
          message: 'I\'d like to dive deeper into this topic. Can you provide more specific details?',
          reason: 'low_score'
        };
      }
      
      if (analysis.completeness < 5) {
        return {
          type: 'follow_up',
          message: 'That\'s a good start! Can you elaborate on the implementation details?',
          reason: 'incomplete_answer'
        };
      }
      
      return {
        type: 'next_question',
        message: 'Excellent! Let me ask you another question.',
        reason: 'good_answer'
      };
    }
  }

  /**
   * End interview and generate final feedback
   */
  async endInterview(sessionId) {
    const session = this.interviewSessions.get(sessionId);
    if (!session) {
      throw new Error('Interview session not found');
    }

    session.status = 'completed';
    session.endTime = new Date();
    
    // Generate comprehensive final feedback
    const finalFeedback = await this.generateFinalFeedback(session);
    session.feedback = { ...session.feedback, ...finalFeedback };
    
    return session;
  }

  /**
   * Generate comprehensive final feedback
   */
  async generateFinalFeedback(session) {
    try {
      if (this.llm) {
        const feedbackPrompt = `Generate comprehensive final interview feedback:

CANDIDATE: ${session.userProfile.name}
SKILL LEVEL: ${session.userProfile.skillLevel}
DOMAINS: ${session.userProfile.domains?.join(', ')}
QUESTIONS ANSWERED: ${session.questionCount}
OVERALL SCORE: ${session.feedback.overallScore.toFixed(1)}/10

STRENGTHS IDENTIFIED: ${session.feedback.strengths.join(', ')}
AREAS FOR IMPROVEMENT: ${session.feedback.areasForImprovement.join(', ')}

Provide final feedback in this JSON format:
{
  "overallScore": 0-10,
  "summary": "Overall performance summary",
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"],
  "recommendations": ["recommendation1", "recommendation2"],
  "nextSteps": ["next step1", "next step2"]
}`;

        const response = await this.llm.invoke([
          new SystemMessage("You are an expert interview coach providing comprehensive feedback."),
          new HumanMessage(feedbackPrompt)
        ]);

        return this.parseAnalysisResponse(response.content);
      } else {
        return this.getMockFinalFeedback(session);
      }
    } catch (error) {
      console.error('Error generating final feedback:', error);
      return this.getMockFinalFeedback(session);
    }
  }

  /**
   * Get session by ID
   */
  getSession(sessionId) {
    return this.interviewSessions.get(sessionId);
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return `ai_interview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique question ID
   */
  generateQuestionId() {
    return `q_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * Get mock question when Gemini AI is not available (fallback only)
   */
  getMockQuestion(session, questionType) {
    const mockQuestions = {
      opening: `Hello ${session.userProfile.name}! Welcome to your ${session.preferences.interviewType} interview. Let's start with a basic question: Can you tell me about yourself and your experience with ${session.userProfile.domains?.join(', ') || 'programming'}?`,
      technical: `Explain the concept of ${this.getRandomTechnicalTopic(session.userProfile.domains)} and how you would implement it in a real-world scenario.`,
      behavioral: `Tell me about a challenging project you worked on. What was the problem, how did you approach it, and what was the outcome?`,
      system_design: `How would you design a scalable ${this.getRandomSystemDesignTopic()} system? Walk me through your thought process.`,
      follow_up: `That's interesting! Can you elaborate on that point and provide more specific details about your approach?`,
      closing: `Thank you for your time! Do you have any questions for me about the role or the company?`
    };

    return {
      question: mockQuestions[questionType] || mockQuestions.follow_up,
      type: questionType,
      difficulty: session.preferences.difficulty,
      domain: session.userProfile.domains?.[0] || 'General',
      expectedAnswer: 'Comprehensive answer demonstrating knowledge and experience',
      keywords: ['experience', 'knowledge', 'problem-solving']
    };
  }

  /**
   * Get random technical topic based on user domains
   */
  getRandomTechnicalTopic(domains) {
    const topics = {
      'React': 'React hooks and state management',
      'Node.js': 'Node.js event loop and asynchronous programming',
      'Python': 'Python data structures and algorithms',
      'JavaScript': 'JavaScript closures and prototypes',
      'General': 'object-oriented programming principles'
    };

    const domain = domains?.[0] || 'General';
    return topics[domain] || topics['General'];
  }

  /**
   * Get random system design topic
   */
  getRandomSystemDesignTopic() {
    const topics = [
      'social media feed',
      'chat application',
      'file storage',
      'search engine',
      'e-commerce platform',
      'video streaming'
    ];

    return topics[Math.floor(Math.random() * topics.length)];
  }

  /**
   * Get mock analysis when OpenAI is not available
   */
  getMockAnalysis(answer) {
    const score = Math.floor(Math.random() * 4) + 6; // Random score between 6-10
    return {
      score: score,
      strengths: ['Good attempt', 'Shows understanding'],
      weaknesses: ['Could provide more detail'],
      suggestions: ['Elaborate more on your approach'],
      technicalAccuracy: score,
      communication: score - 1,
      completeness: score,
      analysis: 'This is a mock analysis. In a real interview, this would be generated by AI based on your answer.'
    };
  }

  /**
   * Get mock final feedback when OpenAI is not available
   */
  getMockFinalFeedback(session) {
    return {
      overallScore: session.feedback.overallScore,
      summary: 'Interview completed successfully. Good overall performance with room for improvement.',
      strengths: ['Shows technical knowledge', 'Good communication'],
      improvements: ['Provide more detailed examples', 'Practice system design'],
      recommendations: ['Continue practicing technical questions', 'Focus on problem-solving approach'],
      nextSteps: ['Review weak areas', 'Practice more interviews']
    };
  }

  /**
   * Clean up old sessions
   */
  cleanupOldSessions() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    for (const [sessionId, session] of this.interviewSessions) {
      if (session.startTime < oneHourAgo && session.status === 'completed') {
        this.interviewSessions.delete(sessionId);
      }
    }
  }
}

// Create a singleton instance that initializes lazily
let instance = null;

const getAIInterviewerService = () => {
  if (!instance) {
    instance = new AIInterviewerService();
  }
  return instance;
};

export default getAIInterviewerService;