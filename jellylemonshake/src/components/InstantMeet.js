import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import '../styles/components/InstantMeet.css';

function InstantMeet({ roomId, participants, onClose, onMeetingStarted }) {
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Early return if user is not authenticated
  if (!isAuthenticated) {
    return (
      <div className="error-message">
        Please log in to start a meeting.
      </div>
    );
  }

  const startInstantMeeting = async () => {
    setLoading(true);
    setError('');

    try {
      const now = new Date();
      const meetingData = {
        title: `Instant Meeting - ${roomId}`,
        description: 'Quick meeting started from chat room',
        roomId,
        organizer: user.username || user.email,
        participants: participants.map(p => p.username).filter(username => username !== (user.username || user.email)),
        scheduledTime: now.toISOString(),
        duration: 60, // Default 1 hour
        settings: {
          allowScreenShare: true,
          allowChat: true,
          requirePassword: false,
          maxParticipants: 50
        },
        isRecurring: false
      };

      const apiUrl = process.env.REACT_APP_API_URL || 'https://awsproject-backend.onrender.com';
      
      const response = await fetch(`${apiUrl}/meetings/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(meetingData)
      });

      const data = await response.json();

      if (data.success) {
        // Immediately set meeting status to active since it's an instant meeting
        await fetch(`${apiUrl}/meetings/${data.meeting.id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: 'active'
          })
        });

        onMeetingStarted(data.meeting);
        onClose();
        
        // Redirect to meeting
        window.open(`/meet/${data.meeting.meetingId}`, '_blank');
      } else {
        setError(data.error || 'Failed to start instant meeting');
      }
    } catch (err) {
      setError('Failed to start instant meeting. Please try again.');
      console.error('Instant meeting creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="instant-meet-overlay" onClick={onClose}>
      <div className="instant-meet-modal" onClick={(e) => e.stopPropagation()}>
        <div className="instant-meet-header">
          <h2>Start Instant Meeting</h2>
          <button className="close-button" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="instant-meet-content">
          {error && <div className="error-message">{error}</div>}
          
          <div className="meeting-info">
            <h3>Quick Video Call</h3>
            <p>Start an instant video meeting with all room members</p>
            
            <div className="participants-preview">
              <h4>Participants will be invited:</h4>
              <div className="participants-list">
                <div className="participant-item organizer">
                  <div className="participant-avatar">
                    {(user.username || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span>{user.username || user.email || 'User'} (You - Organizer)</span>
                </div>
                {participants
                  .filter(p => p.username !== (user.username || user.email))
                  .map(participant => (
                    <div key={participant.username} className="participant-item">
                      <div className="participant-avatar">
                        {participant.username.charAt(0).toUpperCase()}
                      </div>
                      <span>{participant.username}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="meeting-features">
              <div className="feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="23 7 16 12 23 17 23 7"></polygon>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                </svg>
                <span>Video & Audio</span>
              </div>
              <div className="feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="12" rx="2" ry="2"></rect>
                  <line x1="2" y1="20" x2="22" y2="20"></line>
                  <line x1="12" y1="16" x2="12" y2="20"></line>
                </svg>
                <span>Screen Sharing</span>
              </div>
              <div className="feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span>Live Chat</span>
              </div>
            </div>
          </div>
        </div>

        <div className="instant-meet-actions">
          <button onClick={onClose} className="cancel-button">
            Cancel
          </button>
          <button 
            onClick={startInstantMeeting} 
            disabled={loading} 
            className="start-meeting-button"
          >
            {loading ? (
              <>
                <div className="loading-spinner"></div>
                Starting...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                Start Instant Meeting
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default InstantMeet;
