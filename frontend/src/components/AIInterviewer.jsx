import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  MessageCircle, 
  Send, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Brain, 
  Clock, 
  Star,
  Monitor,
  User,
  Eye,
  BarChart3,
  FileText,
  AlertCircle,
  Pause,
  Play,
  PhoneOff,
  Users,
  Download,
  RefreshCw,
  CheckCircle
} from 'lucide-react';
import axios from 'axios';

// Configure axios to use the same base URL and auth as AuthContext
axios.defaults.baseURL = '/api';
const token = localStorage.getItem('token');
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

const AIInterviewer = ({ onClose }) => {
  const { user } = useAuth();
  
  // Provide fallback values when user is not authenticated
  const userData = user || { 
    _id: 'guest-user', 
    name: 'Guest User',
    email: 'guest@example.com'
  };
  
  const [session, setSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [messages, setMessages] = useState([]);
  const [userAnswer, setUserAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [interviewStatus, setInterviewStatus] = useState('not_started'); // not_started, active, paused, completed
  const [analysis, setAnalysis] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);
  const [interviewDuration, setInterviewDuration] = useState(0);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [showParticipants, setShowParticipants] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [expressionAnalysis, setExpressionAnalysis] = useState(null);
  const [interviewMetrics, setInterviewMetrics] = useState({
    confidence: 0,
    engagement: 0,
    clarity: 0,
    technicalAccuracy: 0,
    communication: 0
  });
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);

  const messagesEndRef = useRef(null);
  const timerRef = useRef(null);
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenShareRef = useRef(null);
  const canvasRef = useRef(null);
  const expressionIntervalRef = useRef(null);
  const speechSynthesisRef = useRef(null);

  // Interview preferences
  const [preferences, setPreferences] = useState({
    interviewType: 'technical',
    duration: 30,
    difficulty: 'medium',
    domains: user?.domains || ['General']
  });

  // AI Interviewer personality and behavior
  const [aiPersonality, setAiPersonality] = useState({
    name: 'Sarah',
    tone: 'professional',
    expertise: 'Senior Software Engineer',
    avatar: '🤖',
    interviewStyle: 'dynamic', // dynamic, structured, conversational
    followUpMode: 'aggressive' // aggressive, moderate, gentle
  });

  // Interview conversation state
  const [conversationState, setConversationState] = useState({
    currentTopic: null,
    followUpCount: 0,
    maxFollowUps: 3,
    lastAnswerQuality: 'good', // poor, fair, good, excellent
    interviewPhase: 'opening', // opening, technical, behavioral, closing
    timeSpentOnTopic: 0,
    crossQuestioning: false
  });

  // Dynamic question bank with follow-ups
  const [questionBank, setQuestionBank] = useState({
    technical: [
      {
        id: 'tech-1',
        question: "Tell me about yourself and your technical background.",
        followUps: [
          "What specific technologies are you most comfortable with?",
          "Can you walk me through a challenging project you've worked on?",
          "How do you stay updated with new technologies?",
          "What's your approach to learning new programming languages?"
        ],
        crossQuestions: [
          "That's interesting. Can you elaborate on the technical challenges you faced?",
          "How did you measure the success of that project?",
          "What would you do differently if you had to do it again?",
          "How did you handle the team dynamics in that project?"
        ]
      },
      {
        id: 'tech-2',
        question: "Explain a complex technical problem you solved recently.",
        followUps: [
          "What was your debugging process?",
          "How did you ensure your solution was scalable?",
          "What alternatives did you consider?",
          "How did you test your solution?"
        ],
        crossQuestions: [
          "That approach seems reasonable, but what about edge cases?",
          "How would this solution perform under high load?",
          "What if the requirements changed mid-implementation?",
          "How did you communicate this solution to non-technical stakeholders?"
        ]
      }
    ],
    behavioral: [
      {
        id: 'behav-1',
        question: "Tell me about a time you had to work with a difficult team member.",
        followUps: [
          "How did you approach the situation initially?",
          "What was the outcome?",
          "What did you learn from this experience?",
          "How do you prevent similar situations now?"
        ],
        crossQuestions: [
          "That's a diplomatic approach. What if direct communication didn't work?",
          "How did this affect the project timeline?",
          "What support did you seek from management?",
          "How do you balance being assertive with being collaborative?"
        ]
      }
    ],
    systemDesign: [
      {
        id: 'sys-1',
        question: "Design a URL shortener like bit.ly",
        followUps: [
          "How would you handle high traffic?",
          "What about data consistency?",
          "How would you prevent abuse?",
          "What about analytics?"
        ],
        crossQuestions: [
          "Your design assumes single region. What about global distribution?",
          "How would you handle the case where the same URL is shortened multiple times?",
          "What if you need to support custom short URLs?",
          "How would you implement rate limiting?"
        ]
      }
    ]
  });

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Timer effect
  useEffect(() => {
    if (interviewStatus === 'active') {
      timerRef.current = setInterval(() => {
        setInterviewDuration(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [interviewStatus]);

  // Initialize video stream when component first mounts
  useEffect(() => {
    initializeVideo();
    
    return () => {
      cleanup();
    };
  }, []); // Empty dependency array - run once on mount

  // Start expression analysis when interview becomes active
  useEffect(() => {
    if (interviewStatus === 'active') {
      startExpressionAnalysis();
    }
  }, [interviewStatus]);

  const initializeVideo = async () => {
    try {
      console.log('Requesting camera and microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      console.log('Camera and microphone access granted');
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setIsVideoOn(true);
      setIsAudioOn(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      setIsVideoOn(false);
      setIsAudioOn(false);
      
      // Show user-friendly error message
      if (error.name === 'NotAllowedError') {
        alert('Camera and microphone access denied. Please allow access to use the video feature.');
      } else if (error.name === 'NotFoundError') {
        alert('No camera or microphone found. Please connect a camera and microphone.');
      } else {
        alert('Error accessing camera and microphone. Please check your devices.');
      }
    }
  };

  const handleStartInterview = () => {
    setShowPreferencesModal(false);
    setInterviewStatus('active');
    initializeAIAgent();
  };

  const initializeAIAgent = () => {
    // Initialize AI agent with personality and capabilities
    const aiAgent = {
      name: aiPersonality.name,
      expertise: aiPersonality.expertise,
      currentQuestion: 0,
      totalQuestions: Math.floor(preferences.duration / 5), // Estimated based on duration
      interviewFlow: [], // AI will generate questions dynamically
      analysisData: {
        responses: [],
        expressions: [],
        metrics: [],
        timestamps: []
      }
    };
    
    setSession(prev => ({ ...prev, aiAgent }));
  };

  const generateInterviewFlow = () => {
    // AI will generate questions dynamically based on conversation context
    // No predefined questions - let the AI create them organically
    return [];
  };

  const startExpressionAnalysis = () => {
    if (!isVideoOn) return;
    
    expressionIntervalRef.current = setInterval(() => {
      analyzeFacialExpressions();
    }, 2000); // Analyze every 2 seconds
  };

  const analyzeFacialExpressions = () => {
    // Mock facial expression analysis
    const expressions = {
      confidence: Math.random() * 100,
      engagement: Math.random() * 100,
      stress: Math.random() * 50,
      focus: Math.random() * 100,
      emotion: ['neutral', 'confident', 'thinking', 'concerned'][Math.floor(Math.random() * 4)]
    };
    
    setExpressionAnalysis(expressions);
    
    // Update interview metrics based on expressions
    setInterviewMetrics(prev => ({
      ...prev,
      confidence: (prev.confidence + expressions.confidence) / 2,
      engagement: (prev.engagement + expressions.engagement) / 2
    }));
  };

  const speakAIResponse = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      
      utterance.onstart = () => setAiSpeaking(true);
      utterance.onend = () => setAiSpeaking(false);
      
      speechSynthesisRef.current = utterance;
      speechSynthesis.speak(utterance);
    }
  };

  // Start AI Interview
  const startInterview = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Initialize AI agent with preferences
      const mockSession = {
        id: 'ai-session-' + Date.now(),
        userId: userData._id,
        interviewType: preferences.interviewType,
        duration: preferences.duration,
        difficulty: preferences.difficulty,
        domains: preferences.domains,
        status: 'active',
        questionCount: 0,
        createdAt: new Date(),
        aiAgent: {
          name: aiPersonality.name,
          expertise: aiPersonality.expertise,
          currentQuestion: 0,
          totalQuestions: Math.floor(preferences.duration / 5), // Estimated based on duration
          interviewFlow: [], // AI will generate questions dynamically
          analysisData: {
            responses: [],
            expressions: [],
            metrics: [],
            timestamps: []
          }
        }
      };

      // Initialize conversation state
      setConversationState({
        currentTopic: 'tech-1',
        followUpCount: 0,
        maxFollowUps: 3,
        lastAnswerQuality: 'good',
        interviewPhase: 'technical',
        timeSpentOnTopic: 0,
        crossQuestioning: false
      });
      
      const firstQuestion = questionBank.technical[0];
      
      setSession(mockSession);
      setCurrentQuestion({ 
        id: firstQuestion.id, 
        text: firstQuestion.question, 
        type: preferences.interviewType,
        phase: 'technical'
      });
      setInterviewStatus('active');
      setInterviewDuration(0);
      
      // AI Agent introduction
      const aiIntro = `Hello ${userData.name}! I'm ${aiPersonality.name}, your AI interviewer. I'm a ${aiPersonality.expertise} with expertise in ${preferences.domains.join(', ')}. I'll be conducting your ${preferences.interviewType} interview today with ${preferences.difficulty} difficulty level questions. I'll generate questions dynamically based on our conversation and your responses. The interview will last approximately ${preferences.duration} minutes. Let's begin!`;
      
      setMessages([
        {
          id: 'ai-intro',
          type: 'ai',
          content: aiIntro,
          timestamp: new Date(),
          isAI: true
        },
        {
          id: firstQuestion.id,
          type: 'ai',
          content: firstQuestion.question,
          question: { 
            id: firstQuestion.id, 
            text: firstQuestion.question, 
            type: preferences.interviewType,
            phase: 'technical'
          },
          timestamp: new Date(),
          isAI: true
        }
      ]);

      // Speak the AI introduction
      speakAIResponse(aiIntro + ' ' + firstQuestion.question);

    } catch (error) {
      console.error('Error starting interview:', error);
      setError(error.response?.data?.message || 'Failed to start interview');
    } finally {
      setIsLoading(false);
    }
  };

  // AI Behavior Functions
  const analyzeAnswerQuality = (answer) => {
    // Mock analysis - in real implementation, this would use NLP
    const answerLength = answer.length;
    const hasTechnicalTerms = /(algorithm|database|API|framework|library|function|class|method|variable|loop|condition|recursion|optimization|scalability|performance|security|testing|debugging|deployment|architecture|design pattern)/i.test(answer);
    const hasExamples = /(for example|for instance|let me explain|consider|imagine|suppose)/i.test(answer);
    const hasProcess = /(first|then|next|finally|step|process|approach|method)/i.test(answer);
    
    let quality = 'poor';
    let score = 0;
    
    if (answerLength > 50) score += 1;
    if (hasTechnicalTerms) score += 2;
    if (hasExamples) score += 2;
    if (hasProcess) score += 1;
    
    if (score >= 5) quality = 'excellent';
    else if (score >= 3) quality = 'good';
    else if (score >= 1) quality = 'fair';
    
    return { quality, score };
  };

  const getNextQuestion = () => {
    const currentPhase = conversationState.interviewPhase;
    const currentTopic = conversationState.currentTopic;
    const followUpCount = conversationState.followUpCount;
    const lastAnswerQuality = conversationState.lastAnswerQuality;
    
    // Determine if we should ask follow-up or cross-question
    const shouldCrossQuestion = lastAnswerQuality === 'poor' || lastAnswerQuality === 'fair';
    const shouldFollowUp = followUpCount < conversationState.maxFollowUps && !shouldCrossQuestion;
    
    let nextQuestion = null;
    
    if (shouldCrossQuestion && currentTopic) {
      // Get cross-question for current topic
      const topicQuestions = questionBank[currentPhase] || questionBank.technical;
      const currentQuestionData = topicQuestions.find(q => q.id === currentTopic);
      
      if (currentQuestionData && currentQuestionData.crossQuestions.length > 0) {
        const randomCrossQuestion = currentQuestionData.crossQuestions[
          Math.floor(Math.random() * currentQuestionData.crossQuestions.length)
        ];
        nextQuestion = {
          id: `cross-${Date.now()}`,
          text: randomCrossQuestion,
          type: 'cross-question',
          phase: currentPhase
        };
        
        setConversationState(prev => ({
          ...prev,
          crossQuestioning: true,
          followUpCount: prev.followUpCount + 1
        }));
      }
    } else if (shouldFollowUp && currentTopic) {
      // Get follow-up question
      const topicQuestions = questionBank[currentPhase] || questionBank.technical;
      const currentQuestionData = topicQuestions.find(q => q.id === currentTopic);
      
      if (currentQuestionData && currentQuestionData.followUps.length > 0) {
        const randomFollowUp = currentQuestionData.followUps[
          Math.floor(Math.random() * currentQuestionData.followUps.length)
        ];
        nextQuestion = {
          id: `followup-${Date.now()}`,
          text: randomFollowUp,
          type: 'follow-up',
          phase: currentPhase
        };
        
        setConversationState(prev => ({
          ...prev,
          followUpCount: prev.followUpCount + 1
        }));
      }
    }
    
    // If no follow-up/cross-question, move to next topic
    if (!nextQuestion) {
      const phases = ['opening', 'technical', 'behavioral', 'systemDesign', 'closing'];
      const currentPhaseIndex = phases.indexOf(currentPhase);
      const nextPhase = phases[currentPhaseIndex + 1] || 'closing';
      
      if (nextPhase === 'closing') {
        nextQuestion = {
          id: 'closing',
          text: "Thank you for your time today. Do you have any questions for me about the role or the company?",
          type: 'closing',
          phase: 'closing'
        };
      } else {
        const topicQuestions = questionBank[nextPhase] || questionBank.technical;
        const randomQuestion = topicQuestions[Math.floor(Math.random() * topicQuestions.length)];
        
        nextQuestion = {
          id: randomQuestion.id,
          text: randomQuestion.question,
          type: 'main',
          phase: nextPhase
        };
        
        setConversationState(prev => ({
          ...prev,
          interviewPhase: nextPhase,
          currentTopic: randomQuestion.id,
          followUpCount: 0,
          crossQuestioning: false,
          timeSpentOnTopic: 0
        }));
      }
    }
    
    return nextQuestion;
  };

  const getAIResponse = (userAnswer) => {
    const analysis = analyzeAnswerQuality(userAnswer);
    const responses = {
      excellent: [
        "Excellent answer! That shows strong understanding.",
        "Very well explained. I can see you have solid experience.",
        "Great approach. That demonstrates good problem-solving skills.",
        "Impressive! You clearly know what you're talking about."
      ],
      good: [
        "Good answer. Can you elaborate on that?",
        "That's a solid approach. Tell me more about...",
        "I see. What about the technical details?",
        "Interesting perspective. How did you handle...?"
      ],
      fair: [
        "I see what you mean. Let me dig deeper into this...",
        "That's one approach. What other options did you consider?",
        "Okay, but what about the challenges you faced?",
        "I understand. However, what if the situation was different?"
      ],
      poor: [
        "I'm not sure I follow. Can you be more specific?",
        "That seems unclear. Can you walk me through this step by step?",
        "I need more details. What exactly did you do?",
        "Let me ask this differently. How would you..."
      ]
    };
    
    const randomResponse = responses[analysis.quality][
      Math.floor(Math.random() * responses[analysis.quality].length)
    ];
    
    return {
      response: randomResponse,
      analysis: analysis
    };
  };

  // Submit answer with dynamic AI analysis
  const submitAnswer = async () => {
    if (!userAnswer.trim() || !session) return;

    setIsLoading(true);
    setError(null);

    try {
      // Add user message
      const userMessage = {
        id: `user_${Date.now()}`,
        type: 'user',
        content: userAnswer,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);

      // Analyze answer quality
      const answerAnalysis = analyzeAnswerQuality(userAnswer);
      
      // Update conversation state with answer quality
      setConversationState(prev => ({
        ...prev,
        lastAnswerQuality: answerAnalysis.quality,
        timeSpentOnTopic: prev.timeSpentOnTopic + 1
      }));

      // Store response for analysis
      const responseData = {
        question: currentQuestion.text,
        answer: userAnswer,
        quality: answerAnalysis.quality,
        score: answerAnalysis.score,
        timestamp: new Date(),
        duration: interviewDuration,
        expressions: expressionAnalysis,
        metrics: interviewMetrics
      };

      setSession(prev => ({
        ...prev,
        aiAgent: {
          ...prev.aiAgent,
          analysisData: {
            ...prev.aiAgent.analysisData,
            responses: [...prev.aiAgent.analysisData.responses, responseData]
          }
        }
      }));

      // AI Agent response and next question
      setTimeout(() => {
        // Get AI response to the answer
        const aiResponse = getAIResponse(userAnswer);
        
        // Get next question based on conversation state
        const nextQuestion = getNextQuestion();
        
        // Add AI response message
        const aiResponseMessage = {
          id: `ai_response_${Date.now()}`,
          type: 'ai',
          content: aiResponse.response,
          timestamp: new Date(),
          isAI: true,
          analysis: aiResponse.analysis
        };
        
        // Add next question message
        const nextQuestionMessage = {
          id: nextQuestion.id,
          type: 'ai',
          content: nextQuestion.text,
          question: nextQuestion,
          timestamp: new Date(),
          isAI: true
        };
        
        setMessages(prev => [...prev, aiResponseMessage, nextQuestionMessage]);
        setCurrentQuestion(nextQuestion);
        
        // Update session with question count
        setSession(prev => ({
          ...prev,
          questionCount: prev.questionCount + 1,
          aiAgent: {
            ...prev.aiAgent,
            currentQuestion: prev.aiAgent.currentQuestion + 1
          }
        }));
        
        // Speak AI response
        speakAIResponse(aiResponse.response + ' ' + nextQuestion.text);
        
        // Check if interview should end
        if (nextQuestion.type === 'closing' || interviewDuration > preferences.duration * 60) {
          setTimeout(() => {
            endInterview();
          }, 5000); // Give 5 seconds for closing question
        }
        
      }, 1500); // Reduced delay for more dynamic feel

      setUserAnswer('');

    } catch (error) {
      console.error('Error submitting answer:', error);
      setError(error.response?.data?.message || 'Failed to submit answer');
    } finally {
      setIsLoading(false);
    }
  };

  const generateAIFeedback = (answer, question) => {
    const feedbacks = [
      "That's a good point. I can see you have solid understanding of the fundamentals.",
      "Interesting approach! Let me ask you to elaborate on that aspect.",
      "Good answer! I appreciate the practical examples you provided.",
      "That shows good problem-solving thinking. Let's explore this further.",
      "Excellent! Your experience really shows in that response."
    ];
    
    return feedbacks[Math.floor(Math.random() * feedbacks.length)];
  };

  // End interview with comprehensive analysis
  const endInterview = async () => {
    if (!session) return;

    setIsLoading(true);
    setError(null);

    try {
      // Generate comprehensive analysis
      const comprehensiveAnalysis = generateComprehensiveAnalysis(session.aiAgent.analysisData);
      
      setAnalysis(comprehensiveAnalysis);
      setInterviewStatus('completed');

      // Add final analysis message
      const finalMessage = {
        id: 'final-analysis',
        type: 'ai',
        content: `🎉 Interview Complete!\n\n**Overall Performance: ${comprehensiveAnalysis.overallScore}/10**\n\n**Detailed Analysis:**\n${comprehensiveAnalysis.detailedAnalysis}\n\n**Strengths:**\n${comprehensiveAnalysis.strengths.map(s => `• ${s}`).join('\n')}\n\n**Areas for Improvement:**\n${comprehensiveAnalysis.improvements.map(i => `• ${i}`).join('\n')}\n\n**Recommendations:**\n${comprehensiveAnalysis.recommendations.map(r => `• ${r}`).join('\n')}\n\n**Next Steps:**\n${comprehensiveAnalysis.nextSteps.map(n => `• ${n}`).join('\n')}`,
        timestamp: new Date(),
        isAI: true,
        isFinalAnalysis: true
      };
      
      setMessages(prev => [...prev, finalMessage]);

      // Speak final analysis
      speakAIResponse(`Interview completed! Your overall score is ${comprehensiveAnalysis.overallScore} out of 10. ${comprehensiveAnalysis.detailedAnalysis}`);

    } catch (error) {
      console.error('Error ending interview:', error);
      setError(error.response?.data?.message || 'Failed to end interview');
    } finally {
      setIsLoading(false);
    }
  };

  const generateComprehensiveAnalysis = (analysisData) => {
    const responses = analysisData.responses;
    const avgConfidence = responses.reduce((sum, r) => sum + (r.expressions?.confidence || 0), 0) / responses.length;
    const avgEngagement = responses.reduce((sum, r) => sum + (r.expressions?.engagement || 0), 0) / responses.length;
    
    const overallScore = Math.round((avgConfidence + avgEngagement + 80) / 3); // Base score + expression analysis
    
    return {
      overallScore,
      detailedAnalysis: `Based on your responses and facial expressions throughout the interview, you demonstrated ${overallScore >= 8 ? 'strong' : overallScore >= 6 ? 'good' : 'developing'} technical knowledge and communication skills. Your confidence level averaged ${Math.round(avgConfidence)}% and engagement was ${Math.round(avgEngagement)}%.`,
      strengths: [
        'Clear communication and articulation',
        'Good technical foundation',
        'Structured problem-solving approach',
        'Professional demeanor',
        'Willingness to elaborate on answers'
      ],
      improvements: [
        'Provide more specific technical examples',
        'Discuss scalability and performance considerations',
        'Include real-world implementation details',
        'Mention testing and debugging strategies',
        'Show more confidence in technical discussions'
      ],
      recommendations: [
        'Practice explaining complex concepts simply',
        'Study system design patterns and best practices',
        'Prepare specific examples from your experience',
        'Work on technical communication skills',
        'Practice mock interviews regularly'
      ],
      nextSteps: [
        'Review the questions you found challenging',
        'Practice coding problems in your domain',
        'Study system design fundamentals',
        'Prepare more detailed project examples',
        'Consider taking advanced courses in your field'
      ],
      metrics: {
        confidence: avgConfidence,
        engagement: avgEngagement,
        technicalAccuracy: 85,
        communication: 88,
        problemSolving: 82
      }
    };
  };

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (expressionIntervalRef.current) {
      clearInterval(expressionIntervalRef.current);
    }
    if (speechSynthesisRef.current) {
      speechSynthesis.cancel();
    }
  };

  // Toggle video: ensure stream exists and toggle track enabled, reacquire if needed
  const toggleVideo = async () => {
    try {
      // If screen sharing is active, stop it before toggling camera
      if (isScreenSharing) {
        await stopScreenShare();
      }

      // If no stream, acquire one
      if (!localStreamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: isAudioOn
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setIsVideoOn(true);
        return;
      }

      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (!videoTrack) {
        // Reacquire video track
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: isAudioOn });
        const newVideoTrack = stream.getVideoTracks()[0];
        // Replace video tracks in the existing stream
        localStreamRef.current.addTrack(newVideoTrack);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
        setIsVideoOn(true);
        return;
      }

      // Toggle enabled flag
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOn(videoTrack.enabled);
    } catch (err) {
      console.error('Error toggling video:', err);
      setIsVideoOn(false);
    }
  };

  // Toggle audio track enabled
  const toggleAudio = async () => {
    try {
      if (!localStreamRef.current) {
        // Acquire audio-only if needed
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current && !localVideoRef.current.srcObject) {
          localVideoRef.current.srcObject = stream;
        }
      }
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioOn(audioTrack.enabled);
      } else {
        // No audio track, try to add one
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const newAudioTrack = audioStream.getAudioTracks()[0];
        localStreamRef.current.addTrack(newAudioTrack);
        setIsAudioOn(true);
      }
    } catch (err) {
      console.error('Error toggling audio:', err);
      setIsAudioOn(false);
    }
  };

  // Screen share controls
  const stopScreenShare = async () => {
    try {
      // Clear screen share component
      if (screenShareRef.current) {
        screenShareRef.current.srcObject = null;
      }
      // Revert to camera
      if (!localStreamRef.current || localStreamRef.current.getVideoTracks().length === 0) {
        const camStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: isAudioOn });
        localStreamRef.current = camStream;
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    } catch (err) {
      console.error('Error stopping screen share:', err);
    } finally {
      setIsScreenSharing(false);
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: true
        });
        
        // Show screen share in separate component
        if (screenShareRef.current) {
          screenShareRef.current.srcObject = screenStream;
        }
        
        setIsScreenSharing(true);
        const [videoTrack] = screenStream.getVideoTracks();
        if (videoTrack) {
          videoTrack.onended = () => {
            stopScreenShare();
          };
        }
      } else {
        await stopScreenShare();
      }
    } catch (err) {
      if (err?.name === 'NotAllowedError') {
        console.log('Screen share permission denied');
      } else {
        console.error('Error toggling screen share:', err);
      }
    }
  };

  // Format duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitAnswer();
    }
  };

  if (interviewStatus === 'not_started') {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2">AI Interviewer Agent</h1>
            <p className="text-gray-400">Meet Alex, your intelligent AI interviewer with dynamic cross-questioning and adaptive interview flow</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">AI Agent Capabilities</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="flex items-center space-x-3">
                <Eye className="w-6 h-6 text-blue-400" />
                <span>Dynamic Cross-Questioning</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mic className="w-6 h-6 text-green-400" />
                <span>Real-time Voice Synthesis</span>
              </div>
              <div className="flex items-center space-x-3">
                <BarChart3 className="w-6 h-6 text-purple-400" />
                <span>Answer Quality Analysis</span>
              </div>
              <div className="flex items-center space-x-3">
                <FileText className="w-6 h-6 text-orange-400" />
                <span>Adaptive Interview Flow</span>
              </div>
            </div>
            
            <h3 className="text-lg font-semibold mb-4">Interview Preferences</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Interview Type</label>
                <select
                  value={preferences.interviewType}
                  onChange={(e) => setPreferences(prev => ({ ...prev, interviewType: e.target.value }))}
                  className="w-full p-4 bg-gray-800 border border-gray-600 rounded-xl text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 hover:border-gray-500"
                >
                  <option value="technical">Technical</option>
                  <option value="behavioral">Behavioral</option>
                  <option value="system_design">System Design</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Duration</label>
                <select
                  value={preferences.duration}
                  onChange={(e) => setPreferences(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                  className="w-full p-4 bg-gray-800 border border-gray-600 rounded-xl text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 hover:border-gray-500"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Difficulty Level</label>
                <select
                  value={preferences.difficulty}
                  onChange={(e) => setPreferences(prev => ({ ...prev, difficulty: e.target.value }))}
                  className="w-full p-4 bg-gray-800 border border-gray-600 rounded-xl text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 hover:border-gray-500"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Focus Areas</label>
                <input
                  type="text"
                  value={preferences.domains.join(', ')}
                  onChange={(e) => setPreferences(prev => ({ 
                    ...prev, 
                    domains: e.target.value.split(',').map(d => d.trim()).filter(d => d) 
                  }))}
                  placeholder="e.g., React, Node.js, Python"
                  className="w-full p-4 bg-gray-800 border border-gray-600 rounded-xl text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 hover:border-gray-500 placeholder-gray-400"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-red-400">{error}</span>
              </div>
            </div>
          )}

          <div className="text-center">
            <button
              onClick={startInterview}
              disabled={isLoading}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold rounded-lg transition-colors flex items-center space-x-2 mx-auto"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Starting AI Interview...</span>
                </>
              ) : (
                <>
                  <Brain className="w-5 h-5" />
                  <span>Start AI Agent Interview</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Preferences Modal
  if (showPreferencesModal) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">AI Interview Preferences</h2>
            <p className="text-gray-400">Configure your interview settings to get the best experience</p>
          </div>

          {/* Preferences Form */}
          <div className="space-y-6">
            {/* Interview Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Interview Type</label>
              <select
                value={preferences.interviewType}
                onChange={(e) => setPreferences(prev => ({ ...prev, interviewType: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:bg-gray-600"
              >
                <option value="technical">Technical Interview</option>
                <option value="behavioral">Behavioral Interview</option>
                <option value="system-design">System Design</option>
                <option value="coding">Coding Interview</option>
                <option value="mixed">Mixed Interview</option>
              </select>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Duration (minutes)</label>
              <select
                value={preferences.duration}
                onChange={(e) => setPreferences(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:bg-gray-600"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Difficulty Level</label>
              <select
                value={preferences.difficulty}
                onChange={(e) => setPreferences(prev => ({ ...prev, difficulty: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:bg-gray-600"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="expert">Expert</option>
              </select>
            </div>

            {/* Domains */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Focus Areas</label>
              <input
                type="text"
                value={preferences.domains.join(', ')}
                onChange={(e) => setPreferences(prev => ({ ...prev, domains: e.target.value.split(',').map(d => d.trim()).filter(d => d) }))}
                placeholder="e.g., React, Node.js, Python, Machine Learning"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:bg-gray-600 placeholder-gray-400"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4 mt-8">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleStartInterview}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <Brain className="w-5 h-5" />
              <span>Start Interview</span>
            </button>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">AI Agent Interview</h1>
              <div className="flex items-center space-x-4 text-sm text-gray-400">
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatDuration(interviewDuration)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4" />
                  <span>Score: {analysis?.overallScore?.toFixed(1) || '0.0'}/10</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Brain className="w-4 h-4" />
                  <span>Phase: {conversationState.interviewPhase}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setInterviewStatus(prev => prev === 'active' ? 'paused' : 'active')}
              className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title={interviewStatus === 'active' ? 'Pause' : 'Resume'}
            >
              {interviewStatus === 'active' ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
            >
              <PhoneOff className="w-4 h-4" />
              <span>End Interview</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Main Interview Area */}
        <div className="flex-1 flex flex-col">
          {/* AI Agent Status Bar */}
          <div className="bg-gray-800 p-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{aiPersonality.name} - Your AI Interviewer</h3>
                  <p className="text-sm text-gray-400">{aiPersonality.expertise}</p>
                </div>
              </div>
              {aiSpeaking && (
                <div className="flex items-center space-x-2 text-green-400">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                  </div>
                  <span className="text-sm">AI is speaking...</span>
                </div>
              )}
            </div>
          </div>

          {/* User Video Area */}
          <div className="flex-1 bg-gray-800 p-6">
            <div className="h-full flex items-center justify-center">
              <div className="w-full max-w-4xl">
                {/* User Video */}
                <div className="bg-gray-700 rounded-lg overflow-hidden relative">
                  {isVideoOn ? (
                    <>
                      <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        className="w-full h-96 object-cover"
                      />
                      <canvas
                        ref={canvasRef}
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        style={{opacity: 0.3}}
                      />
                    </>
                  ) : (
                    <div className="h-96 flex items-center justify-center">
                      <div className="w-24 h-24 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="w-12 h-12 text-white" />
                      </div>
                    </div>
                  )}
                  <div className="p-4 bg-gray-800">
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-medium text-gray-300">{userData.name}</p>
                      {expressionAnalysis && (
                        <div className="text-sm">
                          <div className="text-green-400">Confidence: {Math.round(expressionAnalysis.confidence)}%</div>
                          <div className="text-blue-400">Engagement: {Math.round(expressionAnalysis.engagement)}%</div>
                          <div className="text-yellow-400">Emotion: {expressionAnalysis.emotion}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Screen Share Component */}
          {isScreenSharing && (
            <div className="bg-gray-800 border-t border-gray-700 p-4">
              <div className="bg-gray-900 rounded-xl overflow-hidden shadow-2xl border-2 border-blue-500">
                <div className="p-3 bg-blue-600 text-white text-sm font-medium flex items-center space-x-2">
                  <Monitor className="w-4 h-4" />
                  <span>Screen Sharing</span>
                </div>
                <video
                  ref={screenShareRef}
                  autoPlay
                  className="w-full h-64 object-contain bg-black"
                />
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="bg-gray-800 p-4 border-t border-gray-700">
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={toggleAudio}
                className={`p-3 rounded-full transition-colors ${
                  isAudioOn ? 'bg-gray-600 hover:bg-gray-500' : 'bg-red-600 hover:bg-red-700'
                }`}
                title={isAudioOn ? 'Mute' : 'Unmute'}
              >
                {isAudioOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
              </button>

              <button
                onClick={toggleVideo}
                className={`p-3 rounded-full transition-colors ${
                  isVideoOn ? 'bg-gray-600 hover:bg-gray-500' : 'bg-red-600 hover:bg-red-700'
                }`}
                title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
              >
                {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
              </button>

              <button
                onClick={toggleScreenShare}
                className={`p-3 rounded-full transition-colors ${
                  isScreenSharing 
                    ? 'bg-blue-600 hover:bg-blue-500' 
                    : 'bg-gray-600 hover:bg-gray-500'
                }`}
                title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
              >
                <Monitor className="w-6 h-6" />
              </button>

              <button
                onClick={() => setShowChat(!showChat)}
                className={`p-3 rounded-full transition-colors ${
                  showChat ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-500'
                }`}
                title="Toggle chat"
              >
                <MessageCircle className="w-6 h-6" />
              </button>

              <button
                onClick={() => setShowParticipants(!showParticipants)}
                className={`p-3 rounded-full transition-colors ${
                  showParticipants ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-500'
                }`}
                title="Participants"
              >
                <Users className="w-6 h-6" />
              </button>

              <button
                onClick={onClose}
                className="p-3 bg-red-600 hover:bg-red-700 rounded-full transition-colors"
                title="End interview"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Chat Sidebar */}
        <div className={`${showChat ? 'w-96' : 'w-0'} transition-all duration-300 bg-gray-800 border-l border-gray-700 overflow-hidden`}>
          {showChat && (
            <div className="h-full flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Interview Chat</h3>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 p-4 overflow-y-auto">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs p-3 rounded-lg ${
                          message.type === 'user'
                            ? 'bg-blue-600 text-white'
                            : message.isAI
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-700 text-gray-100'
                        }`}
                      >
                        {message.isAI && (
                          <div className="flex items-center space-x-2 mb-2">
                            <Brain className="w-4 h-4" />
                            <span className="text-xs font-semibold">{aiPersonality.name}</span>
                          </div>
                        )}
                        <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                        <div className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-purple-600 p-3 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Brain className="w-4 h-4" />
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span className="text-sm">AI Agent is thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Text Input Area */}
              {interviewStatus === 'active' && (
                <div className="p-4 border-t border-gray-700">
                  <div className="flex space-x-2">
                    <textarea
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your answer here..."
                      className="flex-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 resize-none text-sm"
                      rows={2}
                      disabled={isLoading}
                    />
                    <button
                      onClick={submitAnswer}
                      disabled={!userAnswer.trim() || isLoading}
                      className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors flex items-center"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Analysis Panel */}
      {interviewStatus === 'completed' && analysis && (
        <div className="bg-gray-800 border-t border-gray-700 p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center space-x-2">
                <BarChart3 className="w-6 h-6 text-blue-400" />
                <span>Comprehensive Interview Analysis</span>
              </h2>
              <div className="flex space-x-2">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>Download Report</span>
                </button>
                <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4" />
                  <span>Retake Interview</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Overall Score */}
              <div className="bg-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Overall Performance</h3>
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-400 mb-2">{analysis.overallScore}/10</div>
                  <div className="text-sm text-gray-400">Overall Score</div>
                </div>
              </div>

              {/* Metrics */}
              <div className="bg-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Confidence</span>
                      <span>{Math.round(analysis.metrics.confidence)}%</span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{width: `${analysis.metrics.confidence}%`}}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Engagement</span>
                      <span>{Math.round(analysis.metrics.engagement)}%</span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{width: `${analysis.metrics.engagement}%`}}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Technical Accuracy</span>
                      <span>{analysis.metrics.technicalAccuracy}%</span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{width: `${analysis.metrics.technicalAccuracy}%`}}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Key Recommendations</h3>
                <ul className="space-y-2 text-sm">
                  {analysis.recommendations.slice(0, 3).map((rec, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIInterviewer;