import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import '../styles/components/VideoCall.css';

// Create a completely safe socket service wrapper
let socketService = null;
let socketServiceAvailable = false;

// Try to import socket service with comprehensive error handling
try {
  const importedService = require('../services/socketService');
  socketService = importedService.default || importedService;
  
  // Validate that the service has required methods
  if (socketService && typeof socketService.on === 'function' && typeof socketService.emit === 'function') {
    socketServiceAvailable = true;
    console.log('Socket service loaded successfully');
  } else {
    throw new Error('Socket service methods not available');
  }
} catch (error) {
  console.error('Socket service not available - disabling video call functionality:', error);
  socketServiceAvailable = false;
  socketService = null;
}

// Additional safety wrapper
const safeSocketService = {
  on: (event, callback) => {
    try {
      if (socketService && typeof socketService.on === 'function') {
        return socketService.on(event, callback);
      } else {
        console.warn(`Safe socket service - cannot listen to event: ${event}`);
        return false;
      }
    } catch (error) {
      console.error(`Error in socket.on for event ${event}:`, error);
      return false;
    }
  },
  emit: (event, data) => {
    try {
      if (socketService && typeof socketService.emit === 'function') {
        return socketService.emit(event, data);
      } else {
        console.warn(`Safe socket service - cannot emit event: ${event}`);
        return false;
      }
    } catch (error) {
      console.error(`Error in socket.emit for event ${event}:`, error);
      return false;
    }
  },
  off: (event, callback) => {
    try {
      if (socketService && typeof socketService.off === 'function') {
        return socketService.off(event, callback);
      } else {
        console.warn(`Safe socket service - cannot remove listener for event: ${event}`);
        return false;
      }
    } catch (error) {
      console.error(`Error in socket.off for event ${event}:`, error);
      return false;
    }
  },
  connect: () => {
    try {
      if (socketService && typeof socketService.connect === 'function') {
        return socketService.connect();
      } else {
        console.warn('Safe socket service - cannot connect');
        return false;
      }
    } catch (error) {
      console.error('Error in socket.connect:', error);
      return false;
    }
  },
  disconnect: () => {
    try {
      if (socketService && typeof socketService.disconnect === 'function') {
        return socketService.disconnect();
      } else {
        console.warn('Safe socket service - cannot disconnect');
        return false;
      }
    } catch (error) {
      console.error('Error in socket.disconnect:', error);
      return false;
    }
  },
  isConnected: () => {
    try {
      if (socketService && typeof socketService.isConnected === 'function') {
        return socketService.isConnected();
      } else {
        console.warn('Safe socket service - not connected');
        return false;
      }
    } catch (error) {
      console.error('Error in socket.isConnected:', error);
      return false;
    }
  }
};

