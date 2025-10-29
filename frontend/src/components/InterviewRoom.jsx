import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  MessageCircle, 
  Share2, 
  Users,
  Clock
} from 'lucide-react';

const InterviewRoom = ({ roomId, onClose }) => {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  
  // WebRTC refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const screenShareRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  
  // Room state
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [roomStatus, setRoomStatus] = useState('connecting');
  const [interviewDuration, setInterviewDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isInitiator, setIsInitiator] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [copied, setCopied] = useState(false);
  
  
  // Timer for interview duration
  useEffect(() => {
    const timer = setInterval(() => {
      setInterviewDuration(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // Initialize WebRTC and join room
  useEffect(() => {
    // Always join the room first, then try WebRTC
    if (socket) {
      socket.emit('joinRoom', { roomId, userId: user ? user._id : undefined });
      
      // Set a fallback timeout to ensure room status is set
      const fallbackTimeout = setTimeout(() => {
        if (roomStatus === 'connecting') {
          console.log('Setting room status to connected via fallback timeout');
          setRoomStatus('connected');
        }
      }, 3000); // 3 second timeout
      
      return () => clearTimeout(fallbackTimeout);
    }
    
    // Try to initialize WebRTC, but don't fail if it doesn't work
    initializeWebRTC().catch(error => {
      console.log('WebRTC initialization failed, continuing without media:', error);
      // Set room status to connected even without WebRTC
      setRoomStatus('connected');
    });
    
    return () => {
      cleanup();
    };
  }, [socket, user, roomId]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    socket.on('roomJoined', handleRoomJoined);
    socket.on('participantJoined', handleParticipantJoined);
    socket.on('participantLeft', handleParticipantLeft);
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('iceCandidate', handleIceCandidate);
    socket.on('chatMessage', handleChatMessage);

    return () => {
      socket.off('roomJoined');
      socket.off('participantJoined');
      socket.off('participantLeft');
      socket.off('offer');
      socket.off('answer');
      socket.off('iceCandidate');
      socket.off('chatMessage');
    };
  }, [socket]);

  const initializeWebRTC = async () => {
    try {
      // Prepare ICE servers (STUN + optional TURN)
      const iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ];
      const turnUrl = import.meta.env.VITE_TURN_URL;
      const turnUsername = import.meta.env.VITE_TURN_USERNAME;
      const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;
      if (turnUrl && turnUsername && turnCredential) {
        iceServers.push({ urls: turnUrl, username: turnUsername, credential: turnCredential });
      }

      // Always create the RTCPeerConnection, even if media fails
      if (!peerConnectionRef.current) {
        peerConnectionRef.current = new RTCPeerConnection({ iceServers });

        // Handle remote stream
        peerConnectionRef.current.ontrack = (event) => {
          remoteVideoRef.current.srcObject = event.streams[0];
        };

        // Handle ICE candidates
        peerConnectionRef.current.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('iceCandidate', { roomId, candidate: event.candidate });
          }
        };
      }

      // Try to get user media; proceed without it if blocked/unavailable
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        stream.getTracks().forEach(track => peerConnectionRef.current.addTrack(track, stream));
      } catch (mediaError) {
        console.log('Proceeding without local media:', mediaError?.name || mediaError);
      }

    } catch (error) {
      console.error('Error initializing WebRTC:', error);
      setRoomStatus('connected');
    }
  };

  const handleRoomJoined = async (data) => {
    setRoomStatus('connected');
    setParticipants(data.participants);
    setIsInitiator(Boolean(data.isInitiator));
    try {
      // Ensure media and RTCPeerConnection are ready
      if (!peerConnectionRef.current || !localStreamRef.current) {
        await initializeWebRTC();
      }
      // If initiator, create and send offer
      if (data.isInitiator && peerConnectionRef.current) {
        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);
        socket.emit('offer', { roomId, offer });
      }
    } catch (e) {
      console.error('Error handling room join/init offer:', e);
    }
  };

  const handleParticipantJoined = async (participant) => {
    setParticipants(prev => [...prev, participant]);
    try {
      // If I am the initiator and have a connection ready, (re)create an offer for the new participant
      if (isInitiator && peerConnectionRef.current && localStreamRef.current) {
        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);
        socket.emit('offer', { roomId, offer });
      }
    } catch (e) {
      console.error('Error sending offer on participant join:', e);
    }
  };

  const handleParticipantLeft = (participantId) => {
    setParticipants(prev => prev.filter(p => p.id !== participantId));
  };

  const handleOffer = async (payload) => {
    try {
      const { offer } = payload || {};
      if (!offer) return;
      await peerConnectionRef.current.setRemoteDescription(offer);
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      
      socket.emit('answer', {
        roomId,
        answer
      });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  const handleAnswer = async (payload) => {
    try {
      const { answer } = payload || {};
      if (!answer) return;
      await peerConnectionRef.current.setRemoteDescription(answer);
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  };

  const handleIceCandidate = async (payload) => {
    try {
      const { candidate } = payload || {};
      if (!candidate) return;
      await peerConnectionRef.current.addIceCandidate(candidate);
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  };

  const handleChatMessage = (message) => {
    setMessages(prev => [...prev, message]);
  };


  const toggleVideo = async () => {
    try {
      if (!localStreamRef.current) {
        // If no stream exists, try to get one
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: isAudioOn
        });
        localStreamRef.current = stream;
        localVideoRef.current.srcObject = stream;
        setIsVideoOn(true);
        
        // Add tracks to peer connection if it exists
        if (peerConnectionRef.current) {
          stream.getTracks().forEach(track => {
            peerConnectionRef.current.addTrack(track, stream);
          });
        }
      } else {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = !videoTrack.enabled;
          setIsVideoOn(videoTrack.enabled);
        } else {
          // No video track exists, get new stream with video
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: isAudioOn
          });
          localStreamRef.current = stream;
          localVideoRef.current.srcObject = stream;
          setIsVideoOn(true);
        }
      }
    } catch (error) {
      console.error('Error toggling video:', error);
      setIsVideoOn(false);
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioOn(audioTrack.enabled);
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: 'always',
            displaySurface: 'monitor'
          },
          audio: true
        });
        
        // Store the screen stream
        const screenStreamRef = useRef(screenStream);
        
        // Replace video track in peer connection
        if (peerConnectionRef.current) {
          const videoTrack = screenStream.getVideoTracks()[0];
          const sender = peerConnectionRef.current.getSenders().find(
            s => s.track && s.track.kind === 'video'
          );
          
          if (sender) {
            await sender.replaceTrack(videoTrack);
          } else {
            // Add new track if no sender exists
            peerConnectionRef.current.addTrack(videoTrack, screenStream);
          }
        }
        
        // Show screen share in separate component
        if (screenShareRef.current) {
          screenShareRef.current.srcObject = screenStream;
        }
        
        setIsScreenSharing(true);
        
        // Handle when user stops sharing via browser UI
        screenStream.getVideoTracks()[0].onended = () => {
          stopScreenShare();
        };
        
      } else {
        // Stop screen sharing
        stopScreenShare();
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      if (error.name === 'NotAllowedError') {
        console.log('Screen sharing was denied by user');
      }
    }
  };

  const stopScreenShare = async () => {
    try {
      // Get back to camera stream
      if (localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        
        if (peerConnectionRef.current && videoTrack) {
          const sender = peerConnectionRef.current.getSenders().find(
            s => s.track && s.track.kind === 'video'
          );
          
          if (sender) {
            await sender.replaceTrack(videoTrack);
          }
        }
        
        // Clear screen share component
        if (screenShareRef.current) {
          screenShareRef.current.srcObject = null;
        }
      }
      
      setIsScreenSharing(false);
    } catch (error) {
      console.error('Error stopping screen share:', error);
    }
  };

  const sendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        id: Date.now(),
        userId: user._id,
        username: user.name,
        text: newMessage,
        timestamp: new Date()
      };
      
      socket.emit('chatMessage', { roomId, message });
      setMessages(prev => [...prev, message]);
      setNewMessage('');
    }
  };


  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    socket.emit('leaveRoom', { roomId });
  };

  const handleLeaveRoom = () => {
    cleanup();
    if (onClose) {
      onClose();
    }
  };

  const handleShareLink = async () => {
    const link = `${window.location.origin}/interview/${roomId}`;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(link);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = link;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy link', e);
    }
  };

  if (roomStatus === 'connecting') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Connecting to interview room...</p>
        </div>
      </div>
    );
  }

  if (roomStatus === 'error') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-red-500 mb-4">Failed to connect to interview room</p>
          <button
            onClick={handleLeaveRoom}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Leave Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-900 transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <div className="bg-gray-800 p-4 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Video className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-white text-xl font-bold">PeerPrep Interview</h1>
          </div>
          <div className="flex items-center space-x-4 text-gray-300 text-sm">
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{formatDuration(interviewDuration)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Connected</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleShareLink}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors relative"
            title="Copy room link"
          >
            <Share2 className="w-4 h-4" />
            <span>{copied ? 'Copied!' : 'Share link'}</span>
          </button>
          <button
            onClick={handleLeaveRoom}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Phone className="w-4 h-4" />
            <span>Leave call</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Video Section */}
        <div className={`flex flex-col transition-all duration-300 ${showChat ? 'flex-1' : 'flex-1'}`}>
          {/* Video Grid */}
          <div className="flex-1 bg-gray-800 p-6">
            <div className={`grid gap-6 h-full ${showChat ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1 lg:grid-cols-2'}`}>
              {/* Local Video */}
              <div className="relative bg-gray-900 rounded-xl overflow-hidden shadow-2xl border-2 border-gray-700 hover:border-blue-500 transition-colors">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  className="w-full h-full object-cover"
                />
                {!isVideoOn && (
                  <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <VideoOff className="w-16 h-16 mx-auto mb-2" />
                      <p className="text-lg font-medium">Camera is off</p>
                    </div>
                  </div>
                )}
                <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>You {isVideoOn ? '' : '(Camera off)'}</span>
                </div>
                <div className="absolute top-4 right-4">
                  <div className="bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                    {isAudioOn ? '🎤' : '🔇'}
                  </div>
                </div>
              </div>
              
              {/* Remote Video */}
              <div className="relative bg-gray-900 rounded-xl overflow-hidden shadow-2xl border-2 border-gray-700 hover:border-blue-500 transition-colors">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Users className="w-16 h-16 mx-auto mb-2" />
                    <p className="text-lg font-medium">Waiting for partner...</p>
                    <p className="text-sm">They will appear here once connected</p>
                  </div>
                </div>
                <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>Interview Partner</span>
                </div>
              </div>
            </div>
          </div>

          {/* Screen Share Component */}
          {isScreenSharing && (
            <div className="bg-gray-800 border-t border-gray-700 p-4">
              <div className="bg-gray-900 rounded-xl overflow-hidden shadow-2xl border-2 border-blue-500">
                <div className="p-3 bg-blue-600 text-white text-sm font-medium flex items-center space-x-2">
                  <Share2 className="w-4 h-4" />
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
          <div className="bg-gray-800 p-4 flex items-center justify-center space-x-4 border-t border-gray-700">
            <button
              onClick={toggleVideo}
              className={`p-3 rounded-full transition-all duration-200 hover:scale-105 ${
                isVideoOn 
                  ? 'bg-gray-600 text-white hover:bg-gray-500' 
                  : 'bg-red-600 text-white hover:bg-red-500'
              }`}
              title={isVideoOn ? "Turn off camera" : "Turn on camera"}
            >
              {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>
            
            <button
              onClick={toggleAudio}
              className={`p-3 rounded-full transition-all duration-200 hover:scale-105 ${
                isAudioOn 
                  ? 'bg-gray-600 text-white hover:bg-gray-500' 
                  : 'bg-red-600 text-white hover:bg-red-500'
              }`}
              title={isAudioOn ? "Mute microphone" : "Unmute microphone"}
            >
              {isAudioOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
            
            <button
              onClick={toggleScreenShare}
              className={`p-3 rounded-full transition-all duration-200 hover:scale-105 ${
                isScreenSharing 
                  ? 'bg-blue-600 text-white hover:bg-blue-500' 
                  : 'bg-gray-600 text-white hover:bg-gray-500'
              }`}
              title={isScreenSharing ? "Stop sharing" : "Share screen"}
            >
              <Share2 className="w-5 h-5" />
            </button>
            
            <div className="w-px h-6 bg-gray-600"></div>
            
            <button
              onClick={() => setShowChat(!showChat)}
              className={`p-3 rounded-full transition-all duration-200 hover:scale-105 ${
                showChat 
                  ? 'bg-blue-600 text-white hover:bg-blue-500' 
                  : 'bg-gray-600 text-white hover:bg-gray-500'
              }`}
              title={showChat ? "Hide chat" : "Show chat"}
            >
              <MessageCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat Sidebar */}
        {showChat && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col max-h-full">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
              <h3 className="text-white font-semibold flex items-center space-x-2">
                <MessageCircle className="w-5 h-5" />
                <span>Chat</span>
              </h3>
              <button
                onClick={() => setShowChat(false)}
                className="text-gray-400 hover:text-white transition-colors p-1 rounded"
              >
                ×
              </button>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-0">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No messages yet</p>
                  <p className="text-sm">Start the conversation!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className="bg-gray-700 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-white">
                          {message.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm text-gray-300 font-medium">{message.username}</span>
                      <span className="text-xs text-gray-500">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-white text-sm">{message.text}</div>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-4 border-t border-gray-700 flex-shrink-0">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none placeholder-gray-400 text-sm"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default InterviewRoom;
