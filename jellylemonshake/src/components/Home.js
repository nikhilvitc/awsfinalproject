import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "./AuthContext";
import "../styles/components/Home.css";

function Home() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [roomsExpanded, setRoomsExpanded] = useState(false);
  const myRoomsRef = useRef(null);
  const { user } = useAuth();
  const [view, setView] = useState("select");
  const [showRoomsList, setShowRoomsList] = useState(false);
  const [joinedRooms, setJoinedRooms] = useState([]);
  const [roomPin, setRoomPin] = useState(["", "", "", ""]);
  const [roomPassword, setRoomPassword] = useState("");
  const [savedRooms, setSavedRooms] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [roomIdInput, setRoomIdInput] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [error, setError] = useState("");
  const [dialogVisible, setDialogVisible] = useState(false);

  // Function to show a dialog view with animation
  const showDialogView = (newView) => {
    setDialogVisible(true);
    setView(newView);
  };

  // Function to hide dialog and go back to select view
  const hideDialogView = () => {
    setDialogVisible(false);
    setTimeout(() => {
      setView("select");
    }, 300); // Match the CSS transition duration
  };

  // Function to generate random color
  const generateRandomColor = () => {
    return (
      "#" +
      Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0")
    );
  };

  // Load joined rooms on component mount
  useEffect(() => {
    const userRooms = JSON.parse(localStorage.getItem("joinedRooms") || "[]");
    setJoinedRooms(userRooms);

    // If user has a stored username, use it
    const savedUsername = localStorage.getItem("preferredUsername");
    if (savedUsername) {
      setUsername(savedUsername);
    }
  }, []);
  // Add useEffect for outside click detection
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        myRoomsRef.current &&
        !myRoomsRef.current.contains(event.target) &&
        roomsExpanded
      ) {
        setRoomsExpanded(false);
      }
    }

    // Add event listener
    document.addEventListener("mousedown", handleClickOutside);

    // Clean up
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [roomsExpanded]);
/*sohamghosh-jellylemonshake-23bps1146 */
  // Function to handle room creation
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Username is required");
      return;
    }

    try {
      // Save preferred username
      localStorage.setItem("preferredUsername", username);

      // Generate a random 4-digit PIN
      const pin = Math.floor(1000 + Math.random() * 9000).toString();

      // Generate colors for room and user
      const roomColor = generateRandomColor();
      const userColor = generateRandomColor();

      // Create room data
      const roomData = {
        name: pin,
        createdBy: username,
        isPrivate: isPrivate,
        password: isPrivate ? password : null,
        color: roomColor,
        participants: [{
          username,
          isCreator: true,
          color: userColor,
        }]
      };

      // Create room on backend
      const apiUrl = process.env.REACT_APP_API_URL || 'https://awsfinalproject-backend.onrender.com';
      const response = await fetch(`${apiUrl}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(roomData),
      });

      if (response.ok) {
        const createdRoom = await response.json();
        
        // Also save to localStorage for offline access
        const rooms = JSON.parse(localStorage.getItem("chatRooms") || "{}");
        rooms[pin] = {
          id: pin,
          createdBy: username,
          isPrivate: isPrivate,
          password: isPrivate ? password : null,
          createdAt: new Date().toISOString(),
          color: roomColor,
          participants: [{
            username,
            isCreator: true,
            color: userColor,
          }],
        };
        localStorage.setItem("chatRooms", JSON.stringify(rooms));

        // Initialize empty messages array for this room
        const allMessages = JSON.parse(
          localStorage.getItem("chatMessages") || "{}"
        );
        allMessages[pin] = [];
        localStorage.setItem("chatMessages", JSON.stringify(allMessages));

        // Add room to user's joined rooms
        const userRooms = JSON.parse(localStorage.getItem("joinedRooms") || "[]");
        userRooms.push({
          roomId: pin,
          name: `Room #${pin}`,
          joinedAt: new Date().toISOString(),
          isPrivate: isPrivate,
          isCreator: true,
          lastActivity: new Date().toISOString(),
        });
        localStorage.setItem("joinedRooms", JSON.stringify(userRooms));

        // Store active user info including color
        localStorage.setItem(
          "chatUser",
          JSON.stringify({
            username,
            roomId: pin,
            joinedAt: new Date().toISOString(),
            color: userColor,
          })
        );

        // Navigate to the room
        navigate(`/room/${pin}`);
      } else {
        setError("Failed to create room on server");
      }
    } catch (err) {
      setError("Error creating room");
      console.error(err);
    }
  };

  // Handle PIN input changes
  const handlePinChange = (e) => {
    const index = parseInt(e.target.dataset.index);
    // Only allow digits and limit to single character
    const value = e.target.value.replace(/[^0-9]/g, "").slice(0, 1);

    // Create a copy of the array and update just this position
    const newPin = [...roomPin];
    newPin[index] = value;
    setRoomPin(newPin);

    // Auto-focus to next input if a digit was entered
    if (value && index < 3) {
      const nextInput = document.querySelector(
        `.pin-digit[data-index="${index + 1}"]`
      );
      if (nextInput) {
        nextInput.focus();
      }
    }
  };

  // Handle key presses in PIN inputs
  const handlePinKeyDown = (e) => {
    const index = parseInt(e.target.dataset.index);

    if (e.key === "Backspace") {
      // Create a copy of the array
      const newPin = [...roomPin];

      if (roomPin[index] === "") {
        // If current input is already empty and backspace was pressed,
        // move focus to previous input
        if (index > 0) {
          const prevInput = document.querySelector(
            `.pin-digit[data-index="${index - 1}"]`
          );
          if (prevInput) {
            prevInput.focus();
          }
        }
      } else {
        // Clear the current input
        newPin[index] = "";
        setRoomPin(newPin);
      }
    }
  };

  // Function to handle joining a room
  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Username is required");
      return;
    }
    const pinString = roomPin.join("");
    if (!pinString || pinString.length !== 4) {
      setError("Valid 4-digit room PIN is required");
      return;
    }

    try {
      // Save preferred username
      localStorage.setItem("preferredUsername", username);

      // Check backend first for room
      const apiUrl = process.env.REACT_APP_API_URL || 'https://awsfinalproject-backend.onrender.com';
      let room = null;
      const userColor = generateRandomColor();

      try {
        // Use the new join endpoint with retry mechanism
        console.log('Attempting to join room:', pinString, 'as user:', username);
        
        let joinResponse;
        let retryCount = 0;
        const maxRetries = 2;
        
        while (retryCount <= maxRetries) {
          joinResponse = await fetch(`${apiUrl}/api/rooms/${pinString}/join`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              username: username,
              password: roomPassword || undefined // Add password support if needed
            }),
          });

          if (joinResponse.ok) {
            const joinData = await joinResponse.json();
            room = {
              id: pinString,
              createdBy: joinData.room.createdBy,
              isPrivate: joinData.room.isPrivate || false,
              password: joinData.room.password,
              participants: joinData.room.participants || [],
              color: joinData.room.color
            };
            console.log('Successfully joined room:', pinString);
            break; // Success, exit retry loop
          } else if (joinResponse.status === 404 && retryCount < maxRetries) {
            // Room not found, wait a bit and retry
            console.log(`Room not found, retrying... (attempt ${retryCount + 1}/${maxRetries + 1})`);
            await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
            retryCount++;
            continue;
          } else {
            // Other errors or max retries reached
            const errorData = await joinResponse.json();
            if (joinResponse.status === 404) {
              setError(`Room "${pinString}" not found. The room may not exist or there may be a connection issue. Try creating a new room with this PIN.`);
            } else if (joinResponse.status === 403) {
              setError(errorData.error || 'Access denied. You may need a password for this private room.');
            } else {
              setError(errorData.error || 'Failed to join room. Please try again.');
            }
            return;
          }
        }
      } catch (apiError) {
        console.log('Backend check failed, checking localStorage:', apiError);
      }

      // Check if room exists or was created
      if (!room) {
        // If still no room after trying to create it, check localStorage as final fallback
        const rooms = JSON.parse(localStorage.getItem("chatRooms") || "{}");
        room = rooms[pinString];
        
        if (!room) {
          console.error('Room not found anywhere:', pinString);
          setError(`Room "${pinString}" not found. The room may not exist or there may be a connection issue. Try creating a new room with this PIN.`);
          return;
        } else {
          console.log('Room found in localStorage:', room);
        }
      } else {
        console.log('Room found/created successfully:', room);
      }

      // Check if room is private and verify password
      if (room.isPrivate) {
        if (!roomPassword) {
          setError("This room requires a password");
          return;
        }
        if (room.password !== roomPassword) {
          setError("Incorrect password");
          return;
        }
      }

      // Add user to room participants and update backend
      if (room && !room.participants.some((p) => p.username === username)) {
        const newParticipant = {
          username,
          isCreator: false,
          joinedAt: new Date().toISOString(),
          color: userColor,
        };
        
        // Add to room participants
        room.participants.push(newParticipant);
        
        // Update room on backend if it exists there
        try {
          const updateResponse = await fetch(`${apiUrl}/api/rooms`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: pinString,
              participants: [newParticipant]
            }),
          });
          
          if (updateResponse.ok) {
            console.log('User added to room on backend');
          }
        } catch (updateError) {
          console.log('Failed to update room on backend:', updateError);
        }
        
        // Update localStorage if room was found there
        const rooms = JSON.parse(localStorage.getItem("chatRooms") || "{}");
        if (rooms[pinString]) {
          rooms[pinString] = room;
          localStorage.setItem("chatRooms", JSON.stringify(rooms));
        }
      }

      // Add room to user's joined rooms if not already there
      const userRooms = JSON.parse(localStorage.getItem("joinedRooms") || "[]");
      if (!userRooms.some((r) => r.roomId === pinString)) {
        userRooms.push({
          roomId: pinString,
          name: `Room #${pinString}`,
          joinedAt: new Date().toISOString(),
          isPrivate: room.isPrivate,
          isCreator: room.createdBy === username,
          lastActivity: new Date().toISOString(),
        });
        localStorage.setItem("joinedRooms", JSON.stringify(userRooms));
      }
