import React, { useState, useEffect } from 'react';
import { 
  Star, 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  User, 
  Brain, 
  Target, 
  TrendingUp, 
  Award,
  Send,
  Save,
  FileText,
  BarChart3,
  Lightbulb,
  Users,
  Zap
} from 'lucide-react';
import axios from 'axios';

// Configure axios
axios.defaults.baseURL = '/api';
const token = localStorage.getItem('token');
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

const HumanFeedbackForm = ({ 
  interviewSession, 
  interviewee, 
  onFeedbackSubmit, 
  onClose,
  isVisible = true 
}) => {
  const [feedback, setFeedback] = useState({
    // Overall Assessment
    overallRating: 0,
    overallComments: '',
    
    // Technical Skills
    technicalKnowledge: 0,
    technicalComments: '',
    problemSolving: 0,
    problemSolvingComments: '',
    codeQuality: 0,
    codeQualityComments: '',
    
    // Communication Skills
    communication: 0,
    communicationComments: '',
    clarity: 0,
    clarityComments: '',
    articulation: 0,
    articulationComments: '',
    
    // Soft Skills
    confidence: 0,
    confidenceComments: '',
    professionalism: 0,
    professionalismComments: '',
    adaptability: 0,
    adaptabilityComments: '',
    
    // Specific Areas
    strengths: [],
    weaknesses: [],
    improvements: [],
    
    // Detailed Feedback
    detailedFeedback: '',
    recommendations: '',
    nextSteps: '',
    
    // Interview Specific
    questionQuality: 0,
    answerCompleteness: 0,
    timeManagement: 0,
    engagement: 0,
    
    // Additional Comments
    additionalComments: '',
    wouldRecommend: null,
    hireDecision: null
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentSection, setCurrentSection] = useState('overall');
  const [errors, setErrors] = useState({});

  const sections = [
    { id: 'overall', title: 'Overall Assessment', icon: Star },
    { id: 'technical', title: 'Technical Skills', icon: Brain },
    { id: 'communication', title: 'Communication', icon: MessageSquare },
    { id: 'soft-skills', title: 'Soft Skills', icon: Users },
    { id: 'specific', title: 'Specific Areas', icon: Target },
    { id: 'detailed', title: 'Detailed Feedback', icon: FileText },
    { id: 'interview', title: 'Interview Performance', icon: BarChart3 },
    { id: 'final', title: 'Final Assessment', icon: Award }
  ];

  const ratingLabels = {
    1: 'Poor',
    2: 'Below Average',
    3: 'Average',
    4: 'Good',
    5: 'Excellent'
  };

  const strengthOptions = [
    'Strong technical knowledge',
    'Clear communication',
    'Good problem-solving approach',
    'Professional demeanor',
    'Quick learner',
    'Team player',
    'Attention to detail',
    'Creative thinking',
    'Leadership potential',
    'Adaptability',
    'Time management',
    'Code quality',
    'System design thinking',
    'Testing mindset',
    'Documentation skills'
  ];

  const weaknessOptions = [
    'Limited technical depth',
    'Unclear communication',
    'Weak problem-solving',
    'Lack of confidence',
    'Poor time management',
    'Incomplete answers',
    'No real-world examples',
    'Weak system design',
    'Poor code quality',
    'Lack of testing knowledge',
    'No scalability considerations',
    'Weak debugging skills',
    'Poor documentation',
    'Limited experience',
    'Lack of preparation'
  ];

  const improvementOptions = [
    'Practice technical concepts',
    'Improve communication skills',
    'Work on problem-solving approach',
    'Build confidence',
    'Practice coding problems',
    'Study system design',
    'Learn testing strategies',
    'Work on time management',
    'Prepare real-world examples',
    'Study scalability patterns',
    'Practice debugging',
    'Improve documentation',
    'Gain more experience',
    'Practice mock interviews',
    'Study industry best practices'
  ];

  const handleRatingChange = (field, value) => {
    setFeedback(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user provides rating
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleTextChange = (field, value) => {
    setFeedback(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayChange = (field, value) => {
    setFeedback(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateSection = (sectionId) => {
    const newErrors = {};
    
    switch (sectionId) {
      case 'overall':
        if (!feedback.overallRating) newErrors.overallRating = 'Please provide an overall rating';
        if (!feedback.overallComments.trim()) newErrors.overallComments = 'Please provide overall comments';
        break;
      case 'technical':
        if (!feedback.technicalKnowledge) newErrors.technicalKnowledge = 'Please rate technical knowledge';
        if (!feedback.problemSolving) newErrors.problemSolving = 'Please rate problem-solving skills';
        break;
      case 'communication':
        if (!feedback.communication) newErrors.communication = 'Please rate communication skills';
        if (!feedback.clarity) newErrors.clarity = 'Please rate clarity of expression';
        break;
      case 'soft-skills':
        if (!feedback.confidence) newErrors.confidence = 'Please rate confidence level';
        if (!feedback.professionalism) newErrors.professionalism = 'Please rate professionalism';
        break;
      case 'specific':
        if (feedback.strengths.length === 0) newErrors.strengths = 'Please select at least one strength';
        if (feedback.weaknesses.length === 0) newErrors.weaknesses = 'Please select at least one area for improvement';
        break;
      case 'detailed':
        if (!feedback.detailedFeedback.trim()) newErrors.detailedFeedback = 'Please provide detailed feedback';
        break;
      case 'interview':
        if (!feedback.questionQuality) newErrors.questionQuality = 'Please rate question quality';
        if (!feedback.answerCompleteness) newErrors.answerCompleteness = 'Please rate answer completeness';
        break;
      case 'final':
        if (feedback.wouldRecommend === null) newErrors.wouldRecommend = 'Please indicate if you would recommend this candidate';
        if (feedback.hireDecision === null) newErrors.hireDecision = 'Please provide hiring decision';
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextSection = () => {
    if (validateSection(currentSection)) {
      const currentIndex = sections.findIndex(s => s.id === currentSection);
      if (currentIndex < sections.length - 1) {
        setCurrentSection(sections[currentIndex + 1].id);
      }
    }
  };

  const handlePrevSection = () => {
    const currentIndex = sections.findIndex(s => s.id === currentSection);
    if (currentIndex > 0) {
      setCurrentSection(sections[currentIndex - 1].id);
    }
  };

  const handleSubmit = async () => {
    // Validate all sections
    let allValid = true;
    sections.forEach(section => {
      if (!validateSection(section.id)) {
        allValid = false;
      }
    });

    if (!allValid) {
      alert('Please complete all required fields before submitting feedback.');
      return;
    }

    setIsSubmitting(true);
    try {
      const feedbackData = {
        ...feedback,
        interviewSessionId: interviewSession?.id,
        intervieweeId: interviewee?.id,
        interviewerId: localStorage.getItem('userId'),
        submittedAt: new Date(),
        type: 'human_feedback'
      };

      // Submit to backend
      await axios.post('/interviews/feedback', feedbackData);
      
      // Call parent callback
      if (onFeedbackSubmit) {
        onFeedbackSubmit(feedbackData);
      }
      
      alert('Feedback submitted successfully!');
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderRatingField = (field, label, commentField) => (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-300 mb-3">
        {label}
        <span className="text-red-400 ml-1">*</span>
      </label>
      
      <div className="flex items-center space-x-2 mb-3">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => handleRatingChange(field, rating)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              feedback[field] >= rating
                ? 'bg-blue-600 text-white'
                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
            }`}
          >
            <Star className="w-5 h-5" />
          </button>
        ))}
        <span className="text-sm text-gray-400 ml-2">
          {feedback[field] ? ratingLabels[feedback[field]] : 'Select rating'}
        </span>
      </div>
      
      {errors[field] && (
        <div className="text-red-400 text-sm mb-2 flex items-center">
          <AlertCircle className="w-4 h-4 mr-1" />
          {errors[field]}
        </div>
      )}
      
      <textarea
        value={feedback[commentField]}
        onChange={(e) => handleTextChange(commentField, e.target.value)}
        placeholder={`Comments on ${label.toLowerCase()}...`}
        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 resize-none"
        rows={3}
      />
    </div>
  );

  const renderCheckboxGroup = (field, options, label) => (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-300 mb-3">
        {label}
        <span className="text-red-400 ml-1">*</span>
      </label>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {options.map((option) => (
          <label key={option} className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={feedback[field].includes(option)}
              onChange={(e) => {
                if (e.target.checked) {
                  handleArrayChange(field, [...feedback[field], option]);
                } else {
                  handleArrayChange(field, feedback[field].filter(item => item !== option));
                }
              }}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-300">{option}</span>
          </label>
        ))}
      </div>
      
      {errors[field] && (
        <div className="text-red-400 text-sm mt-2 flex items-center">
          <AlertCircle className="w-4 h-4 mr-1" />
          {errors[field]}
        </div>
      )}
    </div>
  );

  const renderSection = () => {
    switch (currentSection) {
      case 'overall':
        return (
          <div>
            <h3 className="text-xl font-semibold mb-6 flex items-center">
              <Star className="w-6 h-6 mr-2 text-yellow-400" />
              Overall Assessment
            </h3>
            {renderRatingField('overallRating', 'Overall Performance', 'overallComments')}
          </div>
        );

      case 'technical':
        return (
          <div>
            <h3 className="text-xl font-semibold mb-6 flex items-center">
              <Brain className="w-6 h-6 mr-2 text-blue-400" />
              Technical Skills Assessment
            </h3>
            {renderRatingField('technicalKnowledge', 'Technical Knowledge', 'technicalComments')}
            {renderRatingField('problemSolving', 'Problem-Solving Skills', 'problemSolvingComments')}
            {renderRatingField('codeQuality', 'Code Quality & Best Practices', 'codeQualityComments')}
          </div>
        );

      case 'communication':
        return (
          <div>
            <h3 className="text-xl font-semibold mb-6 flex items-center">
              <MessageSquare className="w-6 h-6 mr-2 text-green-400" />
              Communication Skills
            </h3>
            {renderRatingField('communication', 'Communication Skills', 'communicationComments')}
            {renderRatingField('clarity', 'Clarity of Expression', 'clarityComments')}
            {renderRatingField('articulation', 'Articulation & Presentation', 'articulationComments')}
          </div>
        );

      case 'soft-skills':
        return (
          <div>
            <h3 className="text-xl font-semibold mb-6 flex items-center">
              <Users className="w-6 h-6 mr-2 text-purple-400" />
              Soft Skills Assessment
            </h3>
            {renderRatingField('confidence', 'Confidence Level', 'confidenceComments')}
            {renderRatingField('professionalism', 'Professionalism', 'professionalismComments')}
            {renderRatingField('adaptability', 'Adaptability & Learning', 'adaptabilityComments')}
          </div>
        );

      case 'specific':
        return (
          <div>
            <h3 className="text-xl font-semibold mb-6 flex items-center">
              <Target className="w-6 h-6 mr-2 text-orange-400" />
              Specific Areas
            </h3>
            {renderCheckboxGroup('strengths', strengthOptions, 'Strengths')}
            {renderCheckboxGroup('weaknesses', weaknessOptions, 'Areas for Improvement')}
            {renderCheckboxGroup('improvements', improvementOptions, 'Recommended Improvements')}
          </div>
        );

      case 'detailed':
        return (
          <div>
            <h3 className="text-xl font-semibold mb-6 flex items-center">
              <FileText className="w-6 h-6 mr-2 text-indigo-400" />
              Detailed Feedback
            </h3>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Detailed Feedback
                <span className="text-red-400 ml-1">*</span>
              </label>
              <textarea
                value={feedback.detailedFeedback}
                onChange={(e) => handleTextChange('detailedFeedback', e.target.value)}
                placeholder="Provide detailed feedback about the candidate's performance..."
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 resize-none"
                rows={6}
              />
              {errors.detailedFeedback && (
                <div className="text-red-400 text-sm mt-2 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.detailedFeedback}
                </div>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Recommendations
              </label>
              <textarea
                value={feedback.recommendations}
                onChange={(e) => handleTextChange('recommendations', e.target.value)}
                placeholder="Specific recommendations for the candidate..."
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 resize-none"
                rows={4}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Next Steps
              </label>
              <textarea
                value={feedback.nextSteps}
                onChange={(e) => handleTextChange('nextSteps', e.target.value)}
                placeholder="Suggested next steps for the candidate..."
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 resize-none"
                rows={4}
              />
            </div>
          </div>
        );

      case 'interview':
        return (
          <div>
            <h3 className="text-xl font-semibold mb-6 flex items-center">
              <BarChart3 className="w-6 h-6 mr-2 text-cyan-400" />
              Interview Performance
            </h3>
            {renderRatingField('questionQuality', 'Quality of Questions Asked', 'questionQualityComments')}
            {renderRatingField('answerCompleteness', 'Completeness of Answers', 'answerCompletenessComments')}
            {renderRatingField('timeManagement', 'Time Management', 'timeManagementComments')}
            {renderRatingField('engagement', 'Engagement Level', 'engagementComments')}
          </div>
        );

      case 'final':
        return (
          <div>
            <h3 className="text-xl font-semibold mb-6 flex items-center">
              <Award className="w-6 h-6 mr-2 text-yellow-400" />
              Final Assessment
            </h3>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Would you recommend this candidate?
                <span className="text-red-400 ml-1">*</span>
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="wouldRecommend"
                    checked={feedback.wouldRecommend === true}
                    onChange={() => handleRatingChange('wouldRecommend', true)}
                    className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600"
                  />
                  <ThumbsUp className="w-5 h-5 text-green-400" />
                  <span className="text-sm text-gray-300">Yes</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="wouldRecommend"
                    checked={feedback.wouldRecommend === false}
                    onChange={() => handleRatingChange('wouldRecommend', false)}
                    className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600"
                  />
                  <ThumbsDown className="w-5 h-5 text-red-400" />
                  <span className="text-sm text-gray-300">No</span>
                </label>
              </div>
              {errors.wouldRecommend && (
                <div className="text-red-400 text-sm mt-2 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.wouldRecommend}
                </div>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Hiring Decision
                <span className="text-red-400 ml-1">*</span>
              </label>
              <select
                value={feedback.hireDecision || ''}
                onChange={(e) => handleRatingChange('hireDecision', e.target.value)}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="">Select decision</option>
                <option value="strong_hire">Strong Hire</option>
                <option value="hire">Hire</option>
                <option value="maybe">Maybe</option>
                <option value="no_hire">No Hire</option>
                <option value="strong_no_hire">Strong No Hire</option>
              </select>
              {errors.hireDecision && (
                <div className="text-red-400 text-sm mt-2 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.hireDecision}
                </div>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Additional Comments
              </label>
              <textarea
                value={feedback.additionalComments}
                onChange={(e) => handleTextChange('additionalComments', e.target.value)}
                placeholder="Any additional comments or observations..."
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 resize-none"
                rows={4}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-700 p-6 border-b border-gray-600">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Interview Feedback Form</h2>
              <p className="text-gray-400 mt-1">
                Providing feedback for {interviewee?.name || 'the candidate'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-gray-700 p-4 border-b border-gray-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Progress</span>
            <span className="text-sm text-gray-400">
              {sections.findIndex(s => s.id === currentSection) + 1} of {sections.length}
            </span>
          </div>
          <div className="w-full bg-gray-600 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${((sections.findIndex(s => s.id === currentSection) + 1) / sections.length) * 100}%`
              }}
            />
          </div>
        </div>

        {/* Section Navigation */}
        <div className="bg-gray-700 p-4 border-b border-gray-600">
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              {sections.map((section, index) => {
                const Icon = section.icon;
                const isActive = section.id === currentSection;
                const isCompleted = sections.findIndex(s => s.id === currentSection) > index;
                
                return (
                  <button
                    key={section.id}
                    onClick={() => setCurrentSection(section.id)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : isCompleted
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{section.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          {renderSection()}
        </div>

        {/* Footer */}
        <div className="bg-gray-700 p-6 border-t border-gray-600">
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevSection}
              disabled={sections.findIndex(s => s.id === currentSection) === 0}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 disabled:bg-gray-700 disabled:text-gray-400 transition-colors"
            >
              Previous
            </button>

            <div className="flex space-x-2">
              <button
                onClick={() => {
                  // Save draft
                  localStorage.setItem('feedbackDraft', JSON.stringify(feedback));
                  alert('Draft saved!');
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Draft</span>
              </button>

              {sections.findIndex(s => s.id === currentSection) === sections.length - 1 ? (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-800 transition-colors flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Feedback</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleNextSection}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HumanFeedbackForm;
