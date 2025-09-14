import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import "../styles/components/UserProfile.css";

const UserProfile = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Use effect to update state when user data changes
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setAvatar(user.avatar || null);
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ type: "", text: "" });

    try {
      /*sohamghosh-jellylemonshake-23bps1146 */
      // This will be connected to backend later
      setTimeout(() => {
        const updatedUser = { ...user, name, email, avatar };
        localStorage.setItem("user", JSON.stringify(updatedUser));

        setMessage({ type: "success", text: "Profile updated successfully!" });
        setIsSaving(false);
      }, 1000);
    } catch (error) {
      setMessage({
        type: "error",
        text: "Failed to update profile. Please try again.",
      });
      setIsSaving(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="profile-container">
        <div className="profile-card">
          <h2>Please Log In</h2>
          <p>You need to be logged in to view your profile.</p>
          <Link to="/login" className="profile-button">
            Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-card">
        <h2>Your Profile</h2>

        {message.text && (
          <div className={`profile-message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="profile-picture-section">
          <div className="profile-picture-container">
            {avatar ? (
              <img src={avatar} alt="Profile" className="profile-image" />
            ) : (
              <div className="profile-image-placeholder">
                {name.charAt(0).toUpperCase() ||
                  user.email.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <label
            htmlFor="avatar-upload"
            className="profile-picture-edit-button"
            title="Edit profile picture"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          </label>

          <input
            type="file"
            id="avatar-upload"
            accept="image/*"
            onChange={handleAvatarChange}
            className="profile-picture-input"
          />
        </div>

        <form onSubmit={handleSaveProfile} className="profile-form">
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">
              Email <span className="field-note">(cannot be changed)</span>
            </label>
            <input
              type="email"
              id="email"
              value={email}
              className="email-field-readonly"
              readOnly
              placeholder="Your email"
            />
          </div>

          <div className="profile-actions">
            <button
              type="submit"
              className="profile-button save"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>

            <button
              type="button"
              className="profile-button logout"
              onClick={handleLogout}
            >
              Log Out
            </button>
          </div>
        </form>

        <div className="saved-rooms-section">
          <h3>Your Saved Rooms</h3>
          <div className="saved-rooms-list">
            {/* Will be populated from backend later */}
            <p className="no-rooms-message">
              Your saved rooms will appear here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