/*sohamghosh-jellylemonshake-23bps1146 */
      // Store active user info with color
      localStorage.setItem(
        "chatUser",
        JSON.stringify({
          username,
          roomId: pinString,
          joinedAt: new Date().toISOString(),
          color: userColor, // Store user's color
        })
      );

      // Navigate to room
      navigate(`/room/${pinString}`);
    } catch (err) {
      setError("Error joining room");
      console.error(err);
    }
  };

  // Handle entering a joined room
  const enterRoom = (roomId) => {
    // Get user data to preserve color
    const userData = JSON.parse(localStorage.getItem("chatUser") || "{}");

    // Get room data
    const rooms = JSON.parse(localStorage.getItem("chatRooms") || "{}");
    const room = rooms[roomId];

    // Find user's color in this room if it exists
    let userColor = userData.color;

    if (room && room.participants) {
      const participant = room.participants.find(
        (p) => p.username === username
      );
      if (participant && participant.color) {
        userColor = participant.color;
      }
    }

    // If no color found, generate a new one
    if (!userColor) {
      userColor = generateRandomColor();
    }

    // Update active user info
    localStorage.setItem(
      "chatUser",
      JSON.stringify({
        username,
        roomId,
        joinedAt: new Date().toISOString(),
        color: userColor, // Include user's color
      })
    );

    // Update last activity
    const userRooms = JSON.parse(localStorage.getItem("joinedRooms") || "[]");
    const updatedRooms = userRooms.map((room) => {
      if (room.roomId === roomId) {
        return { ...room, lastActivity: new Date().toISOString() };
      }
      return room;
      /*sohamghosh-jellylemonshake-23bps1146 */
    });
    localStorage.setItem("joinedRooms", JSON.stringify(updatedRooms));

    // Navigate to room
    navigate(`/room/${roomId}`);
  };

  // Handle removing a room from joined rooms
  const removeRoom = (roomId, e) => {
    e.stopPropagation(); // Prevent clicking through to the room

    const userRooms = JSON.parse(localStorage.getItem("joinedRooms") || "[]");
    const updatedRooms = userRooms.filter((room) => room.roomId !== roomId);
    localStorage.setItem("joinedRooms", JSON.stringify(updatedRooms));
    setJoinedRooms(updatedRooms);

    // Also remove user from room participants if they're in there
    const rooms = JSON.parse(localStorage.getItem("chatRooms") || "{}");
    if (rooms[roomId]) {
      rooms[roomId].participants = rooms[roomId].participants.filter(
        (p) => p.username !== username
      );
      localStorage.setItem("chatRooms", JSON.stringify(rooms));
    }
  };

  const toggleRoomsExpanded = (e) => {
    e.stopPropagation();
    setRoomsExpanded(!roomsExpanded);
  };

  const renderSelectView = () => (
    <div className={`home-options ${dialogVisible ? "hidden" : ""}`}>
      <h1>Welcome to Chat Rooms</h1>
      {user && !user.isGuest && (
        <div className="user-welcome">
          <p>Welcome back, {user.email || user.user_metadata?.display_name || 'User'}!</p>
        </div>
      )}
      <div className="options-container">
        <button
          className="option-button create"
          onClick={() => showDialogView("create")}
        >
          Create a Room
        </button>
        <button
          className="option-button join"
          onClick={() => showDialogView("join")}
        >
          Join a Room
        </button>
        {joinedRooms.length > 0 && (
          <div
            className="option-button my-rooms"
            ref={myRoomsRef}
            onClick={toggleRoomsExpanded}
          >
            <div className="my-rooms-header">
              <div>
                My Rooms{" "}
                <span className="rooms-count">{joinedRooms.length}</span>
              </div>
              <span className="expand-icon">{roomsExpanded ? "▲" : "▼"}</span>
            </div>

            <div
              className={`rooms-list-container ${
                roomsExpanded ? "expanded" : ""
              }`}
            >
              {joinedRooms
                .sort(
                  (a, b) => new Date(b.lastActivity) - new Date(a.lastActivity)
                )
                .map((room) => {
                  // Get room data including color
                  const rooms = JSON.parse(
                    localStorage.getItem("chatRooms") || "{}"
                  );
                  const roomData = rooms[room.roomId];
                  return (
                    <div
                      key={room.roomId}
                      className="home-room-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        enterRoom(room.roomId);
                      }}
                    >
                      <div className="home-room-info">
                        <div className="home-room-name">
                          Room #{room.roomId}
                          {room.isPrivate && (
                            <span className="private-badge mini">P</span>
                          )}
                        </div>
                        <div className="home-room-details">
                          Last active: {formatLastActivity(room.lastActivity)}
                        </div>
                      </div>
                      <button
                        className="remove-room"
                        onClick={(e) => removeRoom(room.roomId, e)}
                        title="Remove this room"
                        style={roomData?.color ? { color: roomData.color } : {}}
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 10 10"
                          fill="currentColor"
                        >
                          <path
                            d="M1 1L9 9M9 1L1 9"
                            stroke="currentColor"
                            stroke-width="1.5"
                            stroke-linecap="round"
                          />
                        </svg>
                      </button>
                    </div>
                  );
                })}

              <div className="join-new-room">
                <button
                  className="join-new-room-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setView("join");
                  }}
                >
                  Join Another Room
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderCreateRoomView = () => (
    <div>
      <h1>Create a New Room</h1>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleCreateRoom}>
        <div className="input-group">
          <label htmlFor="username">Your Username</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your display name"
            required
          />
        </div>

        <div className="checkbox-group">
          <input
            type="checkbox"
            id="isPrivate"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
          />
          <label htmlFor="isPrivate">Private Room (Password Protected)</label>
        </div>

        {isPrivate && (
          <div className="input-group">
            <label htmlFor="password">Room Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter room password"
              required={isPrivate}
            />
          </div>
        )}

        <div className="button-group">
          <button
            type="button"
            className="back-button"
            onClick={hideDialogView}
          >
            Back
          </button>
          <button type="submit" className="create-button">
            Create Room
          </button>
        </div>
      </form>
    </div>
  );
