import React from 'react';
import { useParams } from 'react-router-dom';
import WindowWrapper from './WindowWrapper';
import InterviewRoom from './InterviewRoom';

const InterviewRoomWindow = () => {
  const { roomId } = useParams();

  return (
    <WindowWrapper 
      component={InterviewRoom}
      title="Interview Room" 
      roomId={roomId}
    />
  );
};

export default InterviewRoomWindow;