const express = require('express');
const router = express.Router();
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');

// Create or join a chatroom
router.post('/', async (req, res) => {
  const { name, createdBy, isPrivate, password, color, participants } = req.body;
  try {
    let room = await ChatRoom.findOne({ name });
    if (!room) {
      // Create new room
      room = await ChatRoom.create({ 
        name,
        createdBy: createdBy || 'Anonymous',
        isPrivate: isPrivate || false,
        password: isPrivate ? password : null,
        color: color || '#007bff',
        participants: participants || []
      });
    } else {
      // Room exists, add participant if provided
      if (participants && participants.length > 0) {
        const newParticipant = participants[0];
        const existingParticipant = room.participants.find(p => p.username === newParticipant.username);
        
        if (!existingParticipant) {
          room.participants.push(newParticipant);
          await room.save();
        }
      }
    }
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get room by name/pin
router.get('/:roomName', async (req, res) => {
  try {
    const { roomName } = req.params;
    const room = await ChatRoom.findOne({ name: roomName });
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all chatrooms
router.get('/', async (req, res) => {
  const rooms = await ChatRoom.find();
  res.json(rooms);
});

// Get messages for a room
router.get('/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    // First find the room by name/pin to get the MongoDB ObjectId
    const room = await ChatRoom.findOne({ name: roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    // Then find messages using the room's ObjectId
    const messages = await Message.find({ room: room._id }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: err.message });
  }
});

// Post a message (text or code)
router.post('/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { user, text, code, language, output } = req.body;
    
    // First find the room by name/pin to get the MongoDB ObjectId
    const room = await ChatRoom.findOne({ name: roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    // Create message with room's ObjectId
    const message = await Message.create({ 
      room: room._id, 
      user, 
      text, 
      code, 
      language, 
      output 
    });
    
    // Populate the room field in the response
    await message.populate('room');
    res.json(message);
  } catch (err) {
    console.error('Error creating message:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 