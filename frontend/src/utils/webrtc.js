// WebRTC utilities for interview room
export class WebRTCManager {
  constructor(socket, roomId) {
    this.socket = socket;
    this.roomId = roomId;
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.isInitiator = false;
  }

  async initializeWebRTC(isInitiator = false) {
    this.isInitiator = isInitiator;
    
    try {
      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      // Create peer connection with optional TURN from env
      const iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ];
      const turnUrl = import.meta.env.VITE_TURN_URL;
      const turnUsername = import.meta.env.VITE_TURN_USERNAME;
      const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;
      if (turnUrl && turnUsername && turnCredential) {
        iceServers.push({
          urls: turnUrl,
          username: turnUsername,
          credential: turnCredential
        });
      }
      this.peerConnection = new RTCPeerConnection({
        iceServers
      });

      // Add local stream tracks
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        this.remoteStream = event.streams[0];
        this.onRemoteStream?.(this.remoteStream);
      };

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.socket.emit('iceCandidate', {
            roomId: this.roomId,
            candidate: event.candidate
          });
        }
      };

      // Handle connection state changes
      this.peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', this.peerConnection.connectionState);
        this.onConnectionStateChange?.(this.peerConnection.connectionState);
      };

      // Handle ICE connection state changes
      this.peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', this.peerConnection.iceConnectionState);
        this.onIceConnectionStateChange?.(this.peerConnection.iceConnectionState);
      };

      return this.localStream;
    } catch (error) {
      console.error('Error initializing WebRTC:', error);
      throw error;
    }
  }

  async createOffer() {
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      this.socket.emit('offer', {
        roomId: this.roomId,
        offer
      });
      
      return offer;
    } catch (error) {
      console.error('Error creating offer:', error);
      throw error;
    }
  }

  async handleOffer(offer) {
    try {
      await this.peerConnection.setRemoteDescription(offer);
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      this.socket.emit('answer', {
        roomId: this.roomId,
        answer
      });
      
      return answer;
    } catch (error) {
      console.error('Error handling offer:', error);
      throw error;
    }
  }

  async handleAnswer(answer) {
    try {
      await this.peerConnection.setRemoteDescription(answer);
    } catch (error) {
      console.error('Error handling answer:', error);
      throw error;
    }
  }

  async handleIceCandidate(candidate) {
    try {
      await this.peerConnection.addIceCandidate(candidate);
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
      throw error;
    }
  }

  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  }

  toggleAudio() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  }

  async toggleScreenShare() {
    try {
      if (!this.isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        const videoTrack = screenStream.getVideoTracks()[0];
        const sender = this.peerConnection.getSenders().find(
          s => s.track && s.track.kind === 'video'
        );
        
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
        
        this.isScreenSharing = true;
        
        videoTrack.onended = () => {
          this.isScreenSharing = false;
          this.stopScreenShare();
        };
        
        return true;
      } else {
        this.stopScreenShare();
        return false;
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      throw error;
    }
  }

  stopScreenShare() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      const sender = this.peerConnection.getSenders().find(
        s => s.track && s.track.kind === 'video'
      );
      
      if (sender && videoTrack) {
        sender.replaceTrack(videoTrack);
      }
      
      this.isScreenSharing = false;
    }
  }

  getStats() {
    if (this.peerConnection) {
      return this.peerConnection.getStats();
    }
    return null;
  }

  cleanup() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
    
    if (this.peerConnection) {
      this.peerConnection.close();
    }
    
    this.localStream = null;
    this.remoteStream = null;
    this.peerConnection = null;
  }

  // Event handlers (to be set by the component)
  onRemoteStream = null;
  onConnectionStateChange = null;
  onIceConnectionStateChange = null;
}

// Utility functions
export const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export const getConnectionQuality = (stats) => {
  // This would analyze WebRTC stats to determine connection quality
  // For now, return a placeholder
  return 'good';
};

export const validateRoomId = (roomId) => {
  // Basic validation for room ID format
  return roomId && roomId.length >= 6 && /^[a-zA-Z0-9-_]+$/.test(roomId);
};