/*sohamghosh-jellylemonshake-23bps1146 */
  const renderJoinRoomView = () => (
    <div>
      <h1>Join a Room</h1>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleJoinRoom}>
        <div className="input-group">
          <label htmlFor="join-username">Your Username</label>
          <input
            type="text"
            id="join-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your display name"
            required
          />
        </div>

        <div className="input-group">
          <label htmlFor="roomPin">Room PIN</label>
          <div className="pin-container">
            {[0, 1, 2, 3].map((i) => (
              <input
                key={i}
                type="text"
                className="pin-digit"
                maxLength="1"
                pattern="[0-9]"
                inputMode="numeric"
                autoComplete="off"
                onChange={handlePinChange}
                onKeyDown={handlePinKeyDown}
                data-index={i}
                value={roomPin[i] || ""}
              />
            ))}
          </div>
          <input
            type="hidden"
            id="roomPin"
            value={roomPin.join("")}
            className="pin-input-hidden"
          />
        </div>

        <div className="input-group">
          <label htmlFor="roomPassword">Room Password (if required)</label>
          <input
            type="password"
            id="roomPassword"
            value={roomPassword}
            onChange={(e) => setRoomPassword(e.target.value)}
            placeholder="Enter room password if needed"
          />
        </div>

        <div className="button-group">
          <button
            type="button"
            className="back-button"
            onClick={hideDialogView}
          >
            Back
          </button>
          <button type="submit" className="join-button">
            Join Room
          </button>
        </div>
      </form>
    </div>
  );

  const renderMyRoomsView = () => (
    <div className="form-container rooms-container">
      <h1>My Rooms</h1>
      {joinedRooms.length === 0 ? (
        <div className="no-rooms">
          <p>You haven't joined any rooms yet.</p>
          <button
            onClick={() => setView("select")}
            className="back-button mt-20"
          >
            Back
          </button>
        </div>
      ) : (
        <>
          <div className="rooms-list">
            {joinedRooms
              .sort(
                (a, b) => new Date(b.lastActivity) - new Date(a.lastActivity)
              )
              .map((room) => {
                // Get room data including color
                const rooms = JSON.parse(
                  localStorage.getItem("chatRooms") || "{}"
                );
                const roomData = rooms[room.roomId];
                return (
                  <div
                    className="option-button my-rooms"
                    ref={myRoomsRef}
                    onClick={toggleRoomsExpanded}
                  >
                    <div
                      key={room.roomId}
                      className="room-item"
                      onClick={() => enterRoom(room.roomId)}
                      style={
                        roomData?.color
                          ? { borderLeft: `4px solid ${roomData.color}` }
                          : {}
                      }
                    >
                      <div className="room-info">
                        <div className="room-id">
                          {room.name}
                          {room.isPrivate && (
                            <span className="private-badge small">Private</span>
                          )}
                        </div>
                        <div className="room-details">
                          {room.isCreator ? "Created by you" : "Joined"} • Last
                          activity: {formatLastActivity(room.lastActivity)}
                        </div>
                      </div>
                      <button
                        className="remove-room"
                        onClick={(e) => removeRoom(room.roomId, e)}
                        title="Remove this room"
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 10 10"
                          fill="currentColor"
                        >
                          <path
                            d="M1 1L9 9M9 1L1 9"
                            stroke="currentColor"
                            stroke-width="1.5"
                            stroke-linecap="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
          <div className="rooms-actions">
            <button onClick={() => setView("select")} className="back-button">
              Back
            </button>
            <div className="action-buttons">
              <button
                onClick={() => setView("create")}
                className="create-button"
              >
                Create New Room
              </button>
              <button onClick={() => setView("join")} className="join-button">
                Join Another Room
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  // Helper function to format the last activity time
  const formatLastActivity = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hr ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  };

  return (
    <div className="home-page">
      <div className="home-background"></div>
      <div className="home-container">
        {renderSelectView()}

        {/* Dialog overlay with click-outside-to-close functionality */}
        <div
          className={`dialog-overlay ${dialogVisible ? "visible" : ""}`}
          onClick={hideDialogView}
        >
          <div className="form-container" onClick={(e) => e.stopPropagation()}>
            {view === "create" && renderCreateRoomView()}
            {view === "join" && renderJoinRoomView()}
            {view === "myRooms" && renderMyRoomsView()}
          </div>
        </div>
      </div>
      {/* GitHub Profile Logo - Bottom Left */}
      <a
        href="https://github.com/jellylemonshake"
        className="github-profile-link"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="GitHub Profile"
      >
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          width="36"
          height="36"
          aria-hidden="true"
        >
          <path
            d="M12 0.3C5.37 0.3 0 5.67 0 12.3c0 5.29 
               3.438 9.779 8.205 11.387 0.6 0.113 0.82-0.256 
               0.82-0.572 0-0.281-0.011-1.028-0.017-2.019-3.338 
               0.726-4.042-1.611-4.042-1.611-0.545-1.384-1.332-1.753-1.332-1.753-1.089-0.745 
               0.083-0.73 0.083-0.73 1.205 0.084 1.84 1.237 1.84 1.237 1.07 1.834 
               2.809 1.304 3.495 0.997 0.108-0.775 0.418-1.305 0.762-1.606-2.665-0.304-5.467-1.332-5.467-5.932 
               0-1.312 0.469-2.382 1.235-3.221-0.124-0.303-0.535-1.523 0.117-3.176 
               0 0 1.008-0.323 3.301 1.23a11.5 11.5 0 0 1 3.003-0.404c1.019 0.005 2.048 0.138 3.003 0.404
               2.291-1.553 3.297-1.23 3.297-1.23 0.654 1.653 0.243 2.873 0.12 3.176
               0.77 0.839 1.234 1.909 1.234 3.221 0 4.61-2.807 5.625-5.479 5.921
               0.43 0.37 0.823 1.099 0.823 2.217 0 1.6-0.015 2.892-0.015 3.287 0 0.319 0.216 0.689 0.825 0.572
               C20.565 22.075 24 17.586 24 12.3c0-6.63-5.37-12-12-12z"
          />
        </svg>
      </a>
    </div>
  );
}

export default Home;
