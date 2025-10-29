import React from 'react';
import WindowWrapper from './WindowWrapper';
import AIInterviewer from './AIInterviewer';

const AIInterviewerWindow = () => {
  return (
    <WindowWrapper component={AIInterviewer} title="AI Interviewer" requireAuth={false} />
  );
};

export default AIInterviewerWindow;