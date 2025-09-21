import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import '../styles/components/MeetingRoom.css';

function MeetingRoom() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const { authUser } = useAuth();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [participants, setParticipants] = useState([]);
  const [isJoined, setIsJoined] = useState(false);

  useEffect(() => {
    if (meetingId) {
      loadMeeting();
    }
  }, [meetingId]);

  const loadMeeting = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://awsproject-backend.onrender.com';
      console.log('Loading meeting with ID:', meetingId);
      console.log('API URL:', apiUrl);
      
      const response = await fetch(`${apiUrl}/api/meetings/${meetingId}`);
      console.log('Meeting fetch response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Meeting fetch response data:', data);
        
        if (data.success && data.meeting) {
          console.log('Meeting loaded successfully:', data.meeting);
          setMeeting(data.meeting);
          setParticipants(data.meeting.participants || []);
        } else {
          console.error('Meeting data format error:', data);
          setError('Meeting not found or access denied');
        }
      } else {
        console.error('Meeting fetch failed with status:', response.status);
        setError('Meeting not found or access denied');
      }
    } catch (err) {
      setError('Failed to load meeting');
      console.error('Error loading meeting:', err);
    } finally {
      setLoading(false);
    }
  };

  const joinMeeting = () => {
    if (!authUser) {
      setError('Please log in to join the meeting');
      return;
    }

    // For now, we'll simulate joining a video call
    // In a real implementation, this would integrate with WebRTC or a service like Jitsi
    setIsJoined(true);
    
    // Send notification to other participants
    sendMeetingNotification();
  };

  const sendMeetingNotification = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://awsproject-backend.onrender.com';
      
      // Send notification to room participants
      await fetch(`${apiUrl}/api/meetings/${meetingId}/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'meeting_started',
          organizer: authUser?.email || authUser?.username,
          meetingId: meetingId,
          message: `${authUser?.email || authUser?.username} has started a video call`
        })
      });
    } catch (err) {
      console.error('Error sending notification:', err);
    }
  };

  const leaveMeeting = () => {
    setIsJoined(false);
    navigate(-1); // Go back to previous page
  };

  if (loading) {
    return (
      <div className="meeting-room-container">
        <div className="meeting-loading">
          <div className="loading-spinner"></div>
          <p>Loading meeting...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="meeting-room-container">
        <div className="meeting-error">
          <h2>Meeting Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate(-1)} className="back-button">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="meeting-room-container">
        <div className="meeting-error">
          <h2>Meeting Not Found</h2>
          <p>The meeting you're looking for doesn't exist or has been deleted.</p>
          <button onClick={() => navigate(-1)} className="back-button">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="meeting-room-container">
      <div className="meeting-header">
        <div className="meeting-info">
          <h1>{meeting.title}</h1>
          <p>Meeting ID: {meetingId}</p>
          <p>Organized by: {meeting.organizer}</p>
          {meeting.description && <p>{meeting.description}</p>}
        </div>
        <div className="meeting-actions">
          {!isJoined ? (
            <button onClick={joinMeeting} className="join-meeting-btn">
              🎥 Join Video Call
            </button>
          ) : (
            <button onClick={leaveMeeting} className="leave-meeting-btn">
              📞 Leave Meeting
            </button>
          )}
        </div>
      </div>

      {isJoined ? (
        <div className="video-call-container">
          <div className="video-grid">
            <div className="video-participant main-video">
              <div className="video-placeholder">
                <div className="user-avatar">
                  {authUser?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <p>You</p>
              </div>
            </div>
            
            {participants.map((participant, index) => (
              <div key={index} className="video-participant">
                <div className="video-placeholder">
                  <div className="user-avatar">
                    {participant.charAt(0).toUpperCase()}
                  </div>
                  <p>{participant}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="meeting-controls">
            <button className="control-btn mute-btn" title="Mute/Unmute">
              🎤
            </button>
            <button className="control-btn video-btn" title="Turn Video On/Off">
              📹
            </button>
            <button className="control-btn share-btn" title="Share Screen">
              📺
            </button>
            <button className="control-btn chat-btn" title="Open Chat">
              💬
            </button>
            <button onClick={leaveMeeting} className="control-btn leave-btn" title="Leave Meeting">
              📞
            </button>
          </div>
        </div>
      ) : (
        <div className="meeting-preview">
          <div className="meeting-details">
            <h3>Meeting Details</h3>
            <div className="detail-item">
              <strong>Status:</strong> {meeting.status}
            </div>
            <div className="detail-item">
              <strong>Scheduled Time:</strong> {new Date(meeting.scheduledTime).toLocaleString()}
            </div>
            <div className="detail-item">
              <strong>Duration:</strong> {meeting.duration} minutes
            </div>
            <div className="detail-item">
              <strong>Participants:</strong> {participants.length}
            </div>
            {meeting.settings?.requirePassword && (
              <div className="detail-item">
                <strong>Password Protected:</strong> Yes
              </div>
            )}
          </div>

          <div className="participants-list">
            <h3>Participants</h3>
            <ul>
              {participants.map((participant, index) => (
                <li key={index}>{participant}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default MeetingRoom;
