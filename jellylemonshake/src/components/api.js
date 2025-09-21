// api.js
export const API_BASE_URL = process.env.REACT_APP_API_URL || "https://awsfinalproject-backend.onrender.com";

// Helper for handling fetch responses
const handleResponse = async (response) => {
  if (!response.ok) {
    let errorMessage;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || "Request failed";
    } catch {
      errorMessage = "Request failed with status: " + response.status;
    }
    throw new Error(errorMessage);
  }
  return response.json();
};

// Authentication headers
const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
};

// API functions
export const api = {
  // Auth
  login: (credentials) =>
    fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    }).then(handleResponse),

  register: (userData) =>
    fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    }).then(handleResponse),

  // Users
  getCurrentUser: () =>
    fetch(`${API_BASE_URL}/api/users/me`, {
      headers: getAuthHeaders(),
    }).then(handleResponse),

  updateProfile: (formData) =>
    fetch(`${API_BASE_URL}/api/users/profile`, {
      method: "PUT",
      headers: { Authorization: getAuthHeaders().Authorization },
      body: formData,
    }).then(handleResponse),

  // Rooms
  createRoom: (roomData) =>
    fetch(`${API_BASE_URL}/api/rooms`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(roomData),
    }).then(handleResponse),

  getRooms: () =>
    fetch(`${API_BASE_URL}/api/rooms`, {
      headers: getAuthHeaders(),
    }).then(handleResponse),

  joinRoom: (roomId, password) =>
    fetch(`${API_BASE_URL}/api/rooms/${roomId}/join`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ password }),
    }).then(handleResponse),

  leaveRoom: (roomId) =>
    fetch(`${API_BASE_URL}/api/rooms/${roomId}/leave`, {
      method: "POST",
      headers: getAuthHeaders(),
    }).then(handleResponse),
/*sohamghosh-jellylemonshake-23bps1146 */
  // Messages
  getMessages: (roomId, page = 1, limit = 50) =>
    fetch(
      `${API_BASE_URL}/api/rooms/${roomId}/messages?page=${page}&limit=${limit}`,
      {
        headers: getAuthHeaders(),
      }
    ).then(handleResponse),

  sendMessage: (roomId, messageData) => {
    // Handle files with FormData
    if (messageData.file || messageData.image) {
      const formData = new FormData();

      Object.entries(messageData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });
/*sohamghosh-jellylemonshake-23bps1146 */
      return fetch(`${API_BASE_URL}/api/rooms/${roomId}/messages`, {
        method: "POST",
        headers: { Authorization: getAuthHeaders().Authorization },
        body: formData,
      }).then(handleResponse);
    }

    // Regular JSON message
    return fetch(`${API_BASE_URL}/api/rooms/${roomId}/messages`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(messageData),
    }).then(handleResponse);
  },

  searchMessages: (roomId, query) =>
    fetch(
      `${API_BASE_URL}/api/rooms/${roomId}/messages/search?q=${encodeURIComponent(
        query
      )}`,
      {
        headers: getAuthHeaders(),
      }
    ).then(handleResponse),
};
