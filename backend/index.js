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
      "https://jellylemonshake-frontend.onrender.com",
      "https://awsfinalproject-frontend.onrender.com",
      "https://awsfinalproject-backend.onrender.com",
      /^https:\/\/.*\.up\.railway\.app$/, // Railway frontend domains
      /^https:\/\/.*\.railway\.app$/ // Railway domains
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  transports: ['polling', 'websocket'], // Try polling first for better compatibility
  upgrade: true,
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  serveClient: false // Don't serve the client files
});

// Enhanced CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      "http://localhost:3000",
      "https://awsproject-frontend.onrender.com",
      "https://awsproject-t64b.onrender.com",
      "https://jellylemonshake-frontend.onrender.com",
      "https://awsfinalproject-frontend.onrender.com",
      "https://awsfinalproject-backend.onrender.com",
      /^https:\/\/.*\.up\.railway\.app$/, // Railway frontend domains
      /^https:\/\/.*\.railway\.app$/ // Railway domains
    ];
    
    // Check if origin is allowed
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  exposedHeaders: ["Content-Length", "X-Foo", "X-Bar"],
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
}));

// Manual CORS headers as fallback
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    "http://localhost:3000",
    "https://awsproject-frontend.onrender.com",
    "https://awsproject-t64b.onrender.com",
    "https://jellylemonshake-frontend.onrender.com",
    "https://awsfinalproject-frontend.onrender.com",
    "https://awsfinalproject-backend.onrender.com"
  ];
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

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
app.use('/api/meetings', require('./routes/meetings'));
app.use('/api/projects', require('./routes/projects'));

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
      console.log('=== JOIN ROOM REQUEST ===');
      console.log('Room ID:', roomId);
      console.log('User:', user);
      
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
      
      console.log('=== JOIN ROOM SUCCESS ===');
      
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Handle new message
  socket.on('send-message', async (data) => {
    try {
      const { roomId, user, text, code, language, output, isCode } = data;
      console.log('=== SOCKET.IO MESSAGE RECEIVED ===');
      console.log('Room ID:', roomId);
      console.log('User:', user);
      console.log('Text:', text);
      
      // Find the room by name/pin to get the MongoDB ObjectId
      const ChatRoom = require('./models/ChatRoom');
      const room = await ChatRoom.findOne({ name: roomId });
      
      if (!room) {
        console.log('Room not found, creating it...');
        // Create the room if it doesn't exist
        const newRoom = await ChatRoom.create({
          name: roomId,
          createdBy: user.username || user.email || 'Anonymous',
          isPrivate: false,
          color: '#007bff',
          participants: []
        });
        console.log('Room created:', newRoom._id);
        
        // Save message to database using new room's ObjectId
        const message = await Message.create({
          room: newRoom._id,
          user: user.username || user.email,
          text,
          code,
          language,
          output,
          isCode: isCode || false
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
          isCode: message.isCode,
          createdAt: message.createdAt
        });
        
        console.log(`Message sent in newly created room ${roomId}:`, text || 'Code snippet');
        return;
      }
      
      // Save message to database using room's ObjectId
      const message = await Message.create({
        room: room._id,
        user: user.username || user.email,
        text,
        code,
        language,
        output,
        isCode: isCode || false
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
        isCode: message.isCode,
        createdAt: message.createdAt
      });
      
      console.log(`Message sent in room ${roomId}:`, text || 'Code snippet');
      
    } catch (error) {
      console.error('Error sending message:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      socket.emit('error', { message: 'Failed to send message', details: error.message });
    }
  });

  // Handle typing indicator
  socket.on('typing', ({ roomId, user, isTyping }) => {
    socket.to(roomId).emit('user-typing', {
      user: user.username || user.email,
      isTyping
    });
  });

  // Handle message deletion
  socket.on('message-deleted', ({ roomId, messageId, deletedBy }) => {
    console.log(`Message ${messageId} deleted in room ${roomId} by ${deletedBy}`);
    // Broadcast to all other users in the room
    socket.to(roomId).emit('message-deleted', {
      roomId,
      messageId,
      deletedBy
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

  // ===== WEBRTC SIGNALING HANDLERS =====
  
  // Handle user joining video call
  socket.on('user-joined-video', (data) => {
    console.log('📹 User joined video call:', data);
    const { roomId, userId, username } = data;
    
    // Broadcast to all other users in the room
    socket.to(roomId).emit('user-joined-video', {
      roomId,
      userId,
      username,
      email: data.email
    });
    
    console.log(`📹 ${username || userId} joined video call in room ${roomId}`);
  });

  // Handle user leaving video call
  socket.on('user-left-video', (data) => {
    console.log('📹 User left video call:', data);
    const { roomId, userId } = data;
    
    // Broadcast to all other users in the room
    socket.to(roomId).emit('user-left-video', {
      roomId,
      userId
    });
    
    console.log(`📹 User ${userId} left video call in room ${roomId}`);
  });

  // Handle WebRTC offer
  socket.on('webrtc-offer', (data) => {
    console.log('📤 WebRTC offer received:', data);
    const { roomId, to, from, offer } = data;
    
    // Forward offer to specific user
    socket.to(to).emit('webrtc-offer', {
      roomId,
      from,
      offer
    });
    
    console.log(`📤 WebRTC offer forwarded from ${from} to ${to} in room ${roomId}`);
  });

  // Handle WebRTC answer
  socket.on('webrtc-answer', (data) => {
    console.log('📤 WebRTC answer received:', data);
    const { roomId, to, from, answer } = data;
    
    // Forward answer to specific user
    socket.to(to).emit('webrtc-answer', {
      roomId,
      from,
      answer
    });
    
    console.log(`📤 WebRTC answer forwarded from ${from} to ${to} in room ${roomId}`);
  });

  // Handle ICE candidate
  socket.on('webrtc-ice-candidate', (data) => {
    console.log('📤 WebRTC ICE candidate received:', data);
    const { roomId, to, from, candidate } = data;
    
    // Forward ICE candidate to specific user
    socket.to(to).emit('webrtc-ice-candidate', {
      roomId,
      from,
      candidate
    });
    
    console.log(`📤 WebRTC ICE candidate forwarded from ${from} to ${to} in room ${roomId}`);
  });

  // Handle video call started notification
  socket.on('video-call-started', (data) => {
    console.log('📹 Video call started notification:', data);
    const { roomId, startedBy, timestamp } = data;
    
    // Broadcast to all other users in the room
    socket.to(roomId).emit('video-call-started', {
      roomId,
      startedBy,
      timestamp
    });
    
    console.log(`📹 Video call notification sent to room ${roomId} by ${startedBy}`);
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Backend is running',
    timestamp: new Date().toISOString(),
    cors: {
      origin: req.headers.origin,
      allowed: true
    }
  });
});

// Meeting debug endpoint
app.get('/api/meetings/debug/status', (req, res) => {
  res.json({
    success: true,
    message: 'Meeting API is working',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /api/meetings/create',
      'GET /api/meetings/:meetingId',
      'GET /api/meetings/room/:roomId',
      'PATCH /api/meetings/:meetingId/status',
      'DELETE /api/meetings/:meetingId'
    ]
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO server ready for real-time chat`);
});
