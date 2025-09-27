import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import '../styles/components/VideoCall.css';

// Import socket service directly
import socketService from '../services/socketService';

// Validate socket service
let socketServiceAvailable = false;
if (socketService && typeof socketService.on === 'function' && typeof socketService.emit === 'function') {
  socketServiceAvailable = true;
  console.log('Socket service loaded successfully');
} else {
  console.error('Socket service methods not available');
  socketServiceAvailable = false;
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
  const [isSettingVideoStream, setIsSettingVideoStream] = useState(false);
  const [connectionTimeout, setConnectionTimeout] = useState(null);
  
  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef([]);
  const peerConnections = useRef({});
  const localStreamRef = useRef(null);

  // Centralized function to set video stream (prevents race conditions)
  const setVideoStreamSafely = useCallback((stream) => {
    if (isSettingVideoStream) {
      return;
    }

    if (!localVideoRef.current) {
      return;
    }

    if (localVideoRef.current.srcObject === stream) {
      return;
    }

    setIsSettingVideoStream(true);

    try {
      // Stop any existing stream
      if (localVideoRef.current.srcObject) {
        localVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      
      localVideoRef.current.srcObject = stream;
      
      // Ensure video plays
      const playPromise = localVideoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setIsSettingVideoStream(false);
        }).catch(err => {
          console.warn('Video play failed:', err);
          setIsSettingVideoStream(false);
        });
      } else {
        setIsSettingVideoStream(false);
      }
    } catch (error) {
      console.error('Error setting video stream:', error);
      setIsSettingVideoStream(false);
    }
  }, [isSettingVideoStream]);

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
        console.log('📥 Offer details - roomId:', data.roomId, 'expected:', roomId, 'from:', data.from, 'user:', user?.id);
        console.log('📥 Offer type:', data.offer?.type, 'SDP length:', data.offer?.sdp?.length);
        console.log('📥 Current remote streams:', remoteStreams.length);
        console.log('📥 Current participants:', participants.length);
        
        const currentUserId = user?.id || user?.username || user?.email;
        const fromUserId = data.from;
        
        if (data.roomId === roomId && fromUserId !== currentUserId) {
          console.log('✅ Processing WebRTC offer from:', fromUserId);
          console.log('✅ Starting handleIncomingOffer...');
          try {
            await handleIncomingOffer(data);
            console.log('✅ handleIncomingOffer completed successfully');
          } catch (error) {
            console.error('❌ handleIncomingOffer failed:', error);
            console.error('❌ Error details:', error.message, error.stack);
          }
        } else {
          console.log('❌ Ignoring offer - roomId:', data.roomId, 'expected:', roomId, 'from:', fromUserId, 'user:', currentUserId);
        }
      });

    // Listen for incoming WebRTC answers
    safeSocketService.on('webrtc-answer', async (data) => {
      console.log('📥 WebRTC answer received:', data);
      console.log('📥 Answer details - roomId:', data.roomId, 'expected:', roomId, 'from:', data.from, 'user:', user?.id);
      console.log('📥 Answer type:', data.answer?.type, 'SDP length:', data.answer?.sdp?.length);
      console.log('📥 Peer connection exists:', !!peerConnections.current[data.from]);
      
      const currentUserId = user?.id || user?.username || user?.email;
      const fromUserId = data.from;
      
      if (data.roomId === roomId && fromUserId !== currentUserId) {
        console.log('✅ Processing WebRTC answer from:', fromUserId);
        console.log('✅ Starting handleIncomingAnswer...');
        try {
          await handleIncomingAnswer(data);
          console.log('✅ handleIncomingAnswer completed successfully');
        } catch (error) {
          console.error('❌ handleIncomingAnswer failed:', error);
          console.error('❌ Error details:', error.message, error.stack);
        }
      } else {
        console.log('❌ Ignoring answer - roomId:', data.roomId, 'expected:', roomId, 'from:', fromUserId, 'user:', currentUserId);
      }
    });

    // Listen for ICE candidates
    safeSocketService.on('webrtc-ice-candidate', async (data) => {
      console.log('📥 ICE candidate received:', data);
      console.log('📥 ICE details - roomId:', data.roomId, 'expected:', roomId, 'from:', data.from, 'user:', user?.id);
      console.log('📥 ICE candidate:', data.candidate?.candidate, 'type:', data.candidate?.type);
      console.log('📥 Peer connection exists:', !!peerConnections.current[data.from]);
      
      const currentUserId = user?.id || user?.username || user?.email;
      const fromUserId = data.from;
      
      if (data.roomId === roomId && fromUserId !== currentUserId) {
        console.log('✅ Processing ICE candidate from:', fromUserId);
        console.log('✅ Starting handleIncomingIceCandidate...');
        try {
          await handleIncomingIceCandidate(data);
          console.log('✅ handleIncomingIceCandidate completed successfully');
        } catch (error) {
          console.error('❌ handleIncomingIceCandidate failed:', error);
          console.error('❌ Error details:', error.message, error.stack);
        }
      } else {
        console.log('❌ Ignoring ICE candidate - roomId:', data.roomId, 'expected:', roomId, 'from:', fromUserId, 'user:', currentUserId);
      }
    });

    // Listen for user join/leave events
    safeSocketService.on('user-joined-video', (data) => {
      console.log('📥 User joined video event received:', data);
      console.log('📥 Event data details:', {
        roomId: data.roomId,
        expectedRoomId: roomId,
        userId: data.userId,
        currentUserId: user?.id,
        username: data.username,
        email: data.email
      });
      
      const currentUserId = user?.id || user?.username || user?.email;
      const participantId = data.userId || data.username || data.email;
      
      if (data.roomId === roomId && participantId !== currentUserId) {
        console.log('✅ Processing user joined video call:', participantId);
        
        // Add participant to remoteStreams immediately
        setRemoteStreams(prev => {
          const existing = prev.find(s => s.id === participantId);
          if (!existing) {
            console.log('➕ Adding new participant from user-joined-video:', participantId);
            const newParticipant = {
              id: participantId,
              name: data.username || data.email || `User ${participantId}`,
              stream: null, // Will be set when WebRTC connection is established
              isVideoEnabled: true,
              isAudioEnabled: true,
              connectionStatus: 'ready' // Ready to connect
            };
            console.log('➕ New participant object:', newParticipant);
            return [...prev, newParticipant];
          }
          console.log('👤 Participant already exists:', participantId);
          return prev;
        });
        
        // Start WebRTC connection with new user using robust strategy
        const currentUserId = user?.id || user?.username || user?.email;
        console.log('🚀 Starting WebRTC connection for new participant:', participantId);
        console.log(`🚀 Current user ID: ${currentUserId}, New participant ID: ${participantId}`);
        
        const shouldInitiate = currentUserId < participantId || 
                              Object.keys(peerConnections.current).length === 0;
        
        if (shouldInitiate) {
          console.log(`🚀 Initiating WebRTC connection for new participant (we should initiate)`);
          startWebRTCConnection(participantId, { userId: data.userId, username: data.username, email: data.email });
        } else {
          console.log(`🚀 Waiting for new participant to initiate connection (they should initiate)`);
          // Set a timeout to initiate connection if the other user doesn't start it
          setTimeout(() => {
            if (!peerConnections.current[participantId]) {
              console.log(`🚀 Timeout reached, initiating connection as fallback for new participant`);
              startWebRTCConnection(participantId, { userId: data.userId, username: data.username, email: data.email });
            }
          }, 2000); // 2 second timeout
        }
      } else {
        console.log('❌ Ignoring user-joined-video - roomId:', data.roomId, 'expected:', roomId, 'participantId:', participantId, 'user:', currentUserId);
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
      console.log('🎥 Setting video stream on mount - stream available:', !!localStream, 'element ready:', !!localVideoRef.current);
      setVideoStreamSafely(localStream);
    }
  }, [localStream, setVideoStreamSafely]);

  // Additional effect to handle video element availability
  useEffect(() => {
    const checkVideoElement = () => {
      if (localStream && localVideoRef.current && !localVideoRef.current.srcObject) {
        console.log('🎥 Video element available, setting stream - stream:', !!localStream, 'element:', !!localVideoRef.current);
        setVideoStreamSafely(localStream);
      }
    };

    // Check immediately
    checkVideoElement();

    // Also check after a short delay
    const timeoutId = setTimeout(checkVideoElement, 200);

    return () => clearTimeout(timeoutId);
  }, [localStream, setVideoStreamSafely]);

  const initializeVideoCall = async () => {
    try {
      setConnectionStatus('connecting');
      setError(''); // Clear any previous errors
      
      // Get user media with optimized settings
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 24, max: 30 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      localStreamRef.current = stream;
      setLocalStream(stream);
      
      // Set video stream immediately
      const setVideoStream = (retryCount = 0) => {
        if (localVideoRef.current) {
          setVideoStreamSafely(stream);
          return;
        }
        
        if (retryCount < 50) { // Max 5 seconds of retries
          setTimeout(() => setVideoStream(retryCount + 1), 100);
        } else {
          console.error('Video element not ready after 5 seconds');
          setError('Video element failed to initialize. Please refresh and try again.');
          setConnectionStatus('error');
        }
      };
      
      // Start immediately
      setVideoStream();
      
      // Set connection status to 'connected' since we have local video
      setConnectionStatus('connected');
      
      // Set up WebRTC connections
      setupWebRTCConnections();
      
      // Set a timeout to detect stuck connections (only for multi-participant calls)
      const timeout = setTimeout(() => {
        if (connectionStatus === 'connecting' && participants.length > 1) {
          console.log('⚠️ Connection appears to be stuck');
          setError('Connection appears to be stuck. Please try refreshing or check your network connection.');
          
          // Try to recover by re-emitting user-joined-video
          try {
            safeSocketService.emit('user-joined-video', {
              roomId,
              userId: user?.id,
              username: user?.username || user?.email
            });
          } catch (error) {
            console.error('Recovery emit failed:', error);
          }
        }
      }, 15000); // 15 second timeout
      
      setConnectionTimeout(timeout);
      
    } catch (err) {
      console.error('Error accessing camera/microphone:', err);
      setError('Unable to access camera/microphone. Please check permissions and try again.');
      setConnectionStatus('error');
    }
  };

  const setupWebRTCConnections = () => {
    // Set up WebRTC peer connections for each participant
    const currentUserId = user?.id || user?.username || user?.email;
    
    const otherParticipants = participants.filter(p => {
      const participantId = p.userId || p.username || p.email || p.id;
      const isNotCurrentUser = participantId !== currentUserId;
      return isNotCurrentUser;
    });
    
    // If no other participants, set connection status to connected (solo call)
    if (otherParticipants.length === 0) {
      console.log('Solo call - no other participants, showing local video only');
      setConnectionStatus('connected');
      return;
    }
    
    // Add participants to remoteStreams immediately
    setRemoteStreams(prev => {
      const newParticipants = otherParticipants.map(participant => ({
        id: participant.userId || participant.username || participant.email,
        name: participant.username || participant.email || `User ${participant.userId || participant.username}`,
        stream: null,
        isVideoEnabled: true,
        isAudioEnabled: true,
        connectionStatus: 'ready'
      }));
      
      // Merge with existing participants, avoiding duplicates
      const existingIds = prev.map(p => p.id);
      const uniqueNewParticipants = newParticipants.filter(p => !existingIds.includes(p.id));
      
      return [...prev, ...uniqueNewParticipants];
    });
    
    // Start connections with a shorter delay
    setTimeout(() => {
      otherParticipants.forEach((participant) => {
        const participantId = participant.userId || participant.username || participant.email;
        
        // Check if connection already exists
        if (peerConnections.current[participantId]) {
          return;
        }
        
        startWebRTCConnection(participantId, participant);
      });
    }, 500);

    // Notify other participants that we joined the video call
    try {
      const emitData = {
        roomId,
        userId: user?.id,
        username: user?.username || user?.email
      };
      safeSocketService.emit('user-joined-video', emitData);
    } catch (error) {
      console.error('Failed to emit user-joined-video:', error);
    }
  };

  const startWebRTCConnection = async (userId, participant = null) => {
    // Update connection status to 'connecting'
    setRemoteStreams(prev => {
      return prev.map(s => s.id === userId ? { ...s, connectionStatus: 'connecting' } : s);
    });

    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      iceTransportPolicy: 'all'
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
      
      setRemoteStreams(prev => {
        const existing = prev.find(s => s.id === userId);
        if (existing) {
          return prev.map(s => s.id === userId ? { ...s, stream: remoteStream, connectionStatus: 'connected' } : s);
        } else {
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

    // Add connection state change monitoring
    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === 'connected') {
        // Connection established
      } else if (peerConnection.connectionState === 'failed') {
        setRemoteStreams(prev => prev.map(s => s.id === userId ? { ...s, connectionStatus: 'failed' } : s));
      } else if (peerConnection.connectionState === 'disconnected') {
        setRemoteStreams(prev => prev.map(s => s.id === userId ? { ...s, connectionStatus: 'disconnected' } : s));
      }
    };

    // Add ICE connection state monitoring
    peerConnection.oniceconnectionstatechange = () => {
      if (peerConnection.iceConnectionState === 'connected' || peerConnection.iceConnectionState === 'completed') {
        setRemoteStreams(prev => prev.map(s => s.id === userId ? { ...s, connectionStatus: 'connected' } : s));
        setConnectionStatus('connected');
      } else if (peerConnection.iceConnectionState === 'failed') {
        // Retry ICE connection
        setTimeout(() => {
          if (peerConnections.current[userId]) {
            peerConnections.current[userId].restartIce();
          }
        }, 2000);
        
        setRemoteStreams(prev => prev.map(s => s.id === userId ? { ...s, connectionStatus: 'ice-retrying' } : s));
      } else if (peerConnection.iceConnectionState === 'checking') {
        setRemoteStreams(prev => prev.map(s => s.id === userId ? { ...s, connectionStatus: 'connecting' } : s));
      }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
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

    // Set up connection timeout with multiple retry strategies
    const connectionTimeout = setTimeout(() => {
      if (peerConnection.connectionState !== 'connected' && peerConnection.connectionState !== 'completed') {
        console.log(`⏰ Connection timeout for ${userId}, current state: ${peerConnection.connectionState}`);
        console.log(`🔄 Attempting multiple retry strategies for ${userId}`);
        
        // Strategy 1: Restart ICE
        console.log(`🔄 Strategy 1: Restarting ICE for ${userId}`);
        try {
          peerConnection.restartIce();
        } catch (error) {
          console.error('❌ ICE restart failed:', error);
        }
        
        // Strategy 2: Close and retry connection
        setTimeout(() => {
          if (peerConnections.current[userId]) {
            console.log(`🔄 Strategy 2: Closing and retrying connection for ${userId}`);
            peerConnections.current[userId].close();
            delete peerConnections.current[userId];
            
            // Retry the connection
            setTimeout(() => {
              console.log(`🔄 Strategy 2: Retrying connection for ${userId}`);
              startWebRTCConnection(userId, participant);
            }, 1000);
          }
        }, 3000);
        
        // Strategy 3: Force re-emit user-joined-video
        setTimeout(() => {
          console.log(`🔄 Strategy 3: Re-emitting user-joined-video for ${userId}`);
          try {
            safeSocketService.emit('user-joined-video', {
              roomId,
              userId: user?.id,
              username: user?.username || user?.email
            });
          } catch (error) {
            console.error('❌ Re-emit failed:', error);
          }
        }, 5000);
        
        setRemoteStreams(prev => prev.map(s => s.id === userId ? { ...s, connectionStatus: 'retrying' } : s));
      }
    }, 15000); // 15 second timeout

    // Clear timeout when connection succeeds
    const originalOnTrack = peerConnection.ontrack;
    peerConnection.ontrack = (event) => {
      clearTimeout(connectionTimeout);
      console.log(`🎉 Received remote stream from: ${userId}`);
      console.log(`🎉 Stream tracks:`, event.streams[0]?.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState })));
      
      // Update remote streams with actual video stream
      setRemoteStreams(prev => prev.map(s => 
        s.id === userId 
          ? { ...s, stream: event.streams[0], connectionStatus: 'connected' }
          : s
      ));
      
      // Update overall connection status if this is the first successful connection
      setConnectionStatus('connected');
      
      if (originalOnTrack) originalOnTrack(event);
    };

    // Create and send offer
    try {
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      // Set local description
      await peerConnection.setLocalDescription(offer);
      
      // Send offer immediately
      try {
        safeSocketService.emit('webrtc-offer', {
          roomId,
          to: userId,
          from: user?.id,
          offer: offer
        });
      } catch (error) {
        console.error('Failed to emit WebRTC offer:', error);
        setRemoteStreams(prev => prev.map(s => s.id === userId ? { ...s, connectionStatus: 'error' } : s));
      }
      
    } catch (error) {
      console.error('Error creating offer:', error);
      setRemoteStreams(prev => prev.map(s => s.id === userId ? { ...s, connectionStatus: 'error' } : s));
    }
  };

  const handleIncomingOffer = async (data) => {
    const userId = data.from;
    let peerConnection = peerConnections.current[userId];
    
    if (!peerConnection) {
      peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' }
        ],
        iceCandidatePoolSize: 10,
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        iceTransportPolicy: 'all'
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

      // Add connection state change monitoring
      peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === 'connected') {
          // Connection established
        } else if (peerConnection.connectionState === 'failed') {
          setRemoteStreams(prev => prev.map(s => s.id === userId ? { ...s, connectionStatus: 'failed' } : s));
        }
      };

      // Add ICE connection state monitoring
      peerConnection.oniceconnectionstatechange = () => {
        if (peerConnection.iceConnectionState === 'connected' || peerConnection.iceConnectionState === 'completed') {
          // ICE connection established
        } else if (peerConnection.iceConnectionState === 'failed') {
          setRemoteStreams(prev => prev.map(s => s.id === userId ? { ...s, connectionStatus: 'ice-failed' } : s));
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
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

  const startScreenShare = async () => {
    try {
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
    } catch (err) {
      console.error('Error sharing screen:', err);
      setError('Unable to share screen. Please try again.');
    }
  };

  const stopScreenShare = () => {
    try {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.stop();
      }
      setIsScreenSharing(false);
    } catch (err) {
      console.error('Error stopping screen share:', err);
    }
  };

  const leaveCall = () => {
    cleanup();
    onClose();
  };

  const cleanup = () => {
    // Clear connection timeout
    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
      setConnectionTimeout(null);
    }
    
    // Notify other participants that we're leaving
    try {
      safeSocketService.emit('user-left-video', {
        roomId,
        userId: user?.id
      });
    } catch (error) {
      console.error('Failed to emit user-left-video:', error);
    }

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
      });
    }
    
    // Close all peer connections
    Object.keys(peerConnections.current).forEach(userId => {
      const pc = peerConnections.current[userId];
      if (pc) {
        pc.close();
      }
    });
    peerConnections.current = {};
    
    // Clear state
    setLocalStream(null);
    setRemoteStreams([]);
    setConnectionStatus('disconnected');
    setIsVideoEnabled(true);
    setIsAudioEnabled(true);
    setIsScreenSharing(false);
    setError('');
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


        {/* Connection Status */}
        {connectionStatus === 'connecting' && (
          <div className="meet-connecting">
            <div className="connecting-spinner"></div>
            <h3>Connecting to video call...</h3>
            <p>Please wait while we set up your video call</p>
            <p className="connection-details">
              {remoteStreams.length > 0 ? 
                `Found ${remoteStreams.length} participant(s). Establishing connections...` : 
                'Setting up your video call...'
              }
            </p>
          </div>
        )}

        {connectionStatus === 'error' && (
          <div className="meet-connecting">
            <div className="error-icon">❌</div>
            <h3>Connection Failed</h3>
            <p>Unable to start video call. Please check your camera and microphone permissions.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
              <button onClick={initializeVideoCall} className="meet-control-btn meet-secondary">
                🔄 Try Again
              </button>
              <button onClick={() => window.location.reload()} className="meet-control-btn meet-secondary">
                🔄 Refresh Page
              </button>
            </div>
          </div>
        )}

        {(connectionStatus === 'connected' || connectionStatus === 'connecting') && (
          <div className="meet-content">
            {/* Main Video Grid */}
            <div className={`meet-video-grid ${remoteStreams.length === 0 ? 'solo-call' : ''}`}>
              {/* Local Video - Google Meet style */}
              <div className={`meet-participant local-participant ${remoteStreams.length === 0 ? 'solo-participant' : ''}`}>
                <div className="meet-video-container">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="meet-video"
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover',
                      backgroundColor: '#000',
                      border: remoteStreams.length === 0 ? 'none' : '2px solid #4285f4'
                    }}
                    onLoadedMetadata={() => {
                      // Video loaded successfully
                    }}
                    onCanPlay={() => {
                      if (localVideoRef.current && !localVideoRef.current.srcObject && localStream) {
                        localVideoRef.current.srcObject = localStream;
                      }
                    }}
                    onError={(e) => {
                      console.error('Local video error:', e);
                    }}
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

              {/* Solo call message */}
              {remoteStreams.length === 0 && connectionStatus === 'connected' && (
                <div className="solo-call-message">
                  <div className="solo-call-content">
                    <h3>You're in the call</h3>
                    <p>Waiting for others to join...</p>
                    <div className="solo-call-info">
                      <span>Share this room with others to start the video call</span>
                    </div>
                  </div>
                </div>
              )}

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
                          }
                        }}
                        autoPlay
                        playsInline
                        className="meet-video"
                        onLoadedMetadata={() => {}}
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
            {/* Center controls can be added here if needed */}
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
