import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import '../styles/components/AdminPanel.css';

function AdminPanel({ roomId, onClose, isVisible }) {
  const { user, authUser } = useAuth();
  const [activeTab, setActiveTab] = useState('members');
  const [members, setMembers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Helper function to get user identifier consistently
  const getUserIdentifier = () => {
    return authUser?.email || authUser?.username || user?.email || user?.username || 'Anonymous';
  };

  // Load room members and admin info
  useEffect(() => {
    if (isVisible && roomId) {
      loadRoomInfo();
    }
  }, [isVisible, roomId]);

  const loadRoomInfo = async () => {
    setLoading(true);
    setError('');
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://awsfinalproject-backend.onrender.com';
      const username = getUserIdentifier();
      console.log('Loading room info for:', roomId, 'as user:', username);
      
      const response = await fetch(`${apiUrl}/api/rooms/${roomId}/members?username=${username}`);
      console.log('AdminPanel response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('AdminPanel data received:', data);
        setMembers(data.members || []);
        setAdmins(data.admins || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('AdminPanel error response:', errorData);
        setError(`Failed to load room information: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('AdminPanel error:', err);
      setError(`Error loading room information: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteMessage = async (messageId) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://awsfinalproject-backend.onrender.com';
      const response = await fetch(`${apiUrl}/api/rooms/${roomId}/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: getUserIdentifier() })
      });

      if (response.ok) {
        setSuccess('Message deleted successfully');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Failed to delete message');
      }
    } catch (err) {
      setError('Error deleting message');
    }
  };

  const removeMember = async (username) => {
    if (window.confirm(`Are you sure you want to remove ${username} from this room?`)) {
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'https://awsfinalproject-backend.onrender.com';
        const response = await fetch(`${apiUrl}/api/rooms/${roomId}/members/${username}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username: getUserIdentifier() })
        });

        if (response.ok) {
          setSuccess(`${username} removed from room`);
          loadRoomInfo(); // Refresh the list
          setTimeout(() => setSuccess(''), 3000);
        } else {
          setError('Failed to remove member');
        }
      } catch (err) {
        setError('Error removing member');
      }
    }
  };

  const promoteToAdmin = async (username) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://awsfinalproject-backend.onrender.com';
      const response = await fetch(`${apiUrl}/api/rooms/${roomId}/admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          username: username,
          adminUsername: user.username || user.email 
        })
      });

      if (response.ok) {
        setSuccess(`${username} promoted to admin`);
        loadRoomInfo(); // Refresh the list
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Failed to promote user');
      }
    } catch (err) {
      setError('Error promoting user');
    }
  };

  const demoteAdmin = async (username) => {
    if (window.confirm(`Are you sure you want to demote ${username} from admin?`)) {
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'https://awsfinalproject-backend.onrender.com';
        const response = await fetch(`${apiUrl}/api/rooms/${roomId}/admins/${username}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username: getUserIdentifier() })
        });

        if (response.ok) {
          setSuccess(`${username} demoted from admin`);
          loadRoomInfo(); // Refresh the list
          setTimeout(() => setSuccess(''), 3000);
        } else {
          setError('Failed to demote admin');
        }
      } catch (err) {
        setError('Error demoting admin');
      }
    }
  };

  if (!isVisible) return null;

  return (
    <div className="admin-panel-overlay" onClick={onClose}>
      <div className="admin-panel" onClick={(e) => e.stopPropagation()}>
        <div className="admin-panel-header">
          <h2>Room Administration</h2>
          <button className="close-button" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="admin-tabs">
          <button 
            className={`tab-button ${activeTab === 'members' ? 'active' : ''}`}
            onClick={() => setActiveTab('members')}
          >
            Members ({members.length})
          </button>
          <button 
            className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>

        <div className="admin-content">
          {activeTab === 'members' && (
            <div className="members-section">
              <h3>Room Members</h3>
              {loading ? (
                <div className="loading">Loading members...</div>
              ) : (
                <div className="members-list">
                  {members.map((member, index) => (
                    <div key={index} className="member-item">
                      <div className="member-info">
                        <div className="member-avatar">
                          {member.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="member-details">
                          <span className="member-name">{member.username}</span>
                          <div className="member-badges">
                            {member.isCreator && <span className="badge creator">Creator</span>}
                            {member.isAdmin && <span className="badge admin">Admin</span>}
                          </div>
                        </div>
                      </div>
                      <div className="member-actions">
                        {!member.isCreator && member.username !== (user.username || user.email) && (
                          <>
                            {!member.isAdmin ? (
                              <button 
                                className="action-button promote"
                                onClick={() => promoteToAdmin(member.username)}
                              >
                                Promote to Admin
                              </button>
                            ) : (
                              <button 
                                className="action-button demote"
                                onClick={() => demoteAdmin(member.username)}
                              >
                                Demote Admin
                              </button>
                            )}
                            <button 
                              className="action-button remove"
                              onClick={() => removeMember(member.username)}
                            >
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="settings-section">
              <h3>Room Settings</h3>
              <div className="settings-form">
                <div className="setting-item">
                  <label>
                    <input type="checkbox" defaultChecked />
                    Allow members to invite others
                  </label>
                </div>
                <div className="setting-item">
                  <label>
                    <input type="checkbox" defaultChecked />
                    Allow message deletion
                  </label>
                </div>
                <div className="setting-item">
                  <label>
                    <input type="checkbox" defaultChecked />
                    Allow member removal
                  </label>
                </div>
                <div className="setting-item">
                  <label>
                    <input type="checkbox" />
                    Require admin approval for new members
                  </label>
                </div>
                <button className="save-settings-button">Save Settings</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;
