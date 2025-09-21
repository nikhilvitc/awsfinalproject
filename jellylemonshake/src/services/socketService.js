import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
  }

  connect() {
    if (this.socket && this.socket.connected) {
      console.log('Socket already connected');
      return this.socket;
    }

    if (this.socket) {
      this.socket.disconnect();
    }

    const serverUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    console.log('Connecting to Socket.IO server:', serverUrl);
    
    this.socket = io(serverUrl, {
      transports: ['polling', 'websocket'], // Try polling first, then websocket
      upgrade: true,
      rememberUpgrade: false,
      timeout: 20000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      maxReconnectionAttempts: 5,
      forceNew: true,
      autoConnect: true,
      secure: serverUrl.startsWith('https'), // Use secure connection only for HTTPS
      rejectUnauthorized: false,
      withCredentials: true
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to Socket.IO server');
      this.connected = true;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from Socket.IO server:', reason);
      this.connected = false;
      
      // Don't auto-reconnect on certain disconnect reasons
      if (reason === 'io server disconnect') {
        console.log('Server disconnected, manual reconnection needed');
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔥 Socket.IO connection error:', error.message);
      this.connected = false;
      
      // Log more details about the error
      console.error('Error details:', {
        message: error.message,
        description: error.description,
        context: error.context,
        type: error.type
      });
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconnected to Socket.IO server after', attemptNumber, 'attempts');
      this.connected = true;
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('🔄❌ Reconnection failed:', error.message);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('🔄❌ All reconnection attempts failed');
      this.connected = false;
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  // Join a chat room
  joinRoom(roomId, user) {
    if (this.socket) {
      this.socket.emit('join-room', { roomId, user });
    }
  }

  // Leave a chat room
  leaveRoom(roomId, user) {
    if (this.socket) {
      this.socket.emit('leave-room', { roomId, user });
    }
  }

  // Send a message with retry logic
  sendMessage(messageData) {
    if (this.socket && this.socket.connected) {
      try {
        this.socket.emit('send-message', messageData);
        return true;
      } catch (error) {
        console.error('Failed to send message via socket:', error);
        return false;
      }
    } else {
      console.warn('Socket not connected, cannot send message');
      return false;
    }
  }

  // Send typing indicator
  sendTyping(roomId, user, isTyping) {
    if (this.socket) {
      this.socket.emit('typing', { roomId, user, isTyping });
    }
  }

  // Listen for new messages
  onNewMessage(callback) {
    if (this.socket) {
      this.socket.on('new-message', callback);
    }
  }

  // Listen for user typing
  onUserTyping(callback) {
    if (this.socket) {
      this.socket.on('user-typing', callback);
    }
  }

  // Listen for user joined
  onUserJoined(callback) {
    if (this.socket) {
      this.socket.on('user-joined', callback);
    }
  }

  // Listen for user left
  onUserLeft(callback) {
    if (this.socket) {
      this.socket.on('user-left', callback);
    }
  }

  // Listen for room users
  onRoomUsers(callback) {
    if (this.socket) {
      this.socket.on('room-users', callback);
    }
  }

  // Listen for users count
  onUsersCount(callback) {
    if (this.socket) {
      this.socket.on('users-count', callback);
    }
  }

  // Listen for errors
  onError(callback) {
    if (this.socket) {
      this.socket.on('error', callback);
    }
  }

  // Remove all listeners
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }

  // Check if connected
  isConnected() {
    return this.connected && this.socket && this.socket.connected;
  }
}

// Create singleton instance
const socketService = new SocketService();
export default socketService;
