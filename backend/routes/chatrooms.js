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
    console.log('=== GETTING MESSAGES FOR ROOM:', roomId, '===');
    
    // First find the room by name/pin to get the MongoDB ObjectId
    console.log('Step 1: Looking for room with name:', roomId);
    const room = await ChatRoom.findOne({ name: roomId });
    
    if (!room) {
      console.log('Step 2: Room not found, returning empty array');
      return res.status(200).json([]);
    }
    
    console.log('Step 2: Found room with ObjectId:', room._id);
    
    // Then find messages using the room's ObjectId
    console.log('Step 3: Searching for messages with room._id:', room._id);
    const messages = await Message.find({ room: room._id }).sort({ createdAt: 1 });
    console.log('Step 4: Found', messages.length, 'messages');
    
    res.status(200).json(messages);
  } catch (err) {
    console.error('=== ERROR IN GET MESSAGES ===');
    console.error('Error details:', err);
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({ error: 'Failed to fetch messages', details: err.message });
  }
});

// Post a message (text or code)
router.post('/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { user, text, code, language, output } = req.body;
    console.log('=== CREATING MESSAGE FOR ROOM:', roomId, '===');
    console.log('Message data:', { user, text, code, language });
    
    // First find the room by name/pin to get the MongoDB ObjectId
    console.log('Step 1: Looking for room with name:', roomId);
    const room = await ChatRoom.findOne({ name: roomId });
    
    if (!room) {
      console.log('Step 2: Room not found, returning 404');
      return res.status(404).json({ error: 'Room not found' });
    }
    
    console.log('Step 2: Found room with ObjectId:', room._id);
    
    // Create message with room's ObjectId
    console.log('Step 3: Creating message...');
    const messageData = { 
      room: room._id, 
      user, 
      text, 
      code, 
      language, 
      output 
    };
    console.log('Message data for creation:', messageData);
    
    const message = await Message.create(messageData);
    console.log('Step 4: Created message with ID:', message._id);
    
    // Populate the room field in the response
    await message.populate('room');
    console.log('Step 5: Message created successfully');
    res.status(201).json(message);
  } catch (err) {
    console.error('=== ERROR IN CREATE MESSAGE ===');
    console.error('Error details:', err);
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({ error: 'Failed to create message', details: err.message });
  }
});

module.exports = router; 