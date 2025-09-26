import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import '../styles/components/VideoCall.css';

function VideoCall({ roomId, onClose, participants = [] }) {
  const { user, isAuthenticated } = useAuth();
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [error, setError] = useState('');
  
  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef([]);
  const peerConnections = useRef({});
  const localStreamRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated) {
      initializeVideoCall();
    }
    
    return () => {
      cleanup();
    };
  }, [isAuthenticated]);

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
      
      // Simulate remote participants (in real implementation, you'd use WebRTC)
      simulateRemoteParticipants();
      
    } catch (err) {
      console.error('Error accessing camera/microphone:', err);
      setError('Unable to access camera/microphone. Please check permissions and try again.');
      setConnectionStatus('error');
    }
  };

  const simulateRemoteParticipants = () => {
    // In a real implementation, this would be handled by WebRTC peer connections
    // For now, we'll simulate remote participants
    const mockParticipants = participants.slice(0, 3); // Limit to 3 for demo
    
    setRemoteStreams(mockParticipants.map((participant, index) => ({
      id: `remote-${index}`,
      name: participant.username || participant.email || `User ${index + 1}`,
      isVideoEnabled: true,
      isAudioEnabled: true
    })));
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
          Stream Tracks: {localStream ? localStream.getVideoTracks().length : 0} video, {localStream ? localStream.getAudioTracks().length : 0} audio
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
                    {participant.isVideoEnabled ? (
                      <video
                        ref={el => remoteVideoRefs.current[index] = el}
                        autoPlay
                        playsInline
                        className="video-element"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div className="video-placeholder">
                        <div className="user-avatar">
                          {participant.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="participant-name">{participant.name}</span>
                      </div>
                    )}
                    <div className="video-overlay">
                      <span className="participant-name">{participant.name}</span>
                      {!participant.isVideoEnabled && <span className="video-off">📹</span>}
                      {!participant.isAudioEnabled && <span className="audio-off">🎤</span>}
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
