import React from "react";
import "../styles/components/UserList.css";
import { useAuth } from "./AuthContext"; // Import auth context to access avatarVersion

function UserList({ users, currentUser }) {
  const { avatarVersion } = useAuth(); // Get avatarVersion for cache busting

  // Sort users: current user first, then alphabetically by username
  const sortedUsers = [...users].sort((a, b) => {
    if (a._id === currentUser._id) return -1;
    if (b._id === currentUser._id) return 1;
    return a.username.localeCompare(b.username);
  });

  // Helper function to get avatar URL with cache busting
  const getAvatarUrl = (avatarSrc) => {
    if (!avatarSrc) return null;
    return `${avatarSrc}${
      avatarSrc.includes("?") ? "&" : "?"
    }v=${avatarVersion}`;
  };

  return (
    <div className="users-sidebar">
      <h2>Online Users</h2>
      <div className="users-count">{users.length} online</div>

      <ul className="users-list">
        {sortedUsers.map((user) => (
          <li
            key={user._id}
            className={`user-item ${
              user._id === currentUser._id ? "current-user" : ""
            }`}
          >
            {/* Conditional rendering for avatar */
            /*sohamghosh-jellylemonshake-23bps1146 */}
            {user.avatar ? (
              <div className="user-avatar-container">
                <img
                  src={getAvatarUrl(user.avatar)}
                  alt={`${user.username}'s avatar`}
                  className="user-avatar-image"
                  onError={(e) => {
                    e.target.style.display = "none";
                    // Replace with first letter avatar on error
                    const parent = e.target.parentNode;
                    const fallback = document.createElement("div");
                    fallback.className = "user-avatar";
                    fallback.innerText = user.username.charAt(0).toUpperCase();
                    parent.appendChild(fallback);
                  }}
                />
              </div>
            ) : (
              <div className="user-avatar">
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="user-name">
              {user.username} {user._id === currentUser._id ? "(You)" : ""}
            </div>
            <div className="user-status"></div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default UserList;
