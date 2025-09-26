import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import '../styles/components/VideoCall.css';

// Safe socket service import with fallback
let socketService = null;
try {
  socketService = require('../services/socketService').default;
} catch (error) {
  console.error('Failed to import socket service:', error);
  // Create a fallback socket service
  socketService = {
    on: () => console.warn('Socket service not available'),
    emit: () => console.warn('Socket service not available'),
    off: () => console.warn('Socket service not available'),
    connect: () => console.warn('Socket service not available'),
    disconnect: () => console.warn('Socket service not available'),
    isConnected: () => false
  };
}

function VideoCall({ roomId, onClose, participants = [] }) {
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
        // Initialize socket service first
        try {
          if (!socketService) {
            throw new Error('Socket service not available');
          }
          
          // Try to connect socket service
          if (typeof socketService.connect === 'function') {
            socketService.connect();
          }
          
          // Check if socket service methods are available
          if (typeof socketService.on !== 'function' || typeof socketService.emit !== 'function') {
            throw new Error('Socket service methods not available');
          }
          
          initializeVideoCall();
          setupSignaling();
        } catch (error) {
          console.error('Socket service initialization failed:', error);
          setError('Video call service is not available. Please refresh the page or try again later.');
          setConnectionStatus('error');
        }
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
      // Check if socket service is available
      if (!socketService || typeof socketService.on !== 'function') {
        console.error('Socket service not available or invalid');
        setError('Socket service not available. Please refresh the page.');
        setConnectionStatus('error');
        return;
      }

      // Listen for incoming WebRTC offers
      socketService.on('webrtc-offer', async (data) => {
        if (data.roomId === roomId && data.from !== user?.id) {
          console.log('Received WebRTC offer from:', data.from);
          await handleIncomingOffer(data);
        }
      });

    // Listen for incoming WebRTC answers
    socketService.on('webrtc-answer', async (data) => {
      if (data.roomId === roomId && data.from !== user?.id) {
        console.log('Received WebRTC answer from:', data.from);
        await handleIncomingAnswer(data);
      }
    });

    // Listen for ICE candidates
    socketService.on('webrtc-ice-candidate', async (data) => {
      if (data.roomId === roomId && data.from !== user?.id) {
        console.log('Received ICE candidate from:', data.from);
        await handleIncomingIceCandidate(data);
      }
    });

    // Listen for user join/leave events
    socketService.on('user-joined-video', (data) => {
      if (data.roomId === roomId && data.userId !== user?.id) {
        console.log('User joined video call:', data.userId);
        // Start WebRTC connection with new user
        startWebRTCConnection(data.userId);
      }
    });

    socketService.on('user-left-video', (data) => {
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
      if (socketService && typeof socketService.off === 'function') {
        socketService.off('webrtc-offer');
        socketService.off('webrtc-answer');
        socketService.off('webrtc-ice-candidate');
        socketService.off('user-joined-video');
        socketService.off('user-left-video');
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
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play();
        console.log('Local video stream set:', stream);
        console.log('Video element:', localVideoRef.current);
      } else {
        console.error('Local video ref is null');
      }
      
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
    // Set up WebRTC peer connections for each participant
    const otherParticipants = participants.filter(p => p.userId !== user?.id);
    
    otherParticipants.forEach((participant, index) => {
      startWebRTCConnection(participant.userId, participant);
    });

    // Notify other participants that we joined the video call
    try {
      socketService.emit('user-joined-video', {
        roomId,
        userId: user?.id,
        username: user?.username || user?.email
      });
    } catch (error) {
      console.error('Failed to emit user-joined-video:', error);
    }
  };

  const startWebRTCConnection = async (userId, participant = null) => {
    const peerConnection = new RTCPeerConnection({
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
          return prev.map(s => s.id === userId ? { ...s, stream: remoteStream } : s);
        } else {
          return [...prev, {
            id: userId,
            name: participant?.username || participant?.email || `User ${userId}`,
            stream: remoteStream,
            isVideoEnabled: true,
            isAudioEnabled: true
          }];
        }
      });
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate to:', userId);
        socketService.emit('webrtc-ice-candidate', {
          roomId,
          to: userId,
          from: user?.id,
          candidate: event.candidate
        });
      }
    };

    peerConnections.current[userId] = peerConnection;

    // Create and send offer
    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      console.log('Sending offer to:', userId);
      try {
        socketService.emit('webrtc-offer', {
          roomId,
          to: userId,
          from: user?.id,
          offer: offer
        });
      } catch (error) {
        console.error('Failed to emit WebRTC offer:', error);
      }
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  };

  const handleIncomingOffer = async (data) => {
    const userId = data.from;
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
            return prev.map(s => s.id === userId ? { ...s, stream: remoteStream } : s);
          } else {
            return [...prev, {
              id: userId,
              name: `User ${userId}`,
              stream: remoteStream,
              isVideoEnabled: true,
              isAudioEnabled: true
            }];
          }
        });
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Sending ICE candidate to:', userId);
          try {
            socketService.emit('webrtc-ice-candidate', {
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
        socketService.emit('webrtc-answer', {
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
      socketService.emit('user-left-video', {
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
        <div className="video-call-header">
          <h2>🎥 Video Call - Room {roomId}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Debug Info */}
        <div className="debug-info" style={{ padding: '10px', background: '#f0f0f0', margin: '10px', borderRadius: '4px', fontSize: '12px' }}>
          <strong>Video Debug:</strong><br/>
          Status: {connectionStatus}<br/>
          Local Stream: {localStream ? '✅ Active' : '❌ None'}<br/>
          Video Element: {localVideoRef.current ? '✅ Ready' : '❌ Not ready'}<br/>
          Stream Tracks: {localStream ? localStream.getVideoTracks().length : 0} video, {localStream ? localStream.getAudioTracks().length : 0} audio<br/>
          Remote Participants: {remoteStreams.length}<br/>
          Remote Streams: {remoteStreams.filter(s => s.stream).length} active
        </div>

        <div className="video-call-content">
          {connectionStatus === 'connecting' && (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Connecting to video call...</p>
            </div>
          )}

          {connectionStatus === 'error' && (
            <div className="error-state">
              <h3>❌ Connection Failed</h3>
              <p>Unable to start video call. Please check your camera and microphone permissions.</p>
              <button onClick={initializeVideoCall} className="retry-btn">
                🔄 Try Again
              </button>
            </div>
          )}

          {connectionStatus === 'connected' && (
            <div className="video-grid">
              {/* Local Video */}
              <div className="video-participant local-video">
                <div className="video-container">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="video-element"
                    onLoadedMetadata={() => console.log('Local video metadata loaded')}
                    onCanPlay={() => console.log('Local video can play')}
                    onError={(e) => console.error('Local video error:', e)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div className="video-overlay">
                    <span className="participant-name">
                      {user?.username || user?.email || 'You'}
                    </span>
                    {isScreenSharing && <span className="screen-share-indicator">📺</span>}
                  </div>
                </div>
              </div>

              {/* Remote Videos */}
              {remoteStreams.map((participant, index) => (
                <div key={participant.id} className="video-participant remote-video">
                  <div className="video-container">
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
                        className="video-element"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onLoadedMetadata={() => console.log('Remote video loaded:', participant.name)}
                        onError={(e) => console.error('Remote video error:', participant.name, e)}
                      />
                    ) : (
                      <div className="video-placeholder">
                        <div className="user-avatar">
                          {participant.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="participant-name">{participant.name}</span>
                        {!participant.stream && <div className="connecting-indicator">Connecting...</div>}
                      </div>
                    )}
                    <div className="video-overlay">
                      <span className="participant-name">{participant.name}</span>
                      {!participant.isVideoEnabled && <span className="video-off">📹</span>}
                      {!participant.isAudioEnabled && <span className="audio-off">🎤</span>}
                      {participant.stream && <span className="connected-indicator">🟢</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Controls */}
          <div className="video-controls">
            <button
              onClick={toggleAudio}
              className={`control-btn ${isAudioEnabled ? 'active' : 'muted'}`}
              title={isAudioEnabled ? 'Mute' : 'Unmute'}
            >
              {isAudioEnabled ? '🎤' : '🔇'}
            </button>
            
            <button
              onClick={toggleVideo}
              className={`control-btn ${isVideoEnabled ? 'active' : 'muted'}`}
              title={isVideoEnabled ? 'Turn off video' : 'Turn on video'}
            >
              {isVideoEnabled ? '📹' : '📷'}
            </button>
            
            <button
              onClick={toggleScreenShare}
              className={`control-btn ${isScreenSharing ? 'active' : ''}`}
              title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
            >
              {isScreenSharing ? '📺' : '🖥️'}
            </button>
            
            <button
              onClick={() => {
                if (localVideoRef.current && localStream) {
                  localVideoRef.current.srcObject = localStream;
                  localVideoRef.current.play();
                  console.log('Manually retrying video stream');
                }
              }}
              className="control-btn"
              title="Retry video"
            >
              🔄
            </button>
            
            <button
              onClick={leaveCall}
              className="control-btn leave-btn"
              title="Leave call"
            >
              📞
            </button>
          </div>

          {/* Call Info */}
          <div className="call-info">
            <div className="participants-count">
              👥 {1 + remoteStreams.length} participant{(1 + remoteStreams.length) !== 1 ? 's' : ''}
            </div>
            <div className="call-status">
              {connectionStatus === 'connected' && '🟢 Connected'}
              {connectionStatus === 'connecting' && '🟡 Connecting...'}
              {connectionStatus === 'error' && '🔴 Connection Failed'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoCall;