function VideoCall({ roomId, onClose, participants = [] }) {
  // Early return if socket service is not available
  if (!socketServiceAvailable) {
    return (
      <div className="video-call-overlay" onClick={onClose}>
        <div className="video-call-container" onClick={e => e.stopPropagation()}>
          <div className="video-call-header">
            <h2>🎥 Video Call - Room {roomId}</h2>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
          <div className="error-message" style={{
            background: '#f8d7da',
            border: '1px solid #f5c6cb',
            color: '#721c24',
            padding: '20px',
            borderRadius: '4px',
            textAlign: 'center',
            margin: '20px'
          }}>
            <h3>⚠️ Video Call Service Unavailable</h3>
            <p>The video call service is currently not available. This may be due to:</p>
            <ul style={{ textAlign: 'left', margin: '10px 0' }}>
              <li>Network connectivity issues</li>
              <li>Server maintenance</li>
              <li>Browser compatibility issues</li>
            </ul>
            <p>Please try again later or contact support if the issue persists.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="btn-primary"
              style={{ margin: '10px' }}
            >
              🔄 Refresh Page
            </button>
            <button 
              onClick={onClose} 
              className="btn-secondary"
              style={{ margin: '10px' }}
            >
              ❌ Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { user, isAuthenticated } = useAuth();
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [error, setError] = useState('');
  const [componentError, setComponentError] = useState(null);
  
  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef([]);
  const peerConnections = useRef({});
  const localStreamRef = useRef(null);

  useEffect(() => {
    try {
      if (isAuthenticated) {
        // Socket service is guaranteed to be available at this point
        console.log('Initializing video call with socket service');
        
        // Try to connect socket service
        safeSocketService.connect();
        
        // Add a small delay to ensure DOM is ready
        setTimeout(() => {
          initializeVideoCall();
          setupSignaling();
        }, 100);
      }
    } catch (error) {
      console.error('VideoCall component error:', error);
      setComponentError('Video call component failed to initialize. Please refresh the page.');
    }
    
    return () => {
      try {
        cleanup();
        cleanupSignaling();
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    };
  }, [isAuthenticated]);

  const setupSignaling = () => {
    try {
      // Socket service is guaranteed to be available at this point
      console.log('🔌 Setting up WebRTC signaling');
      console.log('🔌 Socket service available:', !!safeSocketService);
      console.log('🔌 Socket connected:', safeSocketService.isConnected());

      // Listen for incoming WebRTC offers
      safeSocketService.on('webrtc-offer', async (data) => {
        console.log('📥 WebRTC offer received:', data);
        if (data.roomId === roomId && data.from !== user?.id) {
          console.log('✅ Processing WebRTC offer from:', data.from);
          await handleIncomingOffer(data);
        } else {
          console.log('❌ Ignoring offer - roomId:', data.roomId, 'expected:', roomId, 'from:', data.from, 'user:', user?.id);
        }
      });

    // Listen for incoming WebRTC answers
    safeSocketService.on('webrtc-answer', async (data) => {
      console.log('📥 WebRTC answer received:', data);
      if (data.roomId === roomId && data.from !== user?.id) {
        console.log('✅ Processing WebRTC answer from:', data.from);
        await handleIncomingAnswer(data);
      } else {
        console.log('❌ Ignoring answer - roomId:', data.roomId, 'expected:', roomId, 'from:', data.from, 'user:', user?.id);
      }
    });

    // Listen for ICE candidates
    safeSocketService.on('webrtc-ice-candidate', async (data) => {
      console.log('📥 ICE candidate received:', data);
      if (data.roomId === roomId && data.from !== user?.id) {
        console.log('✅ Processing ICE candidate from:', data.from);
        await handleIncomingIceCandidate(data);
      } else {
        console.log('❌ Ignoring ICE candidate - roomId:', data.roomId, 'expected:', roomId, 'from:', data.from, 'user:', user?.id);
      }
    });

    // Listen for user join/leave events
    safeSocketService.on('user-joined-video', (data) => {
      console.log('📥 User joined video event received:', data);
      if (data.roomId === roomId && data.userId !== user?.id) {
        console.log('✅ Processing user joined video call:', data.userId);
        
        // Add participant to remoteStreams immediately
        setRemoteStreams(prev => {
          const existing = prev.find(s => s.id === data.userId);
          if (!existing) {
            console.log('➕ Adding new participant from user-joined-video:', data.userId);
            return [...prev, {
              id: data.userId,
              name: data.username || data.email || `User ${data.userId}`,
              stream: null, // Will be set when WebRTC connection is established
              isVideoEnabled: true,
              isAudioEnabled: true,
              connectionStatus: 'ready' // Ready to connect
            }];
          }
          console.log('👤 Participant already exists:', data.userId);
          return prev;
        });
        
        // Start WebRTC connection with new user
        console.log('🚀 Starting WebRTC connection for new participant:', data.userId);
        startWebRTCConnection(data.userId, { userId: data.userId, username: data.username, email: data.email });
      } else {
        console.log('❌ Ignoring user-joined-video - roomId:', data.roomId, 'expected:', roomId, 'userId:', data.userId, 'user:', user?.id);
      }
    });

    safeSocketService.on('user-left-video', (data) => {
      if (data.roomId === roomId) {
        console.log('User left video call:', data.userId);
        // Clean up connection
        if (peerConnections.current[data.userId]) {
          peerConnections.current[data.userId].close();
          delete peerConnections.current[data.userId];
        }
        // Remove from remote streams
        setRemoteStreams(prev => prev.filter(s => s.id !== data.userId));
      }
    });
    } catch (error) {
      console.error('Error setting up WebRTC signaling:', error);
      setError('Failed to setup video call signaling. Please refresh the page.');
    }
  };

  const cleanupSignaling = () => {
    try {
      if (safeSocketService && typeof safeSocketService.off === 'function') {
        safeSocketService.off('webrtc-offer');
        safeSocketService.off('webrtc-answer');
        safeSocketService.off('webrtc-ice-candidate');
        safeSocketService.off('user-joined-video');
        safeSocketService.off('user-left-video');
      }
    } catch (error) {
      console.error('Error cleaning up WebRTC signaling:', error);
    }
  };

  // Ensure video stream is set when component mounts
  useEffect(() => {
    if (localStream && localVideoRef.current && !localVideoRef.current.srcObject) {
      console.log('Setting video stream on mount');
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play();
    }
  }, [localStream]);

  // Additional effect to handle video element availability
  useEffect(() => {
    const checkVideoElement = () => {
      if (localStream && localVideoRef.current && !localVideoRef.current.srcObject) {
        console.log('Video element available, setting stream');
        localVideoRef.current.srcObject = localStream;
        localVideoRef.current.play();
      }
    };

    // Check immediately
    checkVideoElement();

    // Also check after a short delay
    const timeoutId = setTimeout(checkVideoElement, 200);

    return () => clearTimeout(timeoutId);
  }, [localStream]);

  const initializeVideoCall = async () => {
    try {
      setConnectionStatus('connecting');
      
      // Get user media with better quality settings
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });
      
      localStreamRef.current = stream;
      setLocalStream(stream);
      
      // Set video stream with retry mechanism and timeout
      const setVideoStream = (retryCount = 0) => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play();
          console.log('Local video stream set:', stream);
          console.log('Video element:', localVideoRef.current);
        } else if (retryCount < 50) { // Max 5 seconds of retries
          console.warn(`Video element not ready, retrying in 100ms... (attempt ${retryCount + 1}/50)`);
          setTimeout(() => setVideoStream(retryCount + 1), 100);
        } else {
          console.error('Video element not ready after 5 seconds, giving up');
          setError('Video element failed to initialize. Please refresh and try again.');
          setConnectionStatus('error');
        }
      };
      
      setVideoStream();
      
      setConnectionStatus('connected');
      
      // Set up WebRTC connections for real video streams
      setupWebRTCConnections();
      
    } catch (err) {
      console.error('Error accessing camera/microphone:', err);
      setError('Unable to access camera/microphone. Please check permissions and try again.');
      setConnectionStatus('error');
    }
  };

  const setupWebRTCConnections = () => {
    console.log('🔗 Setting up WebRTC connections for participants:', participants);
    // Set up WebRTC peer connections for each participant
    const otherParticipants = participants.filter(p => p.userId !== user?.id);
    console.log('👥 Other participants:', otherParticipants);
    
    // Add participants to remoteStreams immediately (before WebRTC connection)
    setRemoteStreams(prev => {
      const newParticipants = otherParticipants.map(participant => ({
        id: participant.userId,
        name: participant.username || participant.email || `User ${participant.userId}`,
        stream: null, // Will be set when WebRTC connection is established
        isVideoEnabled: true,
        isAudioEnabled: true,
        connectionStatus: 'ready' // Ready to connect, not actively connecting
      }));
      
      console.log('➕ Adding participants to remoteStreams:', newParticipants);
      
      // Merge with existing participants, avoiding duplicates
      const existingIds = prev.map(p => p.id);
      const uniqueNewParticipants = newParticipants.filter(p => !existingIds.includes(p.id));
      
      return [...prev, ...uniqueNewParticipants];
    });
    
    // Add a small delay to ensure participants are added to state before starting connections
    setTimeout(() => {
      otherParticipants.forEach((participant, index) => {
        console.log(`🚀 Starting WebRTC connection ${index + 1}/${otherParticipants.length} for:`, participant.userId);
        startWebRTCConnection(participant.userId, participant);
      });
    }, 100);

    // Notify other participants that we joined the video call
    try {
      console.log('📢 Emitting user-joined-video for room:', roomId, 'user:', user?.id);
      safeSocketService.emit('user-joined-video', {
        roomId,
        userId: user?.id,
        username: user?.username || user?.email
      });
    } catch (error) {
      console.error('Failed to emit user-joined-video:', error);
    }
  };

  const startWebRTCConnection = async (userId, participant = null) => {
    console.log('🚀 Starting WebRTC connection with:', userId);
    
    // Update connection status to 'connecting'
    setRemoteStreams(prev => {
      return prev.map(s => s.id === userId ? { ...s, connectionStatus: 'connecting' } : s);
    });

    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    console.log('📡 Created peer connection for:', userId);

    // Add local stream to peer connection
    if (localStreamRef.current) {
      console.log('🎥 Adding local stream tracks to peer connection for:', userId);
      localStreamRef.current.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStreamRef.current);
      });
    } else {
      console.warn('⚠️ No local stream available for peer connection');
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      console.log('🎉 Received remote stream from:', userId, 'Stream:', remoteStream);
      
      setRemoteStreams(prev => {
        const existing = prev.find(s => s.id === userId);
        if (existing) {
          console.log('✅ Updating existing participant with stream:', userId);
          return prev.map(s => s.id === userId ? { ...s, stream: remoteStream, connectionStatus: 'connected' } : s);
        } else {
          console.log('✅ Adding new participant with stream:', userId);
          return [...prev, {
            id: userId,
            name: participant?.username || participant?.email || `User ${userId}`,
            stream: remoteStream,
            isVideoEnabled: true,
            isAudioEnabled: true,
            connectionStatus: 'connected'
          }];
        }
      });
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 Sending ICE candidate to:', userId, 'Candidate:', event.candidate);
        try {
          safeSocketService.emit('webrtc-ice-candidate', {
            roomId,
            to: userId,
            from: user?.id,
            candidate: event.candidate
          });
        } catch (error) {
          console.error('❌ Failed to emit ICE candidate:', error);
        }
      }
    };

    peerConnections.current[userId] = peerConnection;

    // Create and send offer
    try {
      console.log('📤 Creating offer for:', userId);
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      console.log('📤 Sending offer to:', userId, 'Offer:', offer);
      try {
        const emitResult = safeSocketService.emit('webrtc-offer', {
          roomId,
          to: userId,
          from: user?.id,
          offer: offer
        });
        console.log('📤 Offer emit result:', emitResult);
      } catch (error) {
        console.error('❌ Failed to emit WebRTC offer:', error);
      }
    } catch (error) {
      console.error('❌ Error creating offer:', error);
    }
  };

  const handleIncomingOffer = async (data) => {
    const userId = data.from;
    console.log('📥 Received offer from:', userId, 'Offer:', data.offer);
    let peerConnection = peerConnections.current[userId];
    
    if (!peerConnection) {
      peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      // Add local stream to peer connection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          peerConnection.addTrack(track, localStreamRef.current);
        });
      }

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        const [remoteStream] = event.streams;
        console.log('Received remote stream from:', userId);
        
        setRemoteStreams(prev => {
          const existing = prev.find(s => s.id === userId);
          if (existing) {
            return prev.map(s => s.id === userId ? { ...s, stream: remoteStream, connectionStatus: 'connected' } : s);
          } else {
            return [...prev, {
              id: userId,
              name: `User ${userId}`,
              stream: remoteStream,
              isVideoEnabled: true,
              isAudioEnabled: true,
              connectionStatus: 'connected'
            }];
          }
        });
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Sending ICE candidate to:', userId);
        try {
          safeSocketService.emit('webrtc-ice-candidate', {
            roomId,
            to: userId,
            from: user?.id,
            candidate: event.candidate
          });
        } catch (error) {
          console.error('Failed to emit ICE candidate:', error);
        }
        }
      };

      peerConnections.current[userId] = peerConnection;
    }

    try {
      await peerConnection.setRemoteDescription(data.offer);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      console.log('Sending answer to:', userId);
      try {
        safeSocketService.emit('webrtc-answer', {
          roomId,
          to: userId,
          from: user?.id,
          answer: answer
        });
      } catch (error) {
        console.error('Failed to emit WebRTC answer:', error);
      }
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  const handleIncomingAnswer = async (data) => {
    const userId = data.from;
    const peerConnection = peerConnections.current[userId];
    
    if (peerConnection) {
      try {
        await peerConnection.setRemoteDescription(data.answer);
        console.log('Set remote description for:', userId);
      } catch (error) {
        console.error('Error handling answer:', error);
      }
    }
  };

  const handleIncomingIceCandidate = async (data) => {
    const userId = data.from;
    const peerConnection = peerConnections.current[userId];
    
    if (peerConnection) {
      try {
        await peerConnection.addIceCandidate(data.candidate);
        console.log('Added ICE candidate for:', userId);
      } catch (error) {
        console.error('Error handling ICE candidate:', error);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        // Replace video track with screen share
        const videoTrack = screenStream.getVideoTracks()[0];
        const sender = localStreamRef.current.getVideoTracks()[0];
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
        
        setIsScreenSharing(true);
        
        // Stop screen share when user clicks stop
        videoTrack.onended = () => {
          setIsScreenSharing(false);
        };
      } else {
        // Stop screen sharing
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.stop();
        }
        setIsScreenSharing(false);
      }
    } catch (err) {
      console.error('Error sharing screen:', err);
      setError('Unable to share screen. Please try again.');
    }
  };

  const leaveCall = () => {
    cleanup();
    onClose();
  };

  const cleanup = () => {
    // Notify other participants that we're leaving
    try {
      safeSocketService.emit('user-left-video', {
        roomId,
        userId: user?.id
      });
    } catch (error) {
      console.error('Failed to emit user-left-video:', error);
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Close all peer connections
    Object.values(peerConnections.current).forEach(pc => {
      pc.close();
    });
    
    setLocalStream(null);
    setRemoteStreams([]);
  };

  if (!isAuthenticated) {
    return (
      <div className="video-call-overlay" onClick={onClose}>
        <div className="video-call-container" onClick={e => e.stopPropagation()}>
          <div className="error-message">
            Please log in to join the video call.
          </div>
        </div>
      </div>
    );
  }

  if (componentError) {
    return (
      <div className="video-call-overlay" onClick={onClose}>
        <div className="video-call-container" onClick={e => e.stopPropagation()}>
          <div className="video-call-header">
            <h2>🎥 Video Call - Room {roomId}</h2>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
          <div className="error-message">
            {componentError}
          </div>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <button 
              onClick={() => window.location.reload()} 
              className="btn-primary"
              style={{ margin: '10px' }}
            >
              🔄 Refresh Page
            </button>
            <button 
              onClick={onClose} 
              className="btn-secondary"
              style={{ margin: '10px' }}
            >
              ❌ Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="video-call-overlay" onClick={onClose}>
      <div className="video-call-container" onClick={e => e.stopPropagation()}>
        {/* Google Meet-style Header */}
        <div className="meet-header">
          <div className="meet-header-left">
            <div className="meet-info">
              <h2>Video Call</h2>
              <span className="room-info">Room {roomId}</span>
            </div>
          </div>
          <div className="meet-header-right">
            <button className="meet-close-btn" onClick={onClose}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        {error && (
          <div className="meet-error">
            <div className="error-icon">⚠️</div>
            <div className="error-text">{error}</div>
          </div>
        )}

        {componentError && (
          <div className="meet-error">
            <div className="error-icon">❌</div>
            <div className="error-text">{componentError}</div>
          </div>
        )}

        {/* Debug Info */}
        <div style={{ padding: '10px', background: '#3c4043', color: '#e8eaed', fontSize: '12px', margin: '10px', borderRadius: '4px' }}>
          <strong>Video Call Debug:</strong><br/>
          Room ID: {roomId}<br/>
          Connection Status: {connectionStatus}<br/>
          Local Stream: {localStream ? '✅ Active' : '❌ None'}<br/>
          Video Element: {localVideoRef.current ? '✅ Ready' : '❌ Not Ready'}<br/>
          Remote Participants: {remoteStreams.length}<br/>
          Participants: {participants.map(p => p.username || p.email).join(', ')}<br/>
          Remote Streams: {remoteStreams.map(s => `${s.name} (${s.connectionStatus || 'unknown'})`).join(', ')}<br/>
          <button 
            onClick={() => {
              if (localStream && localVideoRef.current) {
                localVideoRef.current.srcObject = localStream;
                localVideoRef.current.play();
                console.log('Manually set video stream');
              }
            }}
            style={{ 
              marginTop: '5px', 
              padding: '5px 10px', 
              background: '#4285f4', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🔄 Retry Video
          </button>
        </div>

        {/* Connection Status */}
        {connectionStatus === 'connecting' && (
          <div className="meet-connecting">
            <div className="connecting-spinner"></div>
            <h3>Connecting to video call...</h3>
            <p>Please wait while we set up your video call</p>
          </div>
        )}

        {connectionStatus === 'error' && (
          <div className="meet-connecting">
            <div className="error-icon">❌</div>
            <h3>Connection Failed</h3>
            <p>Unable to start video call. Please check your camera and microphone permissions.</p>
            <button onClick={initializeVideoCall} className="meet-control-btn meet-secondary">
              🔄 Try Again
            </button>
          </div>
        )}

        {connectionStatus === 'connected' && (
          <div className="meet-content">
            {/* Main Video Grid */}
            <div className="meet-video-grid">
              {/* Local Video - Google Meet style */}
              <div className="meet-participant local-participant">
                <div className="meet-video-container">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="meet-video"
                    onLoadedMetadata={() => console.log('Local video loaded')}
                    onCanPlay={() => console.log('Local video can play')}
                    onError={(e) => console.error('Local video error:', e)}
                  />
                  <div className="meet-video-overlay">
                    <div className="participant-info">
                      <span className="participant-name">You</span>
                      <div className="participant-status">
                        {!isVideoEnabled && <span className="status-icon video-off">📹</span>}
                        {!isAudioEnabled && <span className="status-icon audio-off">🎤</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Remote Videos */}
              {remoteStreams.map((participant, index) => (
                <div key={participant.id} className="meet-participant remote-participant">
                  <div className="meet-video-container">
                    {participant.stream && participant.isVideoEnabled ? (
                      <video
                        ref={el => {
                          remoteVideoRefs.current[index] = el;
                          if (el && participant.stream) {
                            el.srcObject = participant.stream;
                            el.play();
                            console.log('Set remote video stream for:', participant.name);
                          }
                        }}
                        autoPlay
                        playsInline
                        className="meet-video"
                        onLoadedMetadata={() => console.log('Remote video loaded:', participant.name)}
                        onError={(e) => console.error('Remote video error:', participant.name, e)}
                      />
                    ) : (
                      <div className="meet-video-placeholder">
                        <div className="meet-avatar">
                          {participant.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="meet-participant-info">
                          <span className="meet-participant-name">{participant.name}</span>
                          {participant.connectionStatus === 'connecting' && <div className="meet-connecting">Connecting...</div>}
                          {participant.connectionStatus === 'ready' && <div className="meet-ready">Ready</div>}
                        </div>
                      </div>
                    )}
                    <div className="meet-video-overlay">
                      <div className="participant-info">
                        <span className="participant-name">{participant.name}</span>
                        <div className="participant-status">
                          {!participant.isVideoEnabled && <span className="status-icon video-off">📹</span>}
                          {!participant.isAudioEnabled && <span className="status-icon audio-off">🎤</span>}
                          {participant.stream && <span className="status-icon connected">🟢</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Google Meet-style Controls */}
        <div className="meet-controls">
          <div className="meet-controls-left">
            <button
              onClick={() => {
                if (localStream) {
                  const videoTrack = localStream.getVideoTracks()[0];
                  if (videoTrack) {
                    videoTrack.enabled = !isVideoEnabled;
                    setIsVideoEnabled(!isVideoEnabled);
                  }
                }
              }}
              className={`meet-control-btn ${isVideoEnabled ? 'meet-active' : 'meet-inactive'}`}
              title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 7l-7 5 7 5V7z"></path>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
              </svg>
            </button>
            
            <button
              onClick={() => {
                if (localStream) {
                  const audioTrack = localStream.getAudioTracks()[0];
                  if (audioTrack) {
                    audioTrack.enabled = !isAudioEnabled;
                    setIsAudioEnabled(!isAudioEnabled);
                  }
                }
              }}
              className={`meet-control-btn ${isAudioEnabled ? 'meet-active' : 'meet-inactive'}`}
              title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            </button>

            <button
              onClick={() => {
                if (isScreenSharing) {
                  stopScreenShare();
                } else {
                  startScreenShare();
                }
              }}
              className={`meet-control-btn ${isScreenSharing ? 'meet-active' : 'meet-inactive'}`}
              title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
            </button>
          </div>

          <div className="meet-controls-center">
            <button
              onClick={() => {
                if (localVideoRef.current && localStream) {
                  localVideoRef.current.srcObject = localStream;
                  localVideoRef.current.play();
                  console.log('Manually retrying video stream');
                }
              }}
              className="meet-control-btn meet-secondary"
              title="Retry video"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23,4 23,10 17,10"></polyline>
                <polyline points="1,20 1,14 7,14"></polyline>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
              </svg>
            </button>
          </div>

          <div className="meet-controls-right">
            <button onClick={onClose} className="meet-control-btn meet-end-call" title="End call">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoCall;
