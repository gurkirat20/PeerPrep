import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Plus, X, Save, Edit3, Star } from 'lucide-react';

const EnhancedProfile = () => {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    skills: user?.skills || [],
    interests: user?.interests || [],
    preferredTopics: user?.preferredTopics || [],
    experience: {
      years: user?.experience?.years || 0,
      domains: user?.experience?.domains || []
    }
  });

  const [newSkill, setNewSkill] = useState({ name: '', level: 'intermediate', keywords: [] });
  const [newInterest, setNewInterest] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [newKeyword, setNewKeyword] = useState('');

  const skillLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
  const commonSkills = [
    'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'Angular', 'Vue.js',
    'Django', 'Flask', 'Express', 'Spring Boot', 'MongoDB', 'PostgreSQL',
    'MySQL', 'Redis', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP',
    'Git', 'CI/CD', 'REST API', 'GraphQL', 'Microservices', 'System Design'
  ];

  const commonTopics = [
    'web development', 'mobile development', 'backend development', 'frontend development',
    'full-stack development', 'devops', 'cloud computing', 'data structures',
    'algorithms', 'database design', 'api design', 'security', 'testing',
    'performance optimization', 'scalability', 'architecture', 'machine learning',
    'artificial intelligence', 'blockchain', 'fintech', 'e-commerce', 'healthcare'
  ];

  const commonDomains = [
    'fintech', 'healthcare', 'e-commerce', 'education', 'entertainment',
    'social media', 'gaming', 'logistics', 'real estate', 'travel',
    'food & beverage', 'automotive', 'aerospace', 'retail', 'manufacturing'
  ];

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateProfile(formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const addSkill = () => {
    if (newSkill.name.trim()) {
      setFormData({
        ...formData,
        skills: [...formData.skills, { ...newSkill, keywords: [...newSkill.keywords] }]
      });
      setNewSkill({ name: '', level: 'intermediate', keywords: [] });
    }
  };

  const removeSkill = (index) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter((_, i) => i !== index)
    });
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !newSkill.keywords.includes(newKeyword.toLowerCase())) {
      setNewSkill({
        ...newSkill,
        keywords: [...newSkill.keywords, newKeyword.toLowerCase()]
      });
      setNewKeyword('');
    }
  };

  const removeKeyword = (keyword) => {
    setNewSkill({
      ...newSkill,
      keywords: newSkill.keywords.filter(k => k !== keyword)
    });
  };

  const addInterest = () => {
    if (newInterest.trim() && !formData.interests.includes(newInterest.toLowerCase())) {
      setFormData({
        ...formData,
        interests: [...formData.interests, newInterest.toLowerCase()]
      });
      setNewInterest('');
    }
  };

  const removeInterest = (interest) => {
    setFormData({
      ...formData,
      interests: formData.interests.filter(i => i !== interest)
    });
  };

  const addTopic = () => {
    if (newTopic.trim() && !formData.preferredTopics.includes(newTopic.toLowerCase())) {
      setFormData({
        ...formData,
        preferredTopics: [...formData.preferredTopics, newTopic.toLowerCase()]
      });
      setNewTopic('');
    }
  };

  const removeTopic = (topic) => {
    setFormData({
      ...formData,
      preferredTopics: formData.preferredTopics.filter(t => t !== topic)
    });
  };

  const addDomain = () => {
    if (newDomain.trim() && !formData.experience.domains.includes(newDomain.toLowerCase())) {
      setFormData({
        ...formData,
        experience: {
          ...formData.experience,
          domains: [...formData.experience.domains, newDomain.toLowerCase()]
        }
      });
      setNewDomain('');
    }
  };

  const removeDomain = (domain) => {
    setFormData({
      ...formData,
      experience: {
        ...formData.experience,
        domains: formData.experience.domains.filter(d => d !== domain)
      }
    });
  };

  const getSkillLevelColor = (level) => {
    const colors = {
      beginner: 'bg-red-100 text-red-800',
      intermediate: 'bg-yellow-100 text-yellow-800',
      advanced: 'bg-blue-100 text-blue-800',
      expert: 'bg-green-100 text-green-800'
    };
    return colors[level] || colors.intermediate;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Enhanced Profile</h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Profile</span>
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Skills Section */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Skills & Expertise</h3>
        
        {/* Current Skills */}
        <div className="space-y-3 mb-4">
          {formData.skills.map((skill, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="font-medium text-gray-900">{skill.name}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSkillLevelColor(skill.level)}`}>
                  {skill.level}
                </span>
                {skill.keywords.length > 0 && (
                  <div className="flex space-x-1">
                    {skill.keywords.map((keyword, i) => (
                      <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {isEditing && (
                <button
                  onClick={() => removeSkill(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add New Skill */}
        {isEditing && (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Add New Skill</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Skill Name</label>
                <input
                  type="text"
                  value={newSkill.name}
                  onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                  placeholder="e.g., React"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Level</label>
                <select
                  value={newSkill.level}
                  onChange={(e) => setNewSkill({ ...newSkill, level: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {skillLevels.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Keywords</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder="e.g., hooks, state"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <button
                    onClick={addKeyword}
                    className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Keywords */}
            {newSkill.keywords.length > 0 && (
              <div className="mb-3">
                <div className="flex flex-wrap gap-2">
                  {newSkill.keywords.map((keyword, i) => (
                    <span key={i} className="flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
                      <span>{keyword}</span>
                      <button onClick={() => removeKeyword(keyword)}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex space-x-2">
              <button
                onClick={addSkill}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <Plus className="w-4 h-4" />
                <span>Add Skill</span>
              </button>
            </div>

            {/* Quick Add Common Skills */}
            <div className="mt-3">
              <p className="text-sm text-gray-600 mb-2">Quick add:</p>
              <div className="flex flex-wrap gap-2">
                {commonSkills.slice(0, 8).map(skill => (
                  <button
                    key={skill}
                    onClick={() => setNewSkill({ ...newSkill, name: skill })}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interests Section */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Interests</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {formData.interests.map((interest, index) => (
            <span key={index} className="flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              <span>{interest}</span>
              {isEditing && (
                <button onClick={() => removeInterest(interest)}>
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>

        {isEditing && (
          <div className="flex space-x-2">
            <input
              type="text"
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              placeholder="Add interest..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <button
              onClick={addInterest}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Preferred Topics Section */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Preferred Interview Topics</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {formData.preferredTopics.map((topic, index) => (
            <span key={index} className="flex items-center space-x-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
              <span>{topic}</span>
              {isEditing && (
                <button onClick={() => removeTopic(topic)}>
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>

        {isEditing && (
          <div className="flex space-x-2">
            <input
              type="text"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              placeholder="Add topic..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <button
              onClick={addTopic}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Quick Add Common Topics */}
        {isEditing && (
          <div className="mt-3">
            <p className="text-sm text-gray-600 mb-2">Quick add:</p>
            <div className="flex flex-wrap gap-2">
              {commonTopics.slice(0, 6).map(topic => (
                <button
                  key={topic}
                  onClick={() => setNewTopic(topic)}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Experience Section */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Experience</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Years of Experience</label>
            <input
              type="number"
              value={formData.experience.years}
              onChange={(e) => setFormData({
                ...formData,
                experience: { ...formData.experience, years: parseInt(e.target.value) || 0 }
              })}
              min="0"
              max="50"
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
            />
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Domains</h4>
          <div className="flex flex-wrap gap-2 mb-4">
            {formData.experience.domains.map((domain, index) => (
              <span key={index} className="flex items-center space-x-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                <span>{domain}</span>
                {isEditing && (
                  <button onClick={() => removeDomain(domain)}>
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
          </div>

          {isEditing && (
            <div className="flex space-x-2">
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="Add domain..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <button
                onClick={addDomain}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Quick Add Common Domains */}
          {isEditing && (
            <div className="mt-3">
              <p className="text-sm text-gray-600 mb-2">Quick add:</p>
              <div className="flex flex-wrap gap-2">
                {commonDomains.slice(0, 6).map(domain => (
                  <button
                    key={domain}
                    onClick={() => setNewDomain(domain)}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    {domain}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Matchability Score */}
      <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Matchability Score</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-primary-600">{formData.skills.length}</div>
            <div className="text-sm text-gray-600">Skills</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{formData.interests.length}</div>
            <div className="text-sm text-gray-600">Interests</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">{formData.preferredTopics.length}</div>
            <div className="text-sm text-gray-600">Topics</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">{formData.experience.domains.length}</div>
            <div className="text-sm text-gray-600">Domains</div>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          More skills and topics = better match opportunities
        </p>
      </div>
    </div>
  );
};

export default EnhancedProfile;
