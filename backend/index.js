require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://awsproject-frontend.onrender.com",
      "https://awsproject-t64b.onrender.com",
      "https://jellylemonshake-frontend.onrender.com", // Add any other frontend URLs
      "*" // Allow all origins for now to debug
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  transports: ['websocket', 'polling'],
  upgrade: true,
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://awsproject-frontend.onrender.com",
    "https://awsproject-t64b.onrender.com",
    "https://jellylemonshake-frontend.onrender.com", // Add any other frontend URLs
    "*" // Allow all origins for now to debug
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

connectDB();

// Routes
app.use('/api/rooms', require('./routes/chatrooms'));
app.use('/api/jdoodle', require('./routes/jdoodle'));
app.use('/meetings', require('./routes/meetings'));

// Socket.IO real-time chat functionality
const Message = require('./models/Message');

// Store connected users and their rooms
const connectedUsers = new Map();
const roomUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join a room
  socket.on('join-room', async ({ roomId, user }) => {
    try {
      socket.join(roomId);
      
      // Store user info
      connectedUsers.set(socket.id, { user, roomId });
      
      // Update room users
      if (!roomUsers.has(roomId)) {
        roomUsers.set(roomId, new Set());
      }
      roomUsers.get(roomId).add(JSON.stringify(user));
      
      console.log(`${user.username || user.email} joined room ${roomId}`);
      
      // Notify room about new user
      socket.to(roomId).emit('user-joined', {
        user,
        message: `${user.username || user.email} joined the room`
      });
      
      // Send current online users to the new user
      const onlineUsers = Array.from(roomUsers.get(roomId) || []).map(u => JSON.parse(u));
      socket.emit('room-users', onlineUsers);
      
      // Send online users count to room
      io.to(roomId).emit('users-count', onlineUsers.length);
      
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Handle new message
  socket.on('send-message', async (data) => {
    try {
      const { roomId, user, text, code, language, output } = data;
      
      // Find the room by name/pin to get the MongoDB ObjectId
      const ChatRoom = require('./models/ChatRoom');
      const room = await ChatRoom.findOne({ name: roomId });
      
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      
      // Save message to database using room's ObjectId
      const message = await Message.create({
        room: room._id,
        user: user.username || user.email,
        text,
        code,
        language,
        output
      });
      
      // Broadcast message to all users in the room
      io.to(roomId).emit('new-message', {
        _id: message._id,
        room: message.room,
        user: message.user,
        text: message.text,
        code: message.code,
        language: message.language,
        output: message.output,
        createdAt: message.createdAt
      });
      
      console.log(`Message sent in room ${roomId}:`, text || 'Code snippet');
      
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle typing indicator
  socket.on('typing', ({ roomId, user, isTyping }) => {
    socket.to(roomId).emit('user-typing', {
      user: user.username || user.email,
      isTyping
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const userInfo = connectedUsers.get(socket.id);
    
    if (userInfo) {
      const { user, roomId } = userInfo;
      
      // Remove user from room
      if (roomUsers.has(roomId)) {
        roomUsers.get(roomId).delete(JSON.stringify(user));
        
        // If room is empty, delete it
        if (roomUsers.get(roomId).size === 0) {
          roomUsers.delete(roomId);
        } else {
          // Update users count
          const onlineUsers = Array.from(roomUsers.get(roomId) || []).map(u => JSON.parse(u));
          io.to(roomId).emit('users-count', onlineUsers.length);
        }
      }
      
      // Remove from connected users
      connectedUsers.delete(socket.id);
      
      // Notify room about user leaving
      socket.to(roomId).emit('user-left', {
        user,
        message: `${user.username || user.email} left the room`
      });
      
      console.log(`${user.username || user.email} disconnected from room ${roomId}`);
    }
    
    console.log('User disconnected:', socket.id);
  });

  // Handle leave room
  socket.on('leave-room', ({ roomId, user }) => {
    socket.leave(roomId);
    
    // Remove user from room tracking
    if (roomUsers.has(roomId)) {
      roomUsers.get(roomId).delete(JSON.stringify(user));
      
      if (roomUsers.get(roomId).size === 0) {
        roomUsers.delete(roomId);
      } else {
        const onlineUsers = Array.from(roomUsers.get(roomId) || []).map(u => JSON.parse(u));
        io.to(roomId).emit('users-count', onlineUsers.length);
      }
    }
    
    // Remove from connected users
    connectedUsers.delete(socket.id);
    
    // Notify room
    socket.to(roomId).emit('user-left', {
      user,
      message: `${user.username || user.email} left the room`
    });
  });
});

app.get('/', (req, res) => {
  res.send('Backend is running!');
});

// Simple test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint working', timestamp: new Date().toISOString() });
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is healthy',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO server ready for real-time chat`);
});
