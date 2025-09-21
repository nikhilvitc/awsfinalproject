import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import '../styles/components/RoomJoin.css';

function RoomJoin() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [roomId, setRoomId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
  }, [isAuthenticated, navigate]);

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!roomId.trim()) {
      setError('Please enter a room ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://awsproject-backend.onrender.com';
      const response = await fetch(`${apiUrl}/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: user.username || user.email,
          password: password || undefined
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Successfully joined room, navigate to it
        navigate(`/room/${roomId}`);
      } else {
        setError(data.error || 'Failed to join room');
      }
    } catch (err) {
      setError('Error joining room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="room-join-container">
      <div className="room-join-card">
        <div className="room-join-header">
          <h2>Join a Room</h2>
          <p>Enter the room ID to join an existing chat room</p>
        </div>

        <form onSubmit={handleJoinRoom} className="room-join-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="roomId">Room ID</label>
            <input
              type="text"
              id="roomId"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter room ID (e.g., 1234)"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password (if private room)</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter room password (optional)"
            />
          </div>

          <button 
            type="submit" 
            className="join-button"
            disabled={loading}
          >
            {loading ? 'Joining...' : 'Join Room'}
          </button>
        </form>

        <div className="room-join-footer">
          <p>Don't have a room ID?</p>
          <button 
            className="create-room-button"
            onClick={() => navigate('/')}
          >
            Create a New Room
          </button>
        </div>
      </div>
    </div>
  );
}

export default RoomJoin;
