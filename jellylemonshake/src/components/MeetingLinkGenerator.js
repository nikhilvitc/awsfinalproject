import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import '../styles/components/MeetingLinkGenerator.css';

function MeetingLinkGenerator({ roomId, onClose }) {
  const { user, isAuthenticated } = useAuth();
  const [meetingLink, setMeetingLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const generateMeetingLink = async () => {
    if (!isAuthenticated) {
      setError('Please log in to generate meeting links');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Generate a unique meeting ID
      const meetingId = `meet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create meeting link
      const link = `${window.location.origin}/meet/${meetingId}`;
      setMeetingLink(link);
      setSuccess('Meeting link generated successfully!');
      
      // Copy to clipboard
      await navigator.clipboard.writeText(link);
      setSuccess('Meeting link generated and copied to clipboard!');
      
    } catch (err) {
      setError('Failed to generate meeting link');
      console.error('Error generating meeting link:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(meetingLink);
      setSuccess('Meeting link copied to clipboard!');
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  const shareMeeting = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join my meeting',
        text: 'Join my video meeting',
        url: meetingLink
      });
    } else {
      copyToClipboard();
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="meeting-link-overlay" onClick={onClose}>
        <div className="meeting-link-container" onClick={e => e.stopPropagation()}>
          <div className="error-message">
            Please log in to generate meeting links.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="meeting-link-overlay" onClick={onClose}>
      <div className="meeting-link-container" onClick={e => e.stopPropagation()}>
        <div className="meeting-link-header">
          <h2>🔗 Generate Meeting Link</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="meeting-link-content">
          <div className="meeting-info">
            <h3>📋 Meeting Details</h3>
            <p><strong>Room:</strong> {roomId}</p>
            <p><strong>Organizer:</strong> {user?.username || user?.email}</p>
            <p><strong>Generated:</strong> {new Date().toLocaleString()}</p>
          </div>

          {!meetingLink ? (
            <div className="generate-section">
              <p>Click the button below to generate a meeting link that you can share with others.</p>
              <button 
                onClick={generateMeetingLink}
                className="generate-btn"
                disabled={loading}
              >
                {loading ? '⏳ Generating...' : '🔗 Generate Meeting Link'}
              </button>
            </div>
          ) : (
            <div className="link-section">
              <h3>📤 Your Meeting Link</h3>
              <div className="link-container">
                <input
                  type="text"
                  value={meetingLink}
                  readOnly
                  className="link-input"
                />
                <button onClick={copyToClipboard} className="copy-btn">
                  📋 Copy
                </button>
              </div>
              
              <div className="action-buttons">
                <button onClick={shareMeeting} className="share-btn">
                  📤 Share Meeting
                </button>
                <button 
                  onClick={() => window.open(meetingLink, '_blank')}
                  className="join-btn"
                >
                  🎥 Join Meeting
                </button>
              </div>
            </div>
          )}

          <div className="instructions">
            <h4>📝 How to use:</h4>
            <ol>
              <li>Generate a meeting link</li>
              <li>Share the link with participants</li>
              <li>Click "Join Meeting" to start the video call</li>
              <li>Participants can join using the shared link</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MeetingLinkGenerator;
